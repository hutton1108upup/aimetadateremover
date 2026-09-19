import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackForm } from "../feedback-form";
afterEach(() => vi.unstubAllGlobals());
describe("optional feedback form", () => {
  it("rejects an empty form without sending, but accepts occupation alone", async () => {
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => ({ ok: true, json: async () => ({ received: true, id: JSON.parse(String(init.body)).id }) }));
    vi.stubGlobal("fetch", fetcher);
    render(<FeedbackForm trigger="manual" path="/workspace" />);
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(screen.getByRole("alert")).toHaveTextContent("at least one");
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("More about you & other suggestions"));
    fireEvent.change(screen.getByLabelText("Occupation or main role"), { target: { value: "designer" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByText("Thank you. Your feedback is received.");
    const payload = JSON.parse(String(fetcher.mock.calls[0][1].body));
    expect(payload).toMatchObject({ occupation: "designer", need: "", email: "", contactConsent: false });
  });
  it("retains text after failure and retries the identical reference", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("network down")).mockImplementationOnce(async (_url, init) => ({ ok: true, json: async () => ({ received: true, id: JSON.parse(init.body).id }) }));
    vi.stubGlobal("fetch", fetcher);
    render(<FeedbackForm trigger="time" path="/" />);
    const field = screen.getByLabelText(/What are you hoping/);
    fireEvent.change(field, { target: { value: "A specific real task" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByRole("alert");
    expect(field).toHaveValue("A specific real task");
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByRole("status");
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  });
  it("asks context-specific questions and never sends while typing", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<FeedbackForm trigger="download" path="/workspace" />);
    fireEvent.click(screen.getByLabelText("Partly"));
    expect(screen.getByLabelText(/what is still unresolved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Fully"));
    expect(screen.getByLabelText(/planning to use these images/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/planning to use these images/i), { target: { value: "An ecommerce listing" } });
    await waitFor(() => expect(fetcher).not.toHaveBeenCalled());
  });
  it("does not force the visitor to supply email, but checks it if entered", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<FeedbackForm trigger="manual" path="/" />);
    fireEvent.change(screen.getByLabelText("Email for a possible follow-up"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid email");
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
