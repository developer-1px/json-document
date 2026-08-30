export type LlmAgentSession = { readonly id: string; readonly preview: string; readonly updatedAt: number };

export async function listLlmAgentSessions(): Promise<ReadonlyArray<LlmAgentSession>> {
  const response = await fetch("/api/llm-agent/sessions");
  if (!response.ok) return [];
  return ((await response.json()) as { threads?: ReadonlyArray<LlmAgentSession> }).threads ?? [];
}

export async function streamLlmAgentTurn(options: {
  readonly prompt: string;
  readonly sessionId: string | null;
  readonly onSession: (sessionId: string) => void;
  readonly write: (delta: string) => void;
}) {
  const response = await fetch("/api/llm-agent/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: options.prompt, sessionId: options.sessionId }),
  });
  if (!response.ok || !response.body) throw new Error(await response.text());
  const activeSessionId = response.headers.get("X-Codex-Thread-Id");
  if (activeSessionId) options.onSession(activeSessionId);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    options.write(value);
  }
}
