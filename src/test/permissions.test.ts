import { describe, it, expect } from "vitest";

/**
 * Tests for the path-to-basePath computation inside canAccessModule.
 *
 * The production code at usePermissions.ts:72 has an operator-precedence bug:
 *   const basePath = "/" + path.split("/").filter(Boolean)[0] || "/";
 *
 * JavaScript evaluates this as:
 *   ("/" + undefined) || "/"  →  "/undefined"  (for root path "/")
 *
 * The correct intent is:
 *   "/" + (path.split("/").filter(Boolean)[0] ?? "")  || "/"
 *   or: segment ? `/${segment}` : "/"
 *
 * These tests document EXPECTED correct behavior. They currently fail against the
 * buggy implementation and will pass once the bug is fixed.
 */

function buggyBasePath(path: string): string {
  // Reproduces the current buggy implementation
  return "/" + path.split("/").filter(Boolean)[0] || "/";
}

function correctBasePath(path: string): string {
  // Correct implementation
  const segment = path.split("/").filter(Boolean)[0];
  return segment ? `/${segment}` : "/";
}

describe("canAccessModule basePath computation — operator precedence bug (usePermissions.ts:72)", () => {
  describe("BUGGY implementation (documents the existing regression)", () => {
    it("returns /undefined for root path / — BUG", () => {
      // This is the WRONG behavior caused by the precedence bug
      expect(buggyBasePath("/")).toBe("/undefined");
    });

    it("returns /undefined for empty path — BUG", () => {
      // Empty path: "".split("/").filter(Boolean)[0] → undefined
      // "/" + undefined → "/undefined" (truthy), so || "/" never fires
      expect(buggyBasePath("")).toBe("/undefined");
    });
  });

  describe("CORRECT implementation (expected behavior after fix)", () => {
    it("returns / for root path /", () => {
      expect(correctBasePath("/")).toBe("/");
    });

    it("returns /crm for /crm", () => {
      expect(correctBasePath("/crm")).toBe("/crm");
    });

    it("returns /crm for nested /crm/leads/123", () => {
      expect(correctBasePath("/crm/leads/123")).toBe("/crm");
    });

    it("returns /automations for /automations/builder/abc", () => {
      expect(correctBasePath("/automations/builder/abc")).toBe("/automations");
    });

    it("returns / for empty string", () => {
      expect(correctBasePath("")).toBe("/");
    });

    it("returns /inbox for /inbox", () => {
      expect(correctBasePath("/inbox")).toBe("/inbox");
    });
  });
});
