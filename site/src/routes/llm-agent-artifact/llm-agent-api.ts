import { EventType, type AGUIEvent, type RunAgentInput } from "@ag-ui/core";

export type LlmAgentSession = { readonly id: string; readonly preview: string; readonly updatedAt: number };
export type LlmAgentMessage = { readonly id: string; readonly role: "user" | "assistant"; readonly text: string };

export async function listLlmAgentSessions(): Promise<ReadonlyArray<LlmAgentSession>> {
  const response = await fetch("/api/llm-agent/sessions");
  if (!response.ok) return [];
  return ((await response.json()) as { threads?: ReadonlyArray<LlmAgentSession> }).threads ?? [];
}

export async function readLlmAgentSession(sessionId: string): Promise<ReadonlyArray<LlmAgentMessage>> {
  const response = await fetch(`/api/llm-agent/sessions/${encodeURIComponent(sessionId)}`);
  if (!response.ok) throw new Error("채팅 기록을 불러오지 못했습니다.");
  return ((await response.json()) as { messages?: ReadonlyArray<LlmAgentMessage> }).messages ?? [];
}

export async function streamLlmAgentTurn(options: {
  readonly prompt: string;
  readonly sessionId: string | null;
  readonly onSession: (sessionId: string) => void;
  readonly write: (delta: string) => void;
  readonly onEvent?: (event: AGUIEvent) => void;
  readonly signal?: AbortSignal;
}) {
  const response = await fetch("/api/llm-agent/turn", {
    method: "POST",
    headers: { "Accept": "text/event-stream", "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId: options.sessionId ?? "",
      runId: crypto.randomUUID(),
      messages: [{ id: crypto.randomUUID(), role: "user", content: options.prompt }],
      tools: [],
      context: [],
      forwardedProps: {},
    } satisfies RunAgentInput),
    signal: options.signal,
  });
  if (!response.ok || !response.body) throw new Error(await response.text());
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += value ?? "";
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) applyAgUiEvent(parseSseEvent(frame), options);
    if (done) {
      if (buffer.trim()) applyAgUiEvent(parseSseEvent(buffer), options);
      return;
    }
  }
}

function parseSseEvent(frame: string): AGUIEvent {
  const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
  if (!data) throw new Error("AG-UI event에 data가 없습니다.");
  return JSON.parse(data) as AGUIEvent;
}

function applyAgUiEvent(event: AGUIEvent, options: {
  readonly onSession: (sessionId: string) => void;
  readonly write: (delta: string) => void;
  readonly onEvent?: (event: AGUIEvent) => void;
}) {
  options.onEvent?.(event);
  if (event.type === EventType.RUN_STARTED) options.onSession(event.threadId);
  else if (event.type === EventType.TEXT_MESSAGE_CONTENT) options.write(event.delta);
  else if (event.type === EventType.RUN_ERROR) throw new Error(event.message);
}
