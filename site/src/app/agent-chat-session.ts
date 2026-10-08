import { createJSONDocument } from "@interactive-os/json-document";
import { createWebStoredDocument } from "@interactive-os/json-document-web";

export type AgentChatMessage = { prompt: string; reply: string; state: "running" | "complete" | "error" | "interrupted" };
export type AgentChatSession = { sessionId: string | null; messages: AgentChatMessage[] };
function parse(value: unknown): AgentChatSession {
  if (!value || typeof value !== "object") throw Error("Invalid chat session");
  const session = value as AgentChatSession;
  if ((session.sessionId !== null && typeof session.sessionId !== "string") || !Array.isArray(session.messages) || session.messages.some(message => !message || typeof message.prompt !== "string" || typeof message.reply !== "string" || !["running", "complete", "error", "interrupted"].includes(message.state))) throw Error("Invalid chat session");
  return { sessionId: session.sessionId, messages: session.messages.map(message => ({ ...message, state: message.state === "running" ? "interrupted" : message.state })) };
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
