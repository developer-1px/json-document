import { createJSONDocument } from "@interactive-os/json-document";
import { createWebStoredDocument } from "@interactive-os/json-document-web";

export type AgentChatMessage = { prompt: string; reply: string; state: "running" | "complete" | "error" | "interrupted"; error?: string };
export type AgentChatSession = { sessionId: string | null; toolSignature?: string; messages: AgentChatMessage[] };
function parse(value: unknown): AgentChatSession {
  if (!value || typeof value !== "object") throw Error("Invalid chat session");
  const session = value as AgentChatSession;
  if ((session.sessionId !== null && typeof session.sessionId !== "string") || !Array.isArray(session.messages) || session.messages.some(message => !message || typeof message.prompt !== "string" || typeof message.reply !== "string" || (message.error !== undefined && typeof message.error !== "string") || !["running", "complete", "error", "interrupted"].includes(message.state))) throw Error("Invalid chat session");
  return { sessionId: session.sessionId, ...(typeof session.toolSignature === "string" ? {toolSignature: session.toolSignature} : {}), messages: session.messages.map(message => ({ ...message, state: message.state === "running" ? "interrupted" : message.state })) };
}
export function createAgentChatSession(key: string, storage: () => Pick<Storage, "getItem" | "setItem"> = () => window.localStorage) {
  const source = (initial: AgentChatSession) => {
    const document = createJSONDocument(initial);
    return {
      get snapshot() { return { value: document.value }; },
      subscribe: (listener: () => void) => document.subscribe(listener),
      update: (change: (session: AgentChatSession) => AgentChatSession) => document.commit([{ op: "replace", path: "", value: change(document.value as AgentChatSession) }]),
    };
  };
  return createWebStoredDocument({ key: `json-document.chat.${key}.v1`, storage,
    create: () => source({ sessionId: null, messages: [] }), restore: value => source(parse(value)) });
}

/** Codex dynamic tools are registered at thread creation. Preserve transcript while replacing stale tool sessions. */
export function prepareAgentChatTurn(session: AgentChatSession, tools: ReadonlyArray<{name: string; description: string; parameters: Record<string, unknown>}>, prompt: string) {
  const toolSignature = JSON.stringify(tools.map(({name, description, parameters}) => ({name, description, parameters})).sort((a, b) => a.name.localeCompare(b.name)));
  const sessionId = session.toolSignature === toolSignature ? session.sessionId : null;
  const history = sessionId === null ? session.messages.slice(-8).map(({prompt, reply}) => ({user: prompt, assistant: reply})) : [];
  return {sessionId, toolSignature, prompt: history.length ? `이전 대화는 맥락 참고용입니다. 과거 도구 가용성 설명은 현재 도구 목록보다 우선하지 않습니다. 현재 요청을 처리하세요.\n${JSON.stringify(history)}\n\n현재 요청: ${prompt}` : prompt};
}

/** Keep a useful short diagnosis without persisting credentials or server dumps. */
export function agentChatErrorReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (!message.trim() || /^[\s]*[\[{<]/.test(message)) return "에이전트 연결 또는 도구 등록을 확인해 주세요.";
  return message.split(/\r?\n/)[0]!.replace(/Bearer\s+[^\s,;]+/gi, "Bearer [가림]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]+|(?:api[_-]?key|access[_-]?token|password|authorization)\s*[:=]\s*[^\s,;]+)/gi, "[인증값 가림]")
    .replace(/https?:\/\/[^\s]+/g, "[서버 주소]").slice(0, 300);
}
