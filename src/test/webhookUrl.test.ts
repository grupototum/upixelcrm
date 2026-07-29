import { describe, it, expect } from "vitest";
import { isStrictWebhookUrl } from "@/lib/webhookUrl";

/**
 * Tests for webhook URL validation (src/lib/webhookUrl.ts).
 * Used by WebhookSettingsModal and mirrored in
 * supabase/functions/_shared/webhook-url.ts (automation-engine).
 */

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

  it("rejects private/metadata IP ranges", () => {
    expect(isStrictWebhookUrl("https://10.0.0.5/webhook")).toBe(false);
    expect(isStrictWebhookUrl("https://192.168.1.10/webhook")).toBe(false);
    expect(isStrictWebhookUrl("https://172.16.0.1/webhook")).toBe(false);
    expect(isStrictWebhookUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isStrictWebhookUrl("")).toBe(false);
  });

  it("rejects malformed URL", () => {
    expect(isStrictWebhookUrl("https://")).toBe(false);
  });
});
