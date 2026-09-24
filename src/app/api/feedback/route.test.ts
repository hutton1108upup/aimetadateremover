import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), submit: vi.fn(), deliver: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.context }));
vi.mock("@/lib/feedback/server", () => ({ submitFeedback: mocks.submit, deliverFeedback: mocks.deliver }));
import { POST } from "./route";
describe("feedback response durability", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.deliver.mockResolvedValue({ configured: false }); });
  it("preserves a saved response if background scheduling fails", async () => {
    mocks.context.mockResolvedValue({ env: {}, ctx: { waitUntil: () => { throw new Error("Context closed"); } } });
    mocks.submit.mockResolvedValue(Response.json({ received: true, id: "saved-reference" }, { status: 201 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await POST(new Request("http://localhost/api/feedback", { method: "POST" }));
      expect(result.status).toBe(201);
      expect(await result.json()).toMatchObject({ received: true });
    } finally { log.mockRestore(); }
  });
  it("does not schedule email after a failed database save", async () => {
    const waitUntil = vi.fn();
    mocks.context.mockResolvedValue({ env: {}, ctx: { waitUntil } });
    mocks.submit.mockResolvedValue(Response.json({ error: "Unavailable" }, { status: 503 }));
    expect((await POST(new Request("http://localhost/api/feedback", { method: "POST" }))).status).toBe(503);
    expect(waitUntil).not.toHaveBeenCalled(); expect(mocks.deliver).not.toHaveBeenCalled();
  });
});
