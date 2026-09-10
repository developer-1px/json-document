import { useState } from "react";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { CanvasHand } from "@interactive-os/json-document-canvas";
import { createPlaneSelectProfile } from "@interactive-os/json-document-affordance";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { canvasCreationStyle, emptyCanvasDocument } from "../../shared/demo-workbench/canvas-demo-document";
import { PageHeader } from "../../shared/ui/primitives";
import { ui } from "../../shared/ui/styles";

export function CanvasDemoRoute() {
  const [editor] = useState(() => createObjectEditor(emptyCanvasDocument));
  const [selectProfile] = useState(() => createPlaneSelectProfile());
  return (
    <DemoPage documentation={<PageHeader illustration="peek" title="Canvas">한 장에 글자·도형·그리기. Shift+클릭으로 다중 선택하고 Alt+드래그로 복제합니다. 복사한 텍스트·이미지도 붙여넣을 수 있으며, 글자는 더블클릭으로 편집합니다.</PageHeader>}>
      <CanvasHand className={ui.product.embedded} editor={editor} selectProfile={selectProfile} creationStyle={canvasCreationStyle} slideStyle={{ background: "rgb(var(--color-background-canvas))" }} />
    </DemoPage>
  );
}
