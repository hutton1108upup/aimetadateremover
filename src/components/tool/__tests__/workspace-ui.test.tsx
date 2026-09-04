import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnifiedImageWorkspace } from "../unified-image-workspace";

const encoder = new TextEncoder();

describe("UnifiedImageWorkspace", () => {
  it("provides keyboard selection and the truthful local privacy boundary", () => {
    render(<UnifiedImageWorkspace variant="embedded" defaultMode="clean" />);
    expect(screen.getByRole("button", { name: /choose images/i })).toBeVisible();
    expect(screen.getByText(/files stay in this browser session/i)).toBeVisible();
    expect(screen.queryByText(/ai risk score/i)).not.toBeInTheDocument();
  });

  it("rejects bytes that are not an image without blocking another selection", async () => {
    render(<UnifiedImageWorkspace variant="embedded" defaultMode="inspect" />);
    const input = screen.getByLabelText(/choose jpg, png, or webp images/i);
    fireEvent.change(input, { target: { files: [new File([encoder.encode("plain text")], "fake.png", { type: "image/png" })] } });
    expect((await screen.findAllByText(/not a supported jpeg, png, or webp/i)).some((node) => node.classList.contains("error-banner"))).toBe(true);
    await waitFor(() => expect(screen.getByRole("button", { name: /add images/i })).toBeEnabled());
    expect(screen.getByRole("button", { name: /show original/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /show cleaned/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeVisible();
  });

  it("opens the native picker when the focused dropzone receives Enter", () => {
    render(<UnifiedImageWorkspace />);
    const input = screen.getByLabelText(/choose jpg, png, or webp images/i);
    const click = vi.spyOn(input as HTMLInputElement, "click");
    fireEvent.keyDown(screen.getByRole("button", { name: /open file picker/i }), { key: "Enter" });
    expect(click).toHaveBeenCalledOnce();
  });

  it("loads the bundled safe sample through the real local scanner", async () => {
    render(<UnifiedImageWorkspace variant="embedded" defaultMode="inspect" />);

    fireEvent.click(screen.getByRole("button", { name: /try a safe sample/i }));

    expect(await screen.findByText("AI generation parameters")).toBeVisible();
    expect(screen.getByText("1 metadata finding")).toBeVisible();
    expect(screen.getByText("Scan complete")).toBeVisible();
  });
});
