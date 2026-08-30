import { describe, expect, test } from "vitest";
import { EventType } from "@ag-ui/core";
import { A2UI_BASIC_CATALOG_ID, createA2uiStreamingDocumentEngine, createAgUiA2uiAdapter, projectA2uiFences } from "../../src/app/a2ui-streaming-document";

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

  test("closes partial text and active tools when a run is interrupted", () => {
    const adapter = createAgUiA2uiAdapter("run-interrupted");
    const engine = createA2uiStreamingDocumentEngine();
    [
      { type: EventType.TEXT_MESSAGE_START, messageId: "partial", role: "assistant" as const },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "partial", delta: "작성 중" },
      { type: EventType.TOOL_CALL_START, toolCallId: "tool-running", toolCallName: "codex.commandExecution" },
      { type: EventType.RUN_ERROR, message: "중단됨" },
    ].flatMap((event) => adapter.push(event)).forEach((message) => engine.dispatch(message));

    expect(engine.document.value).toMatchObject({ surfaces: { "run-interrupted": {
      components: { partial: { component: "Markdown", streaming: false } },
      dataModel: { content: { partial: "작성 중" }, tools: { "tool-running": { status: "error" } } },
    } } });
    engine.dispose();
  });

  test("projects only complete A2UI JSONL lines and hides the fence from Markdown", () => {
    const create = JSON.stringify({ version: "v0.9", createSurface: { surfaceId: "weather", catalogId: A2UI_BASIC_CATALOG_ID } });
    const components = JSON.stringify({ version: "v0.9", updateComponents: { surfaceId: "weather", components: [{ id: "root", component: "Column", children: ["title"] }, { id: "title", component: "Text", text: "오늘의 날씨", variant: "h2" }] } });

    const partial = projectA2uiFences(`화면을 만들었습니다.\n\`\`\`a2ui\n${create}\n${components.slice(0, 30)}`);
    expect(partial.markdown).toBe("화면을 만들었습니다.\n");
    expect(partial.messages).toHaveLength(1);

    const complete = projectA2uiFences(`화면을 만들었습니다.\n\`\`\`a2ui\n${create}\n${components}\n\`\`\``);
    expect(complete.messages).toHaveLength(2);
    expect(complete.markdown).not.toContain("a2ui");
    expect(complete.markdown).not.toContain("createSurface");
  });

  test("streams fenced A2UI messages from the assistant into the canonical document", () => {
    const adapter = createAgUiA2uiAdapter("chat");
    const engine = createA2uiStreamingDocumentEngine();
    const create = JSON.stringify({ version: "v0.9", createSurface: { surfaceId: "profile", catalogId: A2UI_BASIC_CATALOG_ID } });
    const components = JSON.stringify({ version: "v0.9", updateComponents: { surfaceId: "profile", components: [{ id: "root", component: "Column", children: ["title"] }, { id: "title", component: "Text", text: "프로필", variant: "h2" }] } });
    const events = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "answer", role: "assistant" as const },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "answer", delta: `준비했습니다.\n\`\`\`a2ui\n${create}\n${components.slice(0, 20)}` },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "answer", delta: `${components.slice(20)}\n\`\`\`` },
      { type: EventType.TEXT_MESSAGE_END, messageId: "answer" },
    ];
    events.flatMap((event) => adapter.push(event)).forEach((message) => engine.dispatch(message));

    expect(engine.document.value).toMatchObject({ surfaces: {
      chat: { dataModel: { content: { answer: "준비했습니다.\n" } } },
      profile: { catalogId: A2UI_BASIC_CATALOG_ID, components: { title: { text: "프로필" } } },
    } });
    engine.dispose();
  });

  test("accumulates repeated component batches and replaces existing component and data values", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const states: unknown[] = [];
    const subscription = engine.document$.subscribe((state) => states.push(state));
    const messages = [
      { version: "v0.9", createSurface: { surfaceId: "dashboard", catalogId: A2UI_BASIC_CATALOG_ID } },
      { version: "v0.9", updateComponents: { surfaceId: "dashboard", components: [{ id: "root", component: "Column", children: ["title", "metrics", "status"] }, { id: "title", component: "Text", text: "운영 대시보드", variant: "h1" }, { id: "metrics", component: "Row", children: ["primary", "secondary", "tertiary"] }] } },
      { version: "v0.9", updateComponents: { surfaceId: "dashboard", components: [{ id: "primary", component: "Card", child: "primaryValue", weight: 2 }, { id: "primaryValue", component: "Text", text: { path: "/metrics/primary" }, variant: "h2" }, { id: "secondary", component: "Card", child: "secondaryValue", weight: 1 }, { id: "secondaryValue", component: "Text", text: { path: "/metrics/secondary" } }, { id: "tertiary", component: "Card", child: "tertiaryValue", weight: 1 }, { id: "tertiaryValue", component: "Text", text: { path: "/metrics/tertiary" } }, { id: "status", component: "Text", text: "데이터 수신 중" }] } },
      { version: "v0.9", updateDataModel: { surfaceId: "dashboard", path: "/metrics", value: { primary: "42", secondary: "17", tertiary: "8" } } },
      { version: "v0.9", updateComponents: { surfaceId: "dashboard", components: [{ id: "status", component: "Text", text: { path: "/status" }, variant: "caption" }] } },
      { version: "v0.9", updateDataModel: { surfaceId: "dashboard", path: "/status", value: "동기화 완료" } },
      { version: "v0.9", updateDataModel: { surfaceId: "dashboard", path: "/metrics/primary", value: "48" } },
    ];
    for (const message of messages) engine.write(`${JSON.stringify(message)}\n`);

    expect(states).toHaveLength(messages.length + 1);
    expect(engine.document.value).toMatchObject({ surfaces: { dashboard: {
      components: { primary: { weight: 2 }, secondary: { weight: 1 }, tertiary: { weight: 1 }, status: { text: { path: "/status" }, variant: "caption" } },
      dataModel: { metrics: { primary: "48", secondary: "17", tertiary: "8" }, status: "동기화 완료" },
    } } });
    subscription.unsubscribe();
    engine.dispose();
  });
});
