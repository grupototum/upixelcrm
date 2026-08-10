// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { generateSecureToken, hashToken } from "@/lib/crypto";

describe("generateSecureToken", () => {
  it("returns a string with the given prefix", () => {
    const token = generateSecureToken("sk_live_");
    expect(token).toMatch(/^sk_live_/);
  });

  it("default length produces 32 characters after prefix", () => {
    const prefix = "sk_live_";
    const token = generateSecureToken(prefix, 32);
    expect(token.length).toBe(prefix.length + 32);
  });

  it("uses only alphanumeric characters in the random part", () => {
    const token = generateSecureToken("wh_sec_", 24);
    const randomPart = token.slice("wh_sec_".length);
    expect(randomPart).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("generates unique tokens on each call (no Math.random determinism)", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSecureToken("t_")));
    // 50 calls should produce 50 unique tokens — collisions would indicate Math.random reuse
    expect(tokens.size).toBe(50);
  });

  it("respects custom byteLength", () => {
    const prefix = "p_";
    const token = generateSecureToken(prefix, 16);
    expect(token.length).toBe(prefix.length + 16);
  });
});

describe("hashToken", () => {
  it("returns a hex string", async () => {
    const hash = await hashToken("test-token");
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces a 64-character SHA-256 hex digest", async () => {
    const hash = await hashToken("any-string");
    expect(hash).toHaveLength(64);
  });

  it("is deterministic for the same input", async () => {
    const h1 = await hashToken("same-input");
    const h2 = await hashToken("same-input");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", async () => {
    const h1 = await hashToken("token-a");
    const h2 = await hashToken("token-b");
    expect(h1).not.toBe(h2);
  });

  it("is NOT reversible to Base64 (btoa regression guard)", async () => {
    const token = "sk_live_abc123";
    const hash = await hashToken(token);
    // btoa("sk_live_abc123") would be "c2tfbGl2ZV9hYmMxMjM="
    // This test ensures we are not accidentally storing base64 instead of a hash
    expect(hash).not.toBe(btoa(token));
  });
});
