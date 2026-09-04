import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicHeader } from "../public-header";

const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

describe("PublicHeader", () => {
  it("keeps the PNG remover in primary navigation and marks the current route", () => {
    route.pathname = "/metadata-checker";
    render(<PublicHeader />);

    const navigation = screen.getByRole("navigation", { name: /primary navigation/i });
    expect(within(navigation).getByRole("link", { name: "PNG Remover" })).toHaveAttribute("href", "/remove-metadata-from-png");
    expect(within(navigation).getByRole("link", { name: "Metadata Checker" })).toHaveAttribute("aria-current", "page");
    expect(within(navigation).queryByRole("link", { name: "Detection limits" })).not.toBeInTheDocument();
  });

  it("does not show a self-referential workspace call to action", () => {
    route.pathname = "/workspace";
    render(<PublicHeader />);

    expect(screen.getByRole("link", { name: /back to cleaner/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: /open workspace/i })).not.toBeInTheDocument();
  });
});
