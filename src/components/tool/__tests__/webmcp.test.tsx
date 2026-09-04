import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnifiedImageWorkspace } from "../unified-image-workspace";

describe("workspace WebMCP surface", () => {
  it("registers only a step selector and a non-sensitive status reader", async () => {
    const registerTool = vi.fn();
    Object.defineProperty(document, "modelContext", { configurable: true, value: { registerTool } });
    render(<UnifiedImageWorkspace />);
    await waitFor(() => expect(registerTool).toHaveBeenCalledTimes(2));
    expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual(["select_metadata_step", "read_local_workspace_status"]);
    expect(registerTool.mock.calls[1][0].annotations.readOnlyHint).toBe(true);
  });
});
