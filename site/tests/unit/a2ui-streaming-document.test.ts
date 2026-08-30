import { describe, expect, test } from "vitest";
import { EventType } from "@ag-ui/core";
import { createA2uiStreamingDocumentEngine, createAgUiA2uiAdapter } from "../../src/app/a2ui-streaming-document";

describe("A2UI streaming document", () => {
  test("accumulates A2UI component and data deltas in json-document", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const values: unknown[] = [];
    const subscription = engine.document$.subscribe((value) => values.push(value));

    engine.dispatch({ version: "v0.9", createSurface: { surfaceId: "main", catalogId: "catalog" } });
    engine.dispatch({ version: "v0.9", updateComponents: { surfaceId: "main", components: [{ id: "answer", component: "Markdown", value: { path: "/content/answer" } }] } });
    engine.dispatch({ version: "v0.9", updateDataModel: { surfaceId: "main", path: "/content/answer", value: "안녕" } });

    expect(engine.document.value).toMatchObject({ surfaces: { main: {
      catalogId: "catalog",
      components: { answer: { component: "Markdown" } },
      dataModel: { content: { answer: "안녕" } },
    } } });
    expect(values).toHaveLength(4);
    subscription.unsubscribe();
    engine.dispose();
  });

  test("decodes A2UI JSONL across arbitrary transport chunks", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const jsonl = [
      { version: "v0.9", createSurface: { surfaceId: "main", catalogId: "catalog" } },
      { version: "v0.9", updateDataModel: { surfaceId: "main", path: "/content/answer", value: "streamed" } },
    ].map((message) => JSON.stringify(message)).join("\n");

    engine.write(jsonl.slice(0, 17));
    engine.write(jsonl.slice(17));
    engine.complete();

    expect(engine.document.value).toMatchObject({ surfaces: { main: { dataModel: { content: { answer: "streamed" } } } } });
    engine.dispose();
  });

  test("converts text, tool, and artifact AG-UI events into one A2UI surface stream", () => {
    const adapter = createAgUiA2uiAdapter("run-1");
    const events = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "answer", role: "assistant" as const },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "answer", delta: "결과" },
      { type: EventType.TOOL_CALL_START, toolCallId: "tool-1", toolCallName: "codex.fileChange" },
      { type: EventType.TOOL_CALL_RESULT, messageId: "result-1", toolCallId: "tool-1", content: "완료", rawEvent: { params: { item: { type: "fileChange", changes: [{ path: "a.md" }] } } } },
    ];
    const messages = events.flatMap((event) => adapter.push(event));
    const engine = createA2uiStreamingDocumentEngine();
    messages.forEach((message) => engine.dispatch(message));

    expect(messages.every((message) => message.version === "v0.9")).toBe(true);
    expect(engine.document.value).toMatchObject({ surfaces: { "run-1": {
      components: {
        answer: { component: "Markdown" },
        "tool-1": { component: "ToolActivity" },
        "tool-1-artifact": { component: "Artifact" },
      },
      dataModel: {
        content: { answer: "결과" },
        tools: { "tool-1": { name: "codex.fileChange", status: "done", result: "완료" } },
        artifacts: { "tool-1": { kind: "fileChange" } },
      },
    } } });
    engine.dispose();
  });
});
