import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const AUTH_SECRET_FILENAME = "auth-secret";

/**
 * Ensures a stable auth/JWT secret exists for this deployment and is exposed via the
 * environment so every downstream consumer signs and verifies with the same key.
 *
 * Resolution order:
 *  1. An operator-provided `BETTER_AUTH_SECRET` / `PAPERCLIP_AGENT_JWT_SECRET` env var.
 *  2. A secret persisted to the data volume on a previous boot.
 *  3. A freshly generated random secret, persisted for future boots.
 *
 * The resolved value is written back to BOTH `process.env.BETTER_AUTH_SECRET` and
 * `process.env.PAPERCLIP_AGENT_JWT_SECRET` (without clobbering distinct operator-set
 * values) so that Better Auth sessions and local agent run JWTs always agree.
 *
 * This keeps zero-config deploys (e.g. one-click Railway) working securely, without
 * shipping a hardcoded, publicly-known fallback secret.
 *
 * @param instanceRoot Per-instance data directory (lives on the persistent volume).
 * @returns The resolved secret.
 */
export function ensureAuthSecret(instanceRoot: string): string {
  const explicit =
    process.env.BETTER_AUTH_SECRET?.trim() || process.env.PAPERCLIP_AGENT_JWT_SECRET?.trim();
  if (explicit) {
    // Mirror so both names are populated, but never overwrite a value the operator set.
    if (!process.env.BETTER_AUTH_SECRET?.trim()) {
      process.env.BETTER_AUTH_SECRET = explicit;
    }
    if (!process.env.PAPERCLIP_AGENT_JWT_SECRET?.trim()) {
      process.env.PAPERCLIP_AGENT_JWT_SECRET = explicit;
    }
    return explicit;
  }

  const secretPath = path.join(instanceRoot, AUTH_SECRET_FILENAME);
  let secret = "";
  if (existsSync(secretPath)) {
    try {
      secret = readFileSync(secretPath, "utf8").trim();
    } catch {
      secret = "";
    }
  }

  if (!secret) {
    secret = randomBytes(32).toString("hex");
    mkdirSync(path.dirname(secretPath), { recursive: true });
    writeFileSync(secretPath, `${secret}\n`, { mode: 0o600 });
  }

  process.env.BETTER_AUTH_SECRET = secret;
  process.env.PAPERCLIP_AGENT_JWT_SECRET = secret;
  return secret;
}
