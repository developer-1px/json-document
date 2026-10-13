import "./ui-builder-application.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createUIBuilderEditor, createUIBuilderTools, createUIBuilderMaterialTools } from "@interactive-os/json-document-editing";
import { assertUIBuilderDocument } from "@interactive-os/json-document-object-document";
import { UIBuilderWorkspace, createFakerSampleGenerator } from "@interactive-os/json-document-ui-builder";
import "@interactive-os/json-document-ui-builder/ui-builder-workspace.css";
import "@interactive-os/json-document-database/styles.css";
import { createWebStoredDocument } from "@interactive-os/json-document-web";
import { EditorAgentChat } from "../../app/EditorAgentChat";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "@interactive-os/json-document-canvas/ui-builder.css";

export function UIBuilderApplication() {
  const [stored] = useState(() => createWebStoredDocument({
    key: "json-document.ui-builder.v1", storage: () => window.localStorage,
    create: () => createUIBuilderEditor({ profile: "canvas/1", width: 1200, height: 900, objects: [] }),
    restore: value => { assertUIBuilderDocument(value); return createUIBuilderEditor(value); },
  }));
  const editor = stored.source;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  useEffect(() => stored.connect(), [stored]);
  const [generateSamples] = useState(() => createFakerSampleGenerator());
  const [tools] = useState(() => [...createUIBuilderTools(editor), ...createUIBuilderMaterialTools(editor, generateSamples)]);
  return <main aria-label="UI 빌더" className="ui-builder-application relative h-dvh w-full overflow-hidden bg-background-canvas">
    <UIBuilderWorkspace editor={editor} generateSamples={generateSamples} />
    {(saveState === "save-error" || saveState === "load-error") && <p role="alert" className="absolute left-4 top-20 text-sm">저장 데이터를 확인해 주세요. 기존 데이터는 유지됩니다.</p>}
    <EditorAgentChat tools={tools} id="ui-builder-chat" label="UI 디자인 도우미" logLabel="디자인 대화" inputLabel="UI 편집 요청" placeholder="무엇을 만들까요? 정리는 제가 할게요" />
  </main>;
}
