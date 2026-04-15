import { Router } from "express";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authUsers, authSessions, companyMemberships } from "@paperclipai/db";

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

export function ssoRoutes(db: Db) {
  const router = Router();

  router.get("/api/auth/sso", async (req, res) => {
    const token = req.query.token as string | undefined;
    const redirect = (req.query.redirect as string) || "/";

    if (!token) {
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
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    try {
      // User IDs are prefixed with "disro:" to namespace them from native Paperclip users
      const ssoUserId = `disro:${payload.sub}`;
      const now = new Date();

      // Find or create user
      const existingUser = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.id, ssoUserId))
        .then(rows => rows[0]);

      if (!existingUser) {
        await db.insert(authUsers).values({
          id: ssoUserId,
          email: payload.email,
          name: payload.name || payload.email.split("@")[0] || "User",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Update user info in case it changed
        await db.update(authUsers)
          .set({
            email: payload.email,
            name: payload.name || existingUser.name,
            updatedAt: now,
          })
          .where(eq(authUsers.id, ssoUserId));
      }

      // Ensure company membership exists
      const existingMembership = await db
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
        await db.insert(companyMemberships).values({
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
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(authSessions).values({
        id: sessionId,
        userId: ssoUserId,
        token: sessionToken,
        expiresAt,
        createdAt: now,
        updatedAt: now,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      // Set session cookie (BetterAuth format)
      res.cookie("better-auth.session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      });

      // Redirect to UI
      res.redirect(302, redirect);

    } catch (err) {
      console.error("[sso] Error:", err);
      res.status(500).json({ error: "SSO failed" });
    }
  });

  return router;
}
