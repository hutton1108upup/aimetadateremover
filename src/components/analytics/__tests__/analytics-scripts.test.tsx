import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsScripts } from "../analytics-scripts";

describe("analytics scripts", () => {
  it("loads analytics without rendering a prompt or banner", () => {
    render(<AnalyticsScripts />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /analytics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept analytics|reject optional analytics/i })).not.toBeInTheDocument();
  });
});
