import { describe, it, expect } from "vitest";

/**
 * Tests for webhook URL validation logic (WebhookSettingsModal.tsx:71).
 *
 * The current validation is a simple prefix check: url.startsWith("https://")
 * This covers the basic requirement but leaves open several edge cases.
 * These tests document both passing and edge-case behavior.
 */

function isValidWebhookUrl(url: string): boolean {
  // Current production validation (WebhookSettingsModal.tsx:71)
  return url.startsWith("https://");
}

function isStrictWebhookUrl(url: string): boolean {
  // Stricter validation: must be a parseable HTTPS URL with a real hostname
  if (!url.startsWith("https://")) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.length > 0 &&
      parsed.hostname !== "localhost" &&
      !parsed.hostname.startsWith("127.") &&
      !parsed.hostname.startsWith("0.") &&
      !parsed.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

describe("Webhook URL validation — current implementation", () => {
  it("accepts valid HTTPS URLs", () => {
    expect(isValidWebhookUrl("https://example.com/webhook")).toBe(true);
    expect(isValidWebhookUrl("https://api.myapp.com/hooks/crm")).toBe(true);
  });

  it("rejects HTTP URLs", () => {
    expect(isValidWebhookUrl("http://example.com/webhook")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidWebhookUrl("")).toBe(false);
  });

  it("rejects non-URL strings", () => {
    expect(isValidWebhookUrl("not-a-url")).toBe(false);
  });
});

describe("Webhook URL validation — strict implementation (FIX-13 target)", () => {
  it("accepts valid public HTTPS URLs", () => {
    expect(isStrictWebhookUrl("https://hooks.zapier.com/hooks/catch/123")).toBe(true);
    expect(isStrictWebhookUrl("https://api.example.com/webhook")).toBe(true);
  });

  it("rejects HTTP", () => {
    expect(isStrictWebhookUrl("http://example.com/webhook")).toBe(false);
  });

  it("rejects localhost (internal endpoint — not reachable from Meta/WhatsApp servers)", () => {
    expect(isStrictWebhookUrl("https://localhost:3000/webhook")).toBe(false);
  });

  it("rejects loopback IP addresses", () => {
    expect(isStrictWebhookUrl("https://127.0.0.1/webhook")).toBe(false);
  });

  it("rejects .local mDNS domains", () => {
    expect(isStrictWebhookUrl("https://devmachine.local/webhook")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isStrictWebhookUrl("")).toBe(false);
  });

  it("rejects malformed URL", () => {
    expect(isStrictWebhookUrl("https://")).toBe(false);
  });
});
