import { EventType, type AGUIEvent } from "@ag-ui/core";

type CodexItem = Record<string, unknown> & { readonly id?: string; readonly type?: string };
export type CodexAgUiState = { readonly threadId: string; readonly runId: string; readonly messageId?: string; readonly reasoningMessageId?: string };
export type CodexNotification = {
  readonly method?: string;
  readonly params?: Record<string, unknown> & {
    readonly threadId?: string;
    readonly turnId?: string;
    readonly itemId?: string;
    readonly delta?: string;
    readonly item?: CodexItem;
    readonly turn?: { readonly id: string; readonly status: string; readonly error?: { readonly message?: string } | null };
  };
};

export const CODEX_AG_UI_EVENT_MAP = {
  "turn/started": ["RUN_STARTED"],
  "item/agentMessage/delta": ["TEXT_MESSAGE_START", "TEXT_MESSAGE_CONTENT"],
  "item/reasoning/summaryTextDelta": ["REASONING_START", "REASONING_MESSAGE_START", "REASONING_MESSAGE_CONTENT"],
  "item/reasoning/textDelta": ["REASONING_START", "REASONING_MESSAGE_START", "REASONING_MESSAGE_CONTENT"],
  "item/started": ["TOOL_CALL_*", "SUBAGENT_STARTED", "RAW"],
  "item/completed": ["TOOL_CALL_RESULT", "SUBAGENT_*", "REASONING_*", "RAW"],
  "turn/completed": ["TEXT_MESSAGE_END", "REASONING_*", "RUN_FINISHED", "RUN_ERROR"],
  "*": ["RAW"],
} as const;

const TOOL_ITEM_TYPES = new Set(["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "collabAgentToolCall", "webSearch", "imageView", "sleep", "imageGeneration"]);

export function codexNotificationToAgUi(state: CodexAgUiState, notification: CodexNotification): {
  readonly state: CodexAgUiState;
  readonly events: ReadonlyArray<AGUIEvent>;
  readonly completed: boolean;
} {
  const params = notification.params;
  if (notification.method === "turn/started" && params?.turn) {
    const next = { ...state, threadId: params.threadId ?? state.threadId, runId: params.turn.id };
    return result(next, [withRaw({ type: EventType.RUN_STARTED, threadId: next.threadId, runId: next.runId }, notification)]);
  }
  if (notification.method === "item/agentMessage/delta" && params?.delta) {
    const messageId = state.messageId ?? params.itemId ?? crypto.randomUUID();
    const events: AGUIEvent[] = [];
    if (!state.messageId) events.push(withRaw({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" }, notification));
    events.push(withRaw({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: params.delta }, notification));
    return result({ ...state, messageId }, events);
  }
  if ((notification.method === "item/reasoning/summaryTextDelta" || notification.method === "item/reasoning/textDelta") && params?.delta) {
    const messageId = state.reasoningMessageId ?? params.itemId ?? crypto.randomUUID();
    const events: AGUIEvent[] = [];
    if (!state.reasoningMessageId) {
      events.push(withRaw({ type: EventType.REASONING_START, messageId }, notification));
      events.push(withRaw({ type: EventType.REASONING_MESSAGE_START, messageId, role: "reasoning" }, notification));
    }
    events.push(withRaw({ type: EventType.REASONING_MESSAGE_CONTENT, messageId, delta: params.delta }, notification));
    return result({ ...state, reasoningMessageId: messageId }, events);
  }
  if (notification.method === "item/started" && params?.item) {
    const subagent = mapSubagentStarted(params.item, notification);
    if (subagent) return result(state, [subagent]);
    const tool = mapToolStarted(params.item, state.messageId, notification);
    if (tool) return result(state, tool);
  }
  if (notification.method === "item/completed" && params?.item) {
    if (params.item.type === "reasoning" && state.reasoningMessageId) {
      const messageId = state.reasoningMessageId;
      return result({ ...state, reasoningMessageId: undefined }, [
        withRaw({ type: EventType.REASONING_MESSAGE_END, messageId }, notification),
        withRaw({ type: EventType.REASONING_END, messageId }, notification),
      ]);
    }
    const subagent = mapSubagentCompleted(params.item, notification);
    if (subagent) return result(state, [subagent]);
    const tool = mapToolCompleted(params.item, notification);
    if (tool) return result(state, tool);
  }
  if (notification.method === "turn/completed") {
    const events: AGUIEvent[] = [];
    if (state.reasoningMessageId) {
      events.push(withRaw({ type: EventType.REASONING_MESSAGE_END, messageId: state.reasoningMessageId }, notification));
      events.push(withRaw({ type: EventType.REASONING_END, messageId: state.reasoningMessageId }, notification));
    }
    if (state.messageId) events.push(withRaw({ type: EventType.TEXT_MESSAGE_END, messageId: state.messageId }, notification));
    if (params?.turn?.status === "failed") events.push(withRaw({ type: EventType.RUN_ERROR, message: params.turn.error?.message ?? "Codex turn이 실패했습니다." }, notification));
    else events.push(withRaw({ type: EventType.RUN_FINISHED, threadId: state.threadId, runId: state.runId }, notification));
    return { state, events, completed: true };
  }
  return result(state, [{ type: EventType.RAW, event: notification, source: "codex-app-server" }]);
}

function mapToolStarted(item: CodexItem, parentMessageId: string | undefined, raw: CodexNotification): AGUIEvent[] | undefined {
  if (!item.id || !item.type || !TOOL_ITEM_TYPES.has(item.type)) return undefined;
  const events: AGUIEvent[] = [withRaw({ type: EventType.TOOL_CALL_START, toolCallId: item.id, toolCallName: toolName(item), parentMessageId }, raw)];
  const args = toolArguments(item);
  if (args !== undefined) events.push(withRaw({ type: EventType.TOOL_CALL_ARGS, toolCallId: item.id, delta: JSON.stringify(args) }, raw));
  events.push(withRaw({ type: EventType.TOOL_CALL_END, toolCallId: item.id }, raw));
  return events;
}

function mapToolCompleted(item: CodexItem, raw: CodexNotification): AGUIEvent[] | undefined {
  if (!item.id || !item.type || !TOOL_ITEM_TYPES.has(item.type)) return undefined;
  return [withRaw({ type: EventType.TOOL_CALL_RESULT, messageId: `${item.id}-result`, toolCallId: item.id, content: JSON.stringify(toolResult(item)), role: "tool" }, raw)];
}

function mapSubagentStarted(item: CodexItem, raw: CodexNotification): AGUIEvent | undefined {
  if (item.type !== "subAgentActivity" || item.kind !== "started" || typeof item.agentThreadId !== "string") return undefined;
  return withRaw({ type: EventType.SUBAGENT_STARTED, subagentRunId: item.agentThreadId, name: typeof item.agentPath === "string" ? item.agentPath : item.agentThreadId }, raw);
}

function mapSubagentCompleted(item: CodexItem, raw: CodexNotification): AGUIEvent | undefined {
  if (item.type !== "subAgentActivity" || typeof item.agentThreadId !== "string") return undefined;
  if (item.kind === "interrupted") return withRaw({ type: EventType.SUBAGENT_ERROR, subagentRunId: item.agentThreadId, message: "Codex subagent가 중단되었습니다.", code: "interrupted" }, raw);
  return undefined;
}

function toolName(item: CodexItem): string {
  if (item.type === "mcpToolCall") return `mcp.${String(item.server)}.${String(item.tool)}`;
  if (item.type === "dynamicToolCall") return [item.namespace, item.tool].filter(Boolean).join(".");
  if (item.type === "collabAgentToolCall") return `codex.collab.${String(item.tool)}`;
  return `codex.${item.type}`;
}

function toolArguments(item: CodexItem): unknown {
  if ("arguments" in item) return item.arguments;
  if (item.type === "commandExecution") return { command: item.command, cwd: item.cwd };
  if (item.type === "fileChange") return { changes: item.changes };
  if (item.type === "imageView") return { path: item.path };
  if (item.type === "collabAgentToolCall") return { prompt: item.prompt, receiverThreadIds: item.receiverThreadIds };
  return undefined;
}

function toolResult(item: CodexItem): unknown {
  if (item.type === "commandExecution") return { output: item.aggregatedOutput, exitCode: item.exitCode, status: item.status };
  if (item.type === "mcpToolCall") return { result: item.result, error: item.error, status: item.status };
  if (item.type === "dynamicToolCall") return { contentItems: item.contentItems, success: item.success, status: item.status };
  return item;
}

function withRaw<T extends AGUIEvent>(event: T, rawEvent: CodexNotification): T { return { ...event, rawEvent }; }
function result(state: CodexAgUiState, events: ReadonlyArray<AGUIEvent>) { return { state, events, completed: false } as const; }
