import { deliverFeedback, submitFeedback, type FeedbackEnvironment } from "../src/lib/feedback/server";

const calls: { key: string | null; mail: Record<string, unknown> }[] = [];
export default {
  async fetch(request: Request, env: FeedbackEnvironment) {
    const url = new URL(request.url);
    if (url.pathname === "/submit") return submitFeedback(request, env);
    if (url.pathname === "/unconfigured") return submitFeedback(request, { ...env, AUTH_DB: undefined as unknown as D1Database });
    if (url.pathname === "/calls") return Response.json(calls);
    if (url.pathname === "/deliver") {
      const send: typeof fetch = async (_input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ key: headers.get("Idempotency-Key"), mail: JSON.parse(String(init?.body)) });
        return url.searchParams.has("fail") ? Response.json({ error: "test failure" }, { status: 503 }) : Response.json({ id: `mail-${headers.get("Idempotency-Key")}` });
      };
      return Response.json(await deliverFeedback(url.searchParams.has("unconfigured") ? { ...env, RESEND_API_KEY: undefined } : env, 1, send));
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<FeedbackEnvironment>;
