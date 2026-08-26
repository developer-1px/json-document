import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { AnnotationHand } from "@interactive-os/json-document-annotation";
import { createAnnotationEditor } from "@interactive-os/json-document-editing";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { initialAnnotationDocument } from "./annotation-state";
import { annotationDemoRecipe } from "./annotation-demo-styles";

const styles = annotationDemoRecipe();

export function AnnotationDemoRoute() {
  const [editor] = useState(() => createAnnotationEditor(createJSONDocument(initialAnnotationDocument)));
  const [announcement, setAnnouncement] = useState("클릭하거나 드래그해서 수정 코멘트를 남기세요.");
  const source = initialAnnotationDocument.sources[0]!;
  return <DemoPage documentation={
    <PageHeader illustration="cursor" title="Annotation Hands Demo" aside={<p className={classes("m-0 text-right", ui.text.meta)} aria-live="polite">{announcement}</p>}>
      이미지 위에서 위치를 표시하고 수정 요청을 남겨 보세요.
    </PageHeader>
  }>
    <ProductApp canvasClassName={styles.productCanvas()}>
      <AnnotationHand editor={editor} sourceUrl={sitePath(source.src)} createId={() => `annotation-${crypto.randomUUID()}`} onAnnouncement={setAnnouncement} rasterStyle={rasterStyle()} classNames={{
        frame: styles.canvasFrame(), stage: styles.stage(), canvas: styles.canvas(), commentCard: styles.commentCard(),
        commentInput: classes(ui.field.control, styles.commentInput()), commentPreview: styles.commentPreview(), sendButton: styles.sendButton(),
        toolDock: styles.toolDock(), dockButton: styles.dockButton(), dockDivider: styles.dockDivider(),
      }} />
    </ProductApp>
  </DemoPage>;
}

function sitePath(path: string) { const base = import.meta.env.BASE_URL.replace(/\/$/, ""); return `${base}${path}` || "/"; }
function rasterStyle() { const color = getComputedStyle(document.documentElement).getPropertyValue("--color-border-accent").trim(); const accent = ["rgb", "(", color, ")"].join(""); return { stroke: accent, fill: accent, lineWidth: 8, labelFont: "700 30px system-ui, sans-serif" }; }
