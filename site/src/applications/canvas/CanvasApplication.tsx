import "./canvas-application.css";
import { defaultObjectContainerPolicy } from "@interactive-os/json-document-object-document";
import { measureWebText } from "@interactive-os/json-document-web";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import { createWebStoredDocument } from "@interactive-os/json-document-web";
import { assertCanvasDocument } from "@interactive-os/json-document-object-document";
import { EditorAgentChat } from "../../app/EditorAgentChat";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createCanvasEditorTools, createObjectEditor } from "@interactive-os/json-document-editing";
import { CanvasHand } from "@interactive-os/json-document-canvas";
import { createPlaneSelectProfile } from "@interactive-os/json-document-affordance";
import { canvasCreationStyle, emptyCanvasDocument } from "../../shared/demo-workbench/canvas-demo-document";

export function CanvasApplication() {
  const [stored] = useState(() => createWebStoredDocument({ key: "json-document.canvas.v1", storage: () => window.localStorage,
    create: () => createObjectEditor(emptyCanvasDocument, { measureText: measureWebText, containerPolicy: defaultObjectContainerPolicy }), restore: value => { assertCanvasDocument(value); return createObjectEditor(value, { measureText: measureWebText, containerPolicy: defaultObjectContainerPolicy }); } }));
  const editor = stored.source;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  useEffect(() => stored.connect(), [stored]);
  const [tools] = useState(() => createCanvasEditorTools(editor));
  const [selectProfile] = useState(() => createPlaneSelectProfile());
  return (
    <main aria-label="Canvas 작업 공간" className="canvas-application h-dvh w-full overflow-hidden">
      <CanvasHand workspace editor={editor} selectProfile={selectProfile} creationStyle={canvasCreationStyle} slideStyle={{ background: "rgb(var(--color-background-canvas))" }} />
      {(saveState === "save-error" || saveState === "load-error") && <p role="alert">Canvas 저장 데이터를 확인해 주세요. 기존 데이터는 유지됩니다.</p>}
      <EditorAgentChat tools={tools} id="canvas-chat" label="Canvas 도우미" logLabel="Canvas 대화" inputLabel="Canvas 편집 요청" placeholder="만들거나 바꿀 내용을 말해보세요" />
    </main>
  );
}
