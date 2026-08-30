import { EventType, type AGUIEvent } from "@ag-ui/core";

export type CodexAgUiState = { readonly threadId: string; readonly runId: string; readonly messageId?: string };
export type CodexNotification = {
  readonly method?: string;
  readonly params?: {
    readonly threadId?: string;
    readonly turnId?: string;
    readonly itemId?: string;
    readonly delta?: string;
    readonly turn?: { readonly id: string; readonly status: string; readonly error?: { readonly message?: string } | null };
  };
};

export const CODEX_AG_UI_EVENT_MAP = {
  "turn/started": "RUN_STARTED",
  "item/agentMessage/delta": "TEXT_MESSAGE_START + TEXT_MESSAGE_CONTENT",
  "turn/completed": "TEXT_MESSAGE_END + RUN_FINISHED | RUN_ERROR",
} as const;

export function codexNotificationToAgUi(state: CodexAgUiState, notification: CodexNotification): {
  readonly state: CodexAgUiState;
  readonly events: ReadonlyArray<AGUIEvent>;
  readonly completed: boolean;
} {
  const params = notification.params;
  if (notification.method === "turn/started" && params?.turn) {
    const next = { ...state, threadId: params.threadId ?? state.threadId, runId: params.turn.id };
    return { state: next, events: [{ type: EventType.RUN_STARTED, threadId: next.threadId, runId: next.runId }], completed: false };
  }
  if (notification.method === "item/agentMessage/delta" && params?.delta) {
    const messageId = state.messageId ?? params.itemId ?? crypto.randomUUID();
    const events: AGUIEvent[] = [];
    if (!state.messageId) events.push({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
    events.push({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: params.delta });
    return { state: { ...state, messageId }, events, completed: false };
  }
  if (notification.method === "turn/completed") {
    const events: AGUIEvent[] = [];
    if (state.messageId) events.push({ type: EventType.TEXT_MESSAGE_END, messageId: state.messageId });
    if (params?.turn?.status === "failed") events.push({ type: EventType.RUN_ERROR, message: params.turn.error?.message ?? "Codex turn이 실패했습니다." });
    else events.push({ type: EventType.RUN_FINISHED, threadId: state.threadId, runId: state.runId });
    return { state, events, completed: true };
  }
  return { state, events: [], completed: false };
}
