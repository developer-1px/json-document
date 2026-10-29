import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import { createWebStoredDocument } from "@interactive-os/json-document-web";

export type AgentChatMessage = { prompt: string; reply: string; state: "running" | "complete" | "error" | "interrupted" };
export type AgentChatSession = { sessionId: string | null; messages: AgentChatMessage[] };
export type AgentChatDirectory = { activeId: string; ids: string[] };

function createAgentSessionState<T extends JSONValue>(initial: T) {
  const document = createJSONDocument(initial);
  return {
    get snapshot() { return { value: document.value }; },
    subscribe: (listener: () => void) => document.subscribe(listener),
    update: (change: (state: T) => T) => document.commit([{ op: "replace", path: "", value: change(document.value as T) }]),
  };
}

/** App session navigation; each directory entry owns a separate conversation. */
export function createAgentChatDirectory(key: string, firstId: string, storage: () => Pick<Storage, "getItem" | "setItem"> = () => window.localStorage) {
  return createWebStoredDocument({ key: `json-document.chat-directory.${key}.v1`, storage,
    create: () => createAgentSessionState<AgentChatDirectory>({ activeId: firstId, ids: [firstId] }),
    restore: value => {
      if (!value || typeof value !== "object") throw Error("Invalid chat directory");
      const directory = value as AgentChatDirectory;
      if (!Array.isArray(directory.ids) || directory.ids.some(id => typeof id !== "string" || !id) || new Set(directory.ids).size !== directory.ids.length || (directory.ids.length ? !directory.ids.includes(directory.activeId) : directory.activeId !== "")) throw Error("Invalid chat directory");
      return createAgentSessionState<AgentChatDirectory>({ activeId: directory.activeId, ids: directory.ids });
    },
  });
}
function parse(value: unknown): AgentChatSession {
  if (!value || typeof value !== "object") throw Error("Invalid chat session");
  const session = value as AgentChatSession;
  if ((session.sessionId !== null && typeof session.sessionId !== "string") || !Array.isArray(session.messages) || session.messages.some(message => !message || typeof message.prompt !== "string" || typeof message.reply !== "string" || !["running", "complete", "error", "interrupted"].includes(message.state))) throw Error("Invalid chat session");
  return { sessionId: session.sessionId, messages: session.messages.map(message => ({ ...message, state: message.state === "running" ? "interrupted" : message.state })) };
}
export function createAgentChatSession(key: string, storage: () => Pick<Storage, "getItem" | "setItem"> = () => window.localStorage) {
  return createWebStoredDocument({ key: `json-document.chat.${key}.v1`, storage,
    create: () => createAgentSessionState<AgentChatSession>({ sessionId: null, messages: [] }), restore: value => createAgentSessionState(parse(value)) });
}
