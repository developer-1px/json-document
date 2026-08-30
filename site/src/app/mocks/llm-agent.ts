import { delay, http, HttpResponse } from "msw";

type MockSession = { readonly id: string; readonly preview: string; readonly updatedAt: number };
const sessions: MockSession[] = [];

export const llmAgentHandlers = [
  http.get("/api/llm-agent/sessions", () => HttpResponse.json({ threads: sessions })),
  http.post("/api/llm-agent/turn", async ({ request }) => {
    const body = await request.json() as { prompt?: string; sessionId?: string | null };
    const prompt = String(body.prompt ?? "");
    const sessionId = body.sessionId ?? crypto.randomUUID();
    const existing = sessions.findIndex((session) => session.id === sessionId);
    const session = { id: sessionId, preview: existing >= 0 ? sessions[existing]!.preview : prompt, updatedAt: Date.now() };
    if (existing >= 0) sessions.splice(existing, 1);
    sessions.unshift(session);
    await delay(250);
    return new HttpResponse(`Mock 응답: ${prompt}`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Codex-Thread-Id": sessionId } });
  }),
];
