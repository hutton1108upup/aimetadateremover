import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsScripts } from "../analytics-scripts";
import * as transport from "@/lib/analytics";
import { trackFunnel } from "@/lib/funnel";
vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));

type TestWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  document.querySelectorAll("script[data-analytics]").forEach(script => script.remove());
  delete (window as TestWindow).dataLayer;
  delete (window as TestWindow).gtag;
  window.history.replaceState(null, "", "/");
});

describe("analytics scripts", () => {
  it("loads analytics without rendering a prompt or banner", () => {
    render(<AnalyticsScripts />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /analytics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept analytics|reject optional analytics/i })).not.toBeInTheDocument();
    expect(document.querySelector('script[data-analytics="ga4"]')).toBeNull();
    expect(document.querySelector('script[data-analytics="clarity"]')).toBeNull();
  });

  it("connects the production queue once in Strict Mode and tracks article-to-tool clicks", () => {
    vi.spyOn(transport, "analyticsAllowed").mockReturnValue(true);
    window.history.replaceState(null, "", "/blog/stable-diffusion-comfyui-metadata");
    render(<StrictMode><AnalyticsScripts /><a data-article-tool href="/comfyui-workflow-remover" onClick={event => event.preventDefault()}>Clean example</a></StrictMode>);
    trackFunnel("verify_success", { source: "file", result: "verified", filename: "PRIVATE.png" });
    fireEvent.click(screen.getByRole("link", { name: "Clean example" }), { ctrlKey: true });
    const commands = (window as TestWindow).dataLayer!.map(command => Array.from(command as ArrayLike<unknown>));
    expect(commands.filter(command => command[0] === "config")).toHaveLength(1);
    for (const name of ["metadata_article_view", "metadata_verify_success", "metadata_tool_link_click"]) {
      expect(commands.filter(command => command[1] === name)).toHaveLength(1);
    }
    expect(JSON.stringify(commands)).not.toContain("PRIVATE.png");
    expect(document.querySelectorAll('script[data-analytics="ga4"]')).toHaveLength(1);
  });
});
