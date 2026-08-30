import { EventType, type AGUIEvent } from "@ag-ui/core";
import { HANDS_CATALOG_ID, type A2uiMessage } from "./a2ui-streaming-document";
import { projectA2uiFences } from "./a2ui-fence";
import { A2UI_PROJECTION_ERROR_TEXT } from "./protocol-error";

export interface AgUiA2uiAdapter {
  push(event: AGUIEvent): ReadonlyArray<A2uiMessage>;
}

export function createAgUiA2uiAdapter(surfaceId: string): AgUiA2uiAdapter {
  const text = new Map<string, string>();
  const roles = new Map<string, "assistant" | "developer" | "system" | "user">();
  const toolArguments = new Map<string, string>();
  const openText = new Set<string>();
  const openTools = new Set<string>();
  const projectedA2ui = new Map<string, number>();
  let created = false;
  return { push(event) {
    const messages: A2uiMessage[] = [];
    if (!created) {
      created = true;
      messages.push(
        { version: "v0.9", createSurface: { surfaceId, catalogId: HANDS_CATALOG_ID } },
        { version: "v0.9", updateComponents: { surfaceId, components: [{ id: "root", component: "Column", children: [] }] } },
      );
    }
    if (event.type === EventType.TEXT_MESSAGE_START) {
      roles.set(event.messageId, event.role);
      openText.add(event.messageId);
      messages.push(component(surfaceId, event.messageId, "Markdown", { role: event.role, streaming: true }));
    }
    if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
      const source = `${text.get(event.messageId) ?? ""}${event.delta}`;
      text.set(event.messageId, source);
      const projection = roles.get(event.messageId) === "assistant" ? projectA2uiFences(source) : { markdown: source, messages: [] };
      messages.push(data(surfaceId, `/content/${event.messageId}`, visibleMarkdown(projection)));
      const consumed = projectedA2ui.get(event.messageId) ?? 0;
      messages.push(...projection.messages.slice(consumed));
      projectedA2ui.set(event.messageId, projection.messages.length);
    }
    if (event.type === EventType.TEXT_MESSAGE_END) {
      openText.delete(event.messageId);
      if (roles.get(event.messageId) === "assistant") {
        const projection = projectA2uiFences(text.get(event.messageId) ?? "", true);
        messages.push(data(surfaceId, `/content/${event.messageId}`, visibleMarkdown(projection)));
        const consumed = projectedA2ui.get(event.messageId) ?? 0;
        messages.push(...projection.messages.slice(consumed));
        projectedA2ui.set(event.messageId, projection.messages.length);
      }
      messages.push(component(surfaceId, event.messageId, "Markdown", { role: roles.get(event.messageId) ?? "assistant", streaming: false }));
    }
    if (event.type === EventType.REASONING_MESSAGE_START) messages.push(component(surfaceId, event.messageId, "Reasoning"));
    if (event.type === EventType.REASONING_MESSAGE_CONTENT) {
      const value = `${text.get(event.messageId) ?? ""}${event.delta}`;
      text.set(event.messageId, value);
      messages.push(data(surfaceId, `/content/${event.messageId}`, value));
    }
    if (event.type === EventType.TOOL_CALL_START) {
      openTools.add(event.toolCallId);
      messages.push(component(surfaceId, event.toolCallId, "ToolActivity"));
      messages.push(data(surfaceId, `/tools/${event.toolCallId}`, { name: event.toolCallName, status: "running", arguments: "" }));
    }
    if (event.type === EventType.TOOL_CALL_ARGS) {
      const value = `${toolArguments.get(event.toolCallId) ?? ""}${event.delta}`;
      toolArguments.set(event.toolCallId, value);
      messages.push(data(surfaceId, `/tools/${event.toolCallId}/arguments`, value));
    }
    if (event.type === EventType.TOOL_CALL_RESULT) {
      openTools.delete(event.toolCallId);
      messages.push(data(surfaceId, `/tools/${event.toolCallId}/status`, "done"));
      messages.push(data(surfaceId, `/tools/${event.toolCallId}/result`, event.content));
      const artifact = artifactFrom(event);
      if (artifact) {
        messages.push(component(surfaceId, `${event.toolCallId}-artifact`, "Artifact", {}, `/artifacts/${event.toolCallId}`));
        messages.push(data(surfaceId, `/artifacts/${event.toolCallId}`, artifact));
      }
    }
    if (event.type === EventType.RUN_ERROR || event.type === EventType.RUN_FINISHED) {
      for (const messageId of openText) messages.push(component(surfaceId, messageId, "Markdown", { role: roles.get(messageId) ?? "assistant", streaming: false }));
      openText.clear();
      if (event.type === EventType.RUN_ERROR) {
        for (const toolCallId of openTools) messages.push(data(surfaceId, `/tools/${toolCallId}/status`, "error"));
        openTools.clear();
      }
    }
    return messages;
  } };
}

function visibleMarkdown(projection: Readonly<{ markdown: string; errors?: ReadonlyArray<string> }>): string {
  if (!projection.errors?.length) return projection.markdown;
  return `${projection.markdown}${projection.markdown.endsWith("\n") || !projection.markdown ? "" : "\n\n"}${A2UI_PROJECTION_ERROR_TEXT}`;
}

function component(surfaceId: string, id: string, type: string, properties: Record<string, unknown> = {}, valuePath?: string): A2uiMessage {
  return { version: "v0.9", updateComponents: { surfaceId, components: [{ id, component: type, value: { path: valuePath ?? (type === "ToolActivity" ? `/tools/${id}` : `/content/${id}`) }, ...properties }] } };
}
function data(surfaceId: string, path: string, value: unknown): A2uiMessage {
  return { version: "v0.9", updateDataModel: { surfaceId, path, value } };
}
function artifactFrom(event: Extract<AGUIEvent, { type: EventType.TOOL_CALL_RESULT }>): unknown | undefined {
  const raw = event.rawEvent as { params?: { item?: { type?: string; changes?: unknown } } } | undefined;
  return raw?.params?.item?.type === "fileChange" ? { kind: "fileChange", changes: raw.params.item.changes, content: event.content } : undefined;
}
