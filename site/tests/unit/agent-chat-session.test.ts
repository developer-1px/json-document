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

test("renews the tool session while retaining recent context when the tool catalog changes", async () => {
  const {prepareAgentChatTurn} = await import("../../src/app/agent-chat-session");
  const session: AgentChatSession = {sessionId: "old", messages: [{prompt: "고객 화면", reply: "완료", state: "complete"}]};
  const tools = [{name: "materials", description: "read", parameters: {type: "object"}}];
  const first = prepareAgentChatTurn(session, tools, "상품도 추가");
  expect(first.sessionId).toBeNull(); expect(first.prompt).toContain("고객 화면");
  expect(session.sessionId).toBe("old"); expect(session.messages).toHaveLength(1);
  const next = prepareAgentChatTurn({...session, toolSignature: first.toolSignature}, tools, "다시");
  expect(next.sessionId).toBe("old"); expect(next.prompt).toBe("다시");
  expect(prepareAgentChatTurn({...session, toolSignature: first.toolSignature}, [{...tools[0]!, parameters: {type: "string"}}], "변경").sessionId).toBeNull();
});

test("retains actionable failure reasons and redacts credentials and server dumps", async () => {
  const {agentChatErrorReason} = await import("../../src/app/agent-chat-session");
  expect(agentChatErrorReason(new Error("Invalid schema for function page_changes: type is missing"))).toContain("type is missing");
  expect(agentChatErrorReason(new Error("Invalid token Bearer secret-token api_key=secret-value at https://server.invalid/private"))).not.toMatch(/secret-token|secret-value|server.invalid/);
  expect(agentChatErrorReason(new Error('{"server":"verbose dump"}'))).toBe("에이전트 연결 또는 도구 등록을 확인해 주세요.");
  const values = new Map<string, string>();
  const storage = () => ({getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {values.set(key, value);}});
  const session = createAgentChatSession("failure", storage); const off = session.connect();
  session.source.update(() => ({sessionId: null, messages: [{prompt: "make", reply: "", state: "error", error: "Invalid schema: type is missing"}]}));
  off();
  expect((createAgentChatSession("failure", storage).source.snapshot.value as AgentChatSession).messages[0]?.error).toBe("Invalid schema: type is missing");
});
