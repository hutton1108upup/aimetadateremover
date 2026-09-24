import { describe, expect, it, vi } from "vitest";
import { classifyStorageFailure, feedbackFailure } from "../diagnostics";
import { feedbackMailConfigured } from "../server";
describe("feedback diagnostic boundaries", () => {
  it("recognizes nested D1 schema errors without exposing raw SQL or answers", async () => {
    const error = new Error("D1 failure", { cause: new Error("no such table: feedback_submission; private answer secret-token") });
    const code = classifyStorageFailure(error);
    expect(code).toBe("FEEDBACK_SCHEMA_MISSING");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = feedbackFailure(code, new Request("https://aimetadateremover.pro/api/feedback"));
      const body = await response.json() as { reference: string };
      expect(response.status).toBe(503);
      expect(body.reference).toMatch(/^[0-9a-f-]{36}$/);
      expect(log.mock.calls[0][0]).toContain('"environment":"production"');
      expect(JSON.stringify(log.mock.calls) + JSON.stringify(body)).not.toMatch(/private answer|secret-token|no such table/);
    } finally { log.mockRestore(); }
  });
  it("treats temporary failures separately from missing schema", () => {
    expect(classifyStorageFailure(new Error("D1 overloaded"))).toBe("FEEDBACK_STORAGE_UNAVAILABLE");
  });
  it("refuses malformed sender addresses and absent credentials", () => {
    const env = { AUTH_DB: {} as D1Database, RESEND_API_KEY: "test-only", FEEDBACK_FROM: "feedback@example.com" };
    expect(feedbackMailConfigured(env)).toBe(true);
    expect(feedbackMailConfigured({ ...env, FEEDBACK_FROM: "bad\r\nBcc: private" })).toBe(false);
    expect(feedbackMailConfigured({ ...env, RESEND_API_KEY: " " })).toBe(false);
  });
});
