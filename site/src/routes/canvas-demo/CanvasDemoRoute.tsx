import { useState } from "react";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { CanvasHand } from "@interactive-os/json-document-canvas";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { canvasCreationStyle, emptyCanvasDocument } from "../../shared/demo-workbench/canvas-demo-document";
import { PageHeader } from "../../shared/ui/primitives";
import { ui } from "../../shared/ui/styles";

export function CanvasDemoRoute() {
  const [editor] = useState(() => createObjectEditor(emptyCanvasDocument));
  return (
    <DemoPage documentation={<PageHeader illustration="peek" title="Canvas">한 장에 글자·도형·그리기. 도구를 고른 뒤 슬라이드를 클릭하거나 드래그하세요. 글자는 더블클릭으로 편집합니다.</PageHeader>}>
      <CanvasHand className={ui.product.embedded} editor={editor} creationStyle={canvasCreationStyle} slideStyle={{ background: "rgb(var(--color-background-canvas))" }} />
    </DemoPage>
  );
}
