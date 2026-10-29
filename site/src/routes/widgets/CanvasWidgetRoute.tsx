import { defaultObjectContainerPolicy } from "@interactive-os/json-document-object-document";
import { measureWebText, webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import { useState } from "react";
import { createObjectEditor, createCanvasHTML } from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { CanvasHand } from "@interactive-os/json-document-canvas";
import { canvasCreationStyle, canvasProofDocument, canvasHTMLProofSource } from "../../shared/demo-workbench/canvas-demo-document";
import { WidgetDemoFrame } from "./WidgetDemoFrame";
import { ui } from "../../shared/ui/styles";

export function CanvasWidgetRoute() {
  const [editor] = useState(() => createObjectEditor({ ...canvasProofDocument, objects: [...canvasProofDocument.objects,
    { ...createCanvasHTML(canvasHTMLProofSource, { x: 880, y: 540, width: 240, height: 150 }, "HTML/CSS 예제", webCanvasHTMLAdapter), id: "html-demo" },
  ] }, { measureText: measureWebText, containerPolicy: defaultObjectContainerPolicy }));
  const snapshot = useEditingSnapshot(editor);
  return <WidgetDemoFrame title="Canvas" description="같은 Canvas Hand를 다른 fixture와 관찰 UI에 조합합니다. 선택·조작·History는 정본 API가 소유합니다."
    widgetLabel="Canvas Hand" widget={<CanvasHand className={ui.product.embedded} editor={editor} creationStyle={canvasCreationStyle} slideStyle={{ background: "rgb(var(--color-background-canvas))" }} />}
    values={[
      { label: "selectedKeys", value: snapshot.selection.keys, testId: "widget-canvas-selected", size: "compact" },
      { label: "primaryKey", value: snapshot.selection.primaryKey, testId: "widget-canvas-primary", size: "compact" },
      { label: "selection", value: snapshot.selection, testId: "widget-canvas-selection", size: "compact" },
    ]} />;
}
