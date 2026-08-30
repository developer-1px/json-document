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
});
