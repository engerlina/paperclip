import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH_SECRET_FILENAME, ensureAuthSecret } from "../ensure-auth-secret.js";

describe("ensureAuthSecret", () => {
  const betterAuthEnv = "BETTER_AUTH_SECRET";
  const agentJwtEnv = "PAPERCLIP_AGENT_JWT_SECRET";
  const original = {
    betterAuth: process.env[betterAuthEnv],
    agentJwt: process.env[agentJwtEnv],
  };
  let dir = "";

  beforeEach(() => {
    delete process.env[betterAuthEnv];
    delete process.env[agentJwtEnv];
    dir = mkdtempSync(path.join(tmpdir(), "pcp-auth-secret-"));
  });

  afterEach(() => {
    if (original.betterAuth === undefined) delete process.env[betterAuthEnv];
    else process.env[betterAuthEnv] = original.betterAuth;
    if (original.agentJwt === undefined) delete process.env[agentJwtEnv];
    else process.env[agentJwtEnv] = original.agentJwt;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("uses an operator-provided env secret without writing a file", () => {
    process.env[betterAuthEnv] = "operator-secret";

    const secret = ensureAuthSecret(dir);

    expect(secret).toBe("operator-secret");
    expect(process.env[agentJwtEnv]).toBe("operator-secret"); // mirrored
    expect(existsSync(path.join(dir, AUTH_SECRET_FILENAME))).toBe(false);
  });

  it("does not clobber distinct operator-set values", () => {
    process.env[betterAuthEnv] = "ba-secret";
    process.env[agentJwtEnv] = "jwt-secret";

    ensureAuthSecret(dir);

    expect(process.env[betterAuthEnv]).toBe("ba-secret");
    expect(process.env[agentJwtEnv]).toBe("jwt-secret");
  });

  it("generates and persists a secret when none is provided", () => {
    const secret = ensureAuthSecret(dir);

    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(process.env[betterAuthEnv]).toBe(secret);
    expect(process.env[agentJwtEnv]).toBe(secret);

    const persisted = readFileSync(path.join(dir, AUTH_SECRET_FILENAME), "utf8").trim();
    expect(persisted).toBe(secret);
  });

  it("reuses a previously persisted secret across boots", () => {
    writeFileSync(path.join(dir, AUTH_SECRET_FILENAME), "persisted-secret\n");

    const secret = ensureAuthSecret(dir);

    expect(secret).toBe("persisted-secret");
    expect(process.env[betterAuthEnv]).toBe("persisted-secret");
    expect(process.env[agentJwtEnv]).toBe("persisted-secret");
  });
});
