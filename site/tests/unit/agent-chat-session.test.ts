// @vitest-environment node
import { expect, test } from "vitest";
import { createAgentChatSession, type AgentChatSession } from "../../src/app/agent-chat-session";

test("retains the thread and messages and marks an interrupted request after reload", () => {
  const values = new Map<string, string>();
  const storage = () => ({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } });
  const first = createAgentChatSession("canvas", storage); const off = first.connect();
  first.source.update(() => ({ sessionId: "thread-1", messages: [{ prompt: "make", reply: "partial", state: "running" }] }));
  off();
  const restored = createAgentChatSession("canvas", storage).source.snapshot.value as AgentChatSession;
  expect(restored.sessionId).toBe("thread-1");
  expect(restored.messages).toEqual([{ prompt: "make", reply: "partial", state: "interrupted" }]);
  expect((createAgentChatSession("bear", storage).source.snapshot.value as AgentChatSession).messages).toEqual([]);
});

test("does not overwrite unreadable persisted conversations on mount", () => {
  let raw = "broken";
  const stored = createAgentChatSession("canvas", () => ({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }));
  expect(stored.state).toBe("load-error"); stored.connect(); expect(raw).toBe("broken");
});
