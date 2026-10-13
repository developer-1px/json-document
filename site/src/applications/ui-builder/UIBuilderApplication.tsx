import "./ui-builder-application.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createUIBuilderEditor, createUIBuilderTools, createUIBuilderMaterialTools, createUIBuilderCatalogTools, createUIBuilderActionTools, createUIBuilderLayoutTools, type ObjectEditor } from "@interactive-os/json-document-editing";
import { assertUIBuilderDocument } from "@interactive-os/json-document-object-document";
import { UIBuilderWorkspace, UIBuilderStorageControls, createFakerSampleGenerator } from "@interactive-os/json-document-ui-builder";
import "@interactive-os/json-document-ui-builder/ui-builder-workspace.css";
import "@interactive-os/json-document-database/styles.css";
import { openWebStoredDocument, createWebIndexedDBStorage, type WebStoredDocument } from "@interactive-os/json-document-web";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { createBriefingExample, briefingMockSkills } from "./briefing-example";
import { streamLlmAgentTurn } from "../../app/llm-agent-api";
import { EditorAgentChat } from "../../app/EditorAgentChat";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "@interactive-os/json-document-canvas/ui-builder.css";

export function UIBuilderApplication() {
  const [example] = useState(() => new URLSearchParams(window.location.search).get("example") === "briefing");
  const [stored, setStored] = useState<WebStoredDocument<ObjectEditor> | null>(null);
  useEffect(() => {
    let active = true;
    void openWebStoredDocument({
    key: example ? "json-document.ui-builder.briefing.v1" : "json-document.ui-builder.v1", storage: createWebIndexedDBStorage("json-document-projects"), legacyStorage: () => window.localStorage,
    create: () => example ? createBriefingExample() : createUIBuilderEditor({ profile: "canvas/1", width: 1200, height: 900, objects: [] }),
    restore: value => { assertUIBuilderDocument(value); return createUIBuilderEditor(value); },
    }).then(value => {if (active) setStored(value);});
    return () => {active = false;};
  }, [example]);
  if (!stored) return <main className="p-8" role="status">저장한 문서를 불러오는 중…</main>;
  return <UIBuilderProjectApplication stored={stored} example={example} />;
}
function UIBuilderProjectApplication({stored, example}: {stored: WebStoredDocument<ObjectEditor>; example: boolean}) {
  const editor = stored.source;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  useEffect(() => stored.connect(), [stored]);
  const [generateSamples] = useState(() => createFakerSampleGenerator());
  const [tools] = useState(() => [...createUIBuilderTools(editor), ...createUIBuilderMaterialTools(editor, generateSamples), ...createUIBuilderCatalogTools(editor), ...createUIBuilderActionTools(editor, briefingMockSkills)]);
  async function arrange(signal: AbortSignal) {
    let applied = false;
    const layoutTools = createUIBuilderLayoutTools(editor).map(tool => ({...tool, execute: (args: unknown) => {
      if (signal.aborted) return {ok: false, reason: "정리를 취소했습니다."};
      const result = tool.execute(args);
      if (tool.name === "arrange_ui_builder" && result.ok) applied = true;
      return result;
    }}));
    await streamLlmAgentTurn({prompt: "자유 배치한 편집 화면을 실제 자동 흐름으로 정리하고 반영해 주세요. 먼저 전용 도구로 요소와 데이터 연결을 읽으세요. 편집 좌표는 유지하고, 의미와 사용 순서에 맞는 행·열 묶음과 순서를 결정하세요. 제목·본문·카드의 높이는 내용에 맞게 hug하고 버튼은 너비도 hug하세요. 페이지 목적에 맞게 제목과 도입부, 탐색과 주요 콘텐츠, 액션과 결과의 관계를 구성하세요. 절대 좌표나 고정 높이를 만들지 말고 모든 요소를 포함한 자동 흐름을 한 번 적용하세요.", mode: "chat", tools: layoutTools, sessionId: null, onSession: () => {}, write: () => {}, signal});
    if (!applied && !signal.aborted) throw new Error("AI가 배치를 적용하지 못했습니다. 다시 눌러 주세요.");
  }
  return <main aria-label="UI 빌더" className="ui-builder-application relative h-dvh w-full overflow-hidden bg-background-canvas">
    <UIBuilderWorkspace editor={editor} generateSamples={generateSamples} skills={briefingMockSkills} arrange={arrange} initialTab={example ? "run" : "screen"} navigation={<><UIBuilderStorageControls editor={editor} state={saveState} retry={() => void stored.save()} /><Command onClick={() => window.location.assign(example ? "/applications/ui-builder" : "/applications/ui-builder?example=briefing")}>{example ? "내 화면" : "업무 브리핑 MOCK"}</Command></>} />
    <EditorAgentChat tools={tools} id={example ? "ui-builder-briefing-chat" : "ui-builder-chat"} label="UI 디자인 도우미" logLabel="디자인 대화" inputLabel="UI 편집 요청" placeholder="무엇을 만들까요? 정리는 제가 할게요" />
  </main>;
}
