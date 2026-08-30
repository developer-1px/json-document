import { delay, http, HttpResponse } from "msw";
import { EventType, RunAgentInputSchema } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";

type MockSession = { readonly id: string; readonly preview: string; readonly updatedAt: number };
const sessions: MockSession[] = [];

export const llmAgentHandlers = [
  http.get("/api/llm-agent/sessions", () => HttpResponse.json({ threads: sessions })),
  http.post("/api/llm-agent/turn", async ({ request }) => {
    const input = RunAgentInputSchema.parse(await request.json());
    const userMessage = [...input.messages].reverse().find((message) => message.role === "user");
    const prompt = typeof userMessage?.content === "string" ? userMessage.content : "";
    const sessionId = input.threadId || crypto.randomUUID();
    const existing = sessions.findIndex((session) => session.id === sessionId);
    const session = { id: sessionId, preview: existing >= 0 ? sessions[existing]!.preview : prompt, updatedAt: Date.now() };
    if (existing >= 0) sessions.splice(existing, 1);
    sessions.unshift(session);
    await delay(250);
    const messageId = crypto.randomUUID();
    const encoder = new EventEncoder();
    const body = [
      { type: EventType.RUN_STARTED, threadId: sessionId, runId: input.runId },
      { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: `Mock 응답: ${prompt}` },
      { type: EventType.TEXT_MESSAGE_END, messageId },
      { type: EventType.RUN_FINISHED, threadId: sessionId, runId: input.runId },
    ].map((event) => encoder.encodeSSE(event)).join("");
    return new HttpResponse(body, { headers: { "Content-Type": "text/event-stream" } });
  }),
];
