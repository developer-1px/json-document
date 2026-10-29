import { linkPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { fieldPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { AnnotationReviewUsage } from "./AnnotationReviewUsage";
import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { Command, Popover, ProductShell, Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { AnnotationHand, useAnnotationOutput, type AnnotationTool } from "@interactive-os/json-document-annotation";
import { createAnnotationEditor } from "@interactive-os/json-document-editing";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import { initialAnnotationDocument } from "./annotation-state";
import { annotationDemoRecipe } from "./annotation-demo-styles";

import { Save, RotateCcw } from "lucide-react";
import { CodeBlock } from "../../shared/ui/code-block";

const styles = annotationDemoRecipe();

export function AnnotationDemoRoute() {
  const [review, setReview] = useState(false);
  const [document] = useState(() => createJSONDocument(initialAnnotationDocument));
  const [editor] = useState(() => createAnnotationEditor(document));
  const [tool, setTool] = useState<AnnotationTool>("comment");
  const [output, setOutput] = useState<"structured" | "image">("structured");
  const [outputOpen, setOutputOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("클릭하거나 드래그해서 수정 코멘트를 남기세요.");
  const source = initialAnnotationDocument.sources[0]!;
  const state = useAnnotationOutput({ document, editor, sourceUrl: sitePath(source.src), rasterStyle: rasterStyle(), renderImage: output === "image" });
  if (review) return <DemoPage documentation={<PageHeader illustration="cursor" title="Annotation Review Usage"><Command onClick={() => setReview(false)}>이미지 표시 예제</Command></PageHeader>}><AnnotationReviewUsage /></DemoPage>;
  return <DemoPage documentation={
    <PageHeader illustration="cursor" title="Annotation Hands Demo" aside={<p className={classes("m-0 text-right", contentPresentation.caption)} aria-live="polite">{announcement}</p>}>
      이미지 위에서 위치를 표시하고 수정 요청을 남겨 보세요.
      <Command onClick={() => setReview(true)}>에이전트 첨삭 Usage</Command>
    </PageHeader>
  }>
    <ProductShell canvasClassName={styles.productCanvas()}>
      <AnnotationHand editor={editor} tool={tool} onToolChange={setTool} reactionShadow="drop-shadow(0 4px 3px rgb(var(--color-foreground-strong) / 0.24))" sourceUrl={sitePath(source.src)} createId={() => `annotation-${crypto.randomUUID()}`} onAnnouncement={setAnnouncement} rasterStyle={rasterStyle()} classNames={{
        frame: styles.canvasFrame(), stage: styles.stage(), canvas: styles.canvas(), commentCard: styles.commentCard(),
        commentInput: classes(fieldPresentation.seamless, styles.commentInput()), commentPreview: styles.commentPreview(),
        toolDock: styles.toolDock(),
      }} />
    </ProductShell>
    <Popover label="Annotation output" trigger="Annotation output" open={outputOpen} onOpenChange={setOutputOpen}
      className="fixed bottom-16 right-4 z-50" panelClassName="absolute top-auto left-auto bottom-[calc(100%+var(--space-related))] right-0 z-50 max-h-[calc(100vh-6rem)] w-[min(34rem,calc(100vw-2rem))] overflow-auto p-group">
      <OutputPanel {...state} output={output} setOutput={setOutput}
        onSave={() => { state.save(); setAnnouncement("Structured annotation state를 저장했습니다."); }}
        onRestore={() => { if (state.restore()) setAnnouncement("저장한 state에서 overlay를 복원했습니다."); }} />
    </Popover>
  </DemoPage>;
}

function sitePath(path: string) { const base = import.meta.env.BASE_URL.replace(/\/$/, ""); return `${base}${path}` || "/"; }
function rasterStyle() { const color = getComputedStyle(document.documentElement).getPropertyValue("--color-border-accent").trim(); const accent = ["rgb", "(", color, ")"].join(""); return { stroke: accent, fill: accent, lineWidth: 8, labelFont: "700 30px system-ui, sans-serif" }; }

function OutputPanel(props: {
  readonly canRestore: boolean;
  readonly onRestore: () => void;
  readonly onSave: () => void;
  readonly output: "structured" | "image";
  readonly setOutput: (output: "structured" | "image") => void;
  readonly structured: string;
  readonly structuredDownloadUrl: string;
  readonly renderedImage: string | null;
  readonly imageError: boolean;
}) {
  return (
    <section aria-label="Annotation output" className="grid gap-related">
      <Tabs
        className="flex flex-wrap gap-related"
        label="Output format"
        value={props.output}
        options={[{ id: "structured", label: "Structured" }, { id: "image", label: "Image" }]}
        onValueChange={props.setOutput}
        tabId={(value) => `annotation-output-tab-${value}`}
        panelId={(value) => `annotation-output-panel-${value}`}
      />
      {props.output === "structured" ? (
        <div id="annotation-output-panel-structured" role="tabpanel" aria-labelledby="annotation-output-tab-structured" className="grid gap-related">
          <div className="flex flex-wrap gap-related">
            <Command label="Save state" onClick={props.onSave}><Save aria-hidden="true" size={16} /></Command>
            <Command label="Restore state" disabled={!props.canRestore} onClick={props.onRestore}><RotateCcw aria-hidden="true" size={16} /></Command>
            <a className={linkPresentation.action} download="annotation-request.json" href={props.structuredDownloadUrl}>Download JSON</a>
          </div>
          <CodeBlock
            className={styles.structuredOutput()}
            label="Annotation structured JSON"
            language="json"
            size="compact"
            source={props.structured}
            testId="annotation-structured-output"
          />
        </div>
      ) : props.renderedImage === null ? (
        <p id="annotation-output-panel-image" role="tabpanel" aria-labelledby="annotation-output-tab-image" className={classes("m-0", contentPresentation.caption)}>{props.imageError ? "이미지를 만들지 못했습니다." : "Rasterizing…"}</p>
      ) : (
        <div id="annotation-output-panel-image" role="tabpanel" aria-labelledby="annotation-output-tab-image" className="grid gap-related">
          <img data-testid="annotation-image-output" src={props.renderedImage} alt="원본과 annotation이 합성된 결과" className="block h-auto max-h-64 max-w-full" />
          <a className={linkPresentation.action} href={props.renderedImage} download="annotation-request.png">Download PNG</a>
        </div>
      )}
    </section>
  );
}
