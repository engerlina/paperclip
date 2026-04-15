import { Router } from "express";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authUsers, authSessions, companyMemberships, companies } from "@paperclipai/db";

const SSO_TOKEN_MAX_AGE_MS = 60_000; // 60 seconds

interface SsoPayload {
  sub: string;           // Disro user ID
  email: string;
  name: string;
  companyId: string;     // Paperclip company ID (UUID)
  iat: number;           // Issued at (ms)
  exp: number;           // Expires at (ms)
}

function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

function parseAndVerifyToken(token: string, secret: string): SsoPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  if (!verifyHmacSignature(payloadB64, signature, secret)) return null;

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as SsoPayload;

    const now = Date.now();
    if (payload.exp < now) return null;
    if (payload.iat > now + 5000) return null; // Clock skew tolerance
    if (now - payload.iat > SSO_TOKEN_MAX_AGE_MS) return null;

    return payload;
  } catch {
    return null;
  }
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function generateId(): string {
  return randomBytes(16).toString("hex");
}

function isValidRedirect(url: string): boolean {
  // Only allow relative paths starting with / but not //
  return url.startsWith("/") && !url.startsWith("//");
}

export function ssoRoutes(db: Db) {
  const router = Router();

  router.get("/api/auth/sso", async (req, res) => {
    console.log("[sso] SSO endpoint hit");
    const token = req.query.token as string | undefined;
    const redirectParam = req.query.redirect as string | undefined;
    const redirect = redirectParam && isValidRedirect(redirectParam) ? redirectParam : "/";

    if (!token) {
      console.log("[sso] Missing token");
      res.status(400).json({ error: "Missing token" });
      return;
    }

    const secret = process.env.DISRO_SSO_SECRET;
    if (!secret) {
      console.error("[sso] DISRO_SSO_SECRET not configured");
      res.status(500).json({ error: "SSO not configured" });
      return;
    }

    const payload = parseAndVerifyToken(token, secret);
    if (!payload) {
      console.log("[sso] Invalid or expired token");
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    console.log("[sso] Token verified, payload:", { sub: payload.sub, email: payload.email, companyId: payload.companyId });

    try {
      // Validate company exists before proceeding
      const company = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, payload.companyId))
        .then(rows => rows[0]);

      if (!company) {
        res.status(400).json({ error: "Invalid company" });
        return;
      }

      // User IDs are prefixed with "disro:" to namespace them from native Paperclip users
      const ssoUserId = `disro:${payload.sub}`;
      const now = new Date();

      // Wrap user creation, membership, and session in a transaction
      const sessionToken = await db.transaction(async (tx) => {
        // Find or create user
        const existingUser = await tx
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, ssoUserId))
          .then(rows => rows[0]);

        if (!existingUser) {
          await tx.insert(authUsers).values({
            id: ssoUserId,
            email: payload.email,
            name: payload.name || payload.email.split("@")[0] || "User",
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update user info in case it changed
          await tx.update(authUsers)
            .set({
              email: payload.email,
              name: payload.name || existingUser.name,
              updatedAt: now,
            })
            .where(eq(authUsers.id, ssoUserId));
        }

        // Ensure company membership exists
        const existingMembership = await tx
          .select()
          .from(companyMemberships)
          .where(
            and(
              eq(companyMemberships.companyId, payload.companyId),
              eq(companyMemberships.principalType, "user"),
              eq(companyMemberships.principalId, ssoUserId),
            )
          )
          .then(rows => rows[0]);

        if (!existingMembership) {
          await tx.insert(companyMemberships).values({
            companyId: payload.companyId,
            principalType: "user",
            principalId: ssoUserId,
            status: "active",
            createdAt: now,
            updatedAt: now,
          });
        }

        // Create session (BetterAuth format)
        const sessionId = generateId();
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await tx.insert(authSessions).values({
          id: sessionId,
          userId: ssoUserId,
          token,
          expiresAt,
          createdAt: now,
          updatedAt: now,
          ipAddress: req.ip || null,
          userAgent: req.headers["user-agent"] || null,
        });

        return { token, expiresAt };
      });

      // Set session cookie (BetterAuth format)
      console.log("[sso] Setting cookie, token length:", sessionToken.token.length, "expires:", sessionToken.expiresAt);
      console.log("[sso] NODE_ENV:", process.env.NODE_ENV, "secure:", process.env.NODE_ENV === "production");
      res.cookie("better-auth.session_token", sessionToken.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: sessionToken.expiresAt,
        path: "/",
      });

      // Redirect to UI
      console.log("[sso] Redirecting to:", redirect);
      res.redirect(302, redirect);

    } catch (err) {
      console.error("[sso] Error:", err);
      res.status(500).json({ error: "SSO failed" });
    }
  });

  return router;
}
