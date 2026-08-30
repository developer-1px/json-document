import { describe, expect, test } from "vitest";
import { codexNotificationToAgUi } from "../../config/codex-ag-ui";

describe("Codex to AG-UI mapping", () => {
  test("maps a successful text turn to the complete AG-UI lifecycle", () => {
    let state = { threadId: "thread-1", runId: "requested-run" };
    const started = codexNotificationToAgUi(state, { method: "turn/started", params: { threadId: "thread-1", turn: { id: "turn-1", status: "inProgress" } } });
    state = started.state;
    const first = codexNotificationToAgUi(state, { method: "item/agentMessage/delta", params: { itemId: "message-1", delta: "안" } });
    state = first.state;
    const second = codexNotificationToAgUi(state, { method: "item/agentMessage/delta", params: { itemId: "message-1", delta: "녕" } });
    state = second.state;
    const completed = codexNotificationToAgUi(state, { method: "turn/completed", params: { turn: { id: "turn-1", status: "completed" } } });

    expect([...started.events, ...first.events, ...second.events, ...completed.events].map((event) => event.type)).toEqual([
      "RUN_STARTED", "TEXT_MESSAGE_START", "TEXT_MESSAGE_CONTENT", "TEXT_MESSAGE_CONTENT", "TEXT_MESSAGE_END", "RUN_FINISHED",
    ]);
    expect(completed.completed).toBe(true);
  });

  test("maps a failed Codex turn to RUN_ERROR", () => {
    const mapped = codexNotificationToAgUi({ threadId: "thread-1", runId: "turn-1" }, { method: "turn/completed", params: { turn: { id: "turn-1", status: "failed", error: { message: "실패" } } } });
    expect(mapped.events).toMatchObject([{ type: "RUN_ERROR", message: "실패" }]);
  });

  test("maps reasoning deltas and closes their lifecycle", () => {
    const first = codexNotificationToAgUi({ threadId: "thread-1", runId: "turn-1" }, {
      method: "item/reasoning/summaryTextDelta",
      params: { itemId: "reasoning-1", delta: "검토" },
    });
    const completed = codexNotificationToAgUi(first.state, {
      method: "item/completed",
      params: { item: { type: "reasoning", id: "reasoning-1" } },
    });

    expect([...first.events, ...completed.events].map((event) => event.type)).toEqual([
      "REASONING_START", "REASONING_MESSAGE_START", "REASONING_MESSAGE_CONTENT", "REASONING_MESSAGE_END", "REASONING_END",
    ]);
  });

  test("maps Codex tool items to the AG-UI tool lifecycle", () => {
    const started = codexNotificationToAgUi({ threadId: "thread-1", runId: "turn-1" }, {
      method: "item/started",
      params: { item: { type: "mcpToolCall", id: "tool-1", server: "files", tool: "read", arguments: { path: "a.md" } } },
    });
    const completed = codexNotificationToAgUi(started.state, {
      method: "item/completed",
      params: { item: { type: "mcpToolCall", id: "tool-1", server: "files", tool: "read", status: "completed", result: { text: "ok" } } },
    });

    expect([...started.events, ...completed.events].map((event) => event.type)).toEqual([
      "TOOL_CALL_START", "TOOL_CALL_ARGS", "TOOL_CALL_END", "TOOL_CALL_RESULT",
    ]);
    expect(started.events[0]).toMatchObject({ toolCallName: "mcp.files.read", rawEvent: { method: "item/started" } });
  });

  test("maps subagent activity to AG-UI subagent events", () => {
    const started = codexNotificationToAgUi({ threadId: "thread-1", runId: "turn-1" }, {
      method: "item/started",
      params: { item: { type: "subAgentActivity", id: "activity-1", kind: "started", agentThreadId: "agent-1", agentPath: "reviewer" } },
    });
    const interrupted = codexNotificationToAgUi(started.state, {
      method: "item/completed",
      params: { item: { type: "subAgentActivity", id: "activity-1", kind: "interrupted", agentThreadId: "agent-1", agentPath: "reviewer" } },
    });

    expect(started.events[0]).toMatchObject({ type: "SUBAGENT_STARTED", subagentRunId: "agent-1", name: "reviewer" });
    expect(interrupted.events[0]).toMatchObject({ type: "SUBAGENT_ERROR", subagentRunId: "agent-1", code: "interrupted" });
  });

  test("preserves every unmapped Codex notification as an AG-UI RAW event", () => {
    const notification = { method: "thread/tokenUsage/updated", params: { threadId: "thread-1", tokenUsage: { total: 42 } } };
    const mapped = codexNotificationToAgUi({ threadId: "thread-1", runId: "turn-1" }, notification);

    expect(mapped.events).toEqual([{ type: "RAW", event: notification, source: "codex-app-server" }]);
  });
});
