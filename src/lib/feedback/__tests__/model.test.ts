import { describe, expect, it } from "vitest";
import { emptyAnswers, parseSubmission, SURVEY_VERSION } from "../model";
const base = { ...emptyAnswers, id: "58a68d9f-13b8-4253-99dd-7d3acbd8bb50", version: SURVEY_VERSION, trigger: "manual", path: "/workspace" };
describe("feedback input boundary", () => {
  it.each([{ occupation: "designer" }, { age: "25–34" }, { need: "I need to publish a batch" }, { suggestion: "A folder picker" }, { email: "hello@example.com" }, { outcome: "unsure" }])("accepts a single optional answer: %j", answer => {
    expect(parseSubmission({ ...base, ...answer })).toMatchObject(answer);
  });
  it.each([{}, { need: "   " }, { contactConsent: true }, { outcome: "constructor" }, { occupation: "__proto__" }, { email: "a@example.com\r\nBcc: other@example.com" }, { need: "a".repeat(2001) }, { age: "unknown" }, { need: "ok", filename: "private.png" }, { need: "ok", website: "bot" }])("rejects invalid or private extra data: %j", answer => {
    expect(() => parseSubmission({ ...base, ...answer })).toThrow();
  });
  it("strips query strings and unknown paths from transmitted context", () => {
    expect(parseSubmission({ ...base, need: "hello", path: "/workspace?email=private" }).path).toBe("other");
    expect(parseSubmission({ ...base, need: "hello", path: "/guides/private-page" }).path).toBe("/guides");
  });
});
