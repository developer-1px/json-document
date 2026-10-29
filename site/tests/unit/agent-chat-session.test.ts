// @vitest-environment node
import { expect, test } from "vitest";
import { createAgentChatDirectory, createAgentChatSession, type AgentChatSession } from "../../src/app/agent-chat-session";

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

test("retains multiple conversation IDs and selection without replacing the original conversation", () => {
  const values = new Map<string, string>();
  const storage = () => ({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } });
  const existing = createAgentChatSession("canvas-chat", storage); existing.connect();
  existing.source.update(() => ({ sessionId: "original", messages: [] }));
  const directory = createAgentChatDirectory("canvas", "canvas-chat", storage); directory.connect();
  directory.source.update(current => ({ activeId: "second", ids: [...current.ids, "second"] }));
  expect(createAgentChatDirectory("canvas", "canvas-chat", storage).source.snapshot.value).toEqual({ activeId: "second", ids: ["canvas-chat", "second"] });
  expect(createAgentChatSession("canvas-chat", storage).source.snapshot.value).toEqual({ sessionId: "original", messages: [] });
  expect(createAgentChatSession("second", storage).source.snapshot.value).toEqual({ sessionId: null, messages: [] });
});

test("does not overwrite a malformed conversation directory on mount", () => {
  for (const value of [{ activeId: "missing", ids: ["first"] }, { activeId: "first", ids: ["first", "first"] }, { activeId: "first", ids: [] }]) {
    const raw = JSON.stringify(value); let saved = raw;
    const stored = createAgentChatDirectory("canvas", "canvas-chat", () => ({ getItem: () => saved, setItem: (_key, value) => { saved = value; } }));
    expect(stored.state).toBe("load-error"); stored.connect(); expect(saved).toBe(raw);
  }
});
