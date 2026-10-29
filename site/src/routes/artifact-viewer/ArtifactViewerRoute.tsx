import {createJSONDocument} from "@interactive-os/json-document";
import {createTextEditor} from "@interactive-os/json-document-editing";
import {MarkdownEditingSurface} from "@interactive-os/json-document-markdown-react";
import { ToolbarSeparator } from "@interactive-os/json-document-ui-primitives-react";
import { fieldPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Command, Choice, contentInteractionAttributes, Field, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { ProductShell } from "@interactive-os/json-document-ui-primitives-react";
import { classes } from "../../shared/ui/styles";
import { artifactViewerRecipe } from "./artifact-viewer-styles";

type ArtifactKind = "md" | "ppt" | "sheet";
const styles = artifactViewerRecipe();

const artifacts: ReadonlyArray<{ kind: ArtifactKind; name: string; label: string }> = [
  { kind: "md", name: "launch-brief.md", label: "MD" },
  { kind: "ppt", name: "launch-story.ppt", label: "PPT" },
  { kind: "sheet", name: "launch-plan.sheet", label: "Sheet" },
];

export function ArtifactViewerRoute() {
  const [active, setActive] = useState<ArtifactKind>("md");
  const artifact = artifacts.find((candidate) => candidate.kind === active) ?? artifacts[0]!;

  return (
    <>
      <PageHeader title="Artifact · TBD" illustration="peek">
        Application 안에서 MD·PPT·Sheet를 다루는 visual prototype입니다. JSON Document와 Hands의 연결, 파일 호환성과 Undo/Redo는 아직 검증하지 않았습니다.
      </PageHeader>

      <ProductShell
        toolbarLabel="Artifact 선택"
        toolbar={(
          <>
            <Choice presentation="inline" label="Artifact 선택" value={active} options={artifacts.map((candidate) => ({ id: candidate.kind, label: candidate.label }))} onValueChange={setActive} />
            <ToolbarSeparator />
            <span className={contentPresentation.caption}>{artifact.name} · mock artifact</span>
            <Command label="Undo" disabled><Undo2 aria-hidden="true" size={16} /></Command>
          </>
        )}
        inspector={<Composer artifactName={artifact.name} />}
        canvasClassName={styles.canvas()}
      >
        {active === "md" ? <MarkdownArtifact /> : null}
        {active === "ppt" ? <PresentationArtifact /> : null}
        {active === "sheet" ? <SheetArtifact /> : null}
      </ProductShell>

      <section className={styles.futureMap()} aria-labelledby="viewer-model-title">
        <h2 id="viewer-model-title" className={contentPresentation.itemTitle}>목표와 완료 조건 · TBD</h2>
        <ol>
          <li><strong>현재</strong><span>한 Host chrome에서 콘텐츠 모양을 전환하는 시각 가설을 확인합니다.</span></li>
          <li><strong>목표</strong><span>Document Type과 Hands를 연결해 콘텐츠를 편집하고 선택·History를 복원합니다.</span></li>
          <li><strong>완료 증거</strong><span>정본 API·Usage·Source와 실제 편집·저장·다시 열기의 검증이 필요합니다. navigation과 workflow는 Application에 남습니다.</span></li>
        </ol>
      </section>
    </>
  );
}

function Composer({ artifactName }: { readonly artifactName: string }) {
  const [request, setRequest] = useState("");
  return (
    <section className={styles.composer()} aria-label="Composer mock">
      <div className={styles.context()} aria-label="Composer context">
        <span>@Agent</span>
        <span>#{artifactName}</span>
      </div>
      <Field label="Agent에게 이어서 요청" value={request} onValueChange={setRequest} className={fieldPresentation.standard} placeholder="이 artifact에서 무엇을 바꿀까요?" />
      <Command kind="primary" disabled>Send</Command>
      <p className={classes("col-span-full m-0", contentPresentation.caption)}>
        Composer와 Mention은 agent에게 지시와 artifact context를 건네는 Hands입니다.
      </p>
    </section>
  );
}

function MarkdownArtifact() {
  const [editor] = useState(() => createTextEditor(createJSONDocument({content: `## Artifacts should stay useful after generation.

The agent made the first draft. Keep writing—this is a document, not a frozen answer.

### What changes

- One shared artifact for the person and the agent
- Familiar editing hands instead of a bespoke product UI
- Every accepted change goes through the same Core`}), "/content"));
  return <MarkdownEditingSurface editor={editor} className={styles.document()} aria-label="Markdown artifact"/>;
}

function PresentationArtifact() {
  return (
    <div className={styles.presentation()} aria-label="Presentation artifact mock">
      <div className={styles.filmstrip()} aria-label="Slide filmstrip">
        {[1, 2, 3].map((number) => (
          <SelectableItem presentation="row" key={number} selected={number === 2} className={contentPresentation.itemSummary}>
            {number}
          </SelectableItem>
        ))}
      </div>
      <article className={styles.slide()}>
        <header className="grid content-start gap-related"><p className={contentPresentation.caption}>02 / 03 · FROM OUTPUT TO TOOL</p>
        <h2>Generation is only the first move.</h2></header>
        <div>
          <span>Agent creates</span><span>Human shapes</span><span>Together, it ships</span>
        </div>
      </article>
    </div>
  );
}

function SheetArtifact() {
  const cells = [
    ["Work", "Owner", "Status", "Week"],
    ["Artifact viewer", "Mina", "In progress", "W34"],
    ["Composer", "Agent", "Draft", "W35"],
    ["Mention", "Teo", "Review", "W35"],
    ["Core contract", "Team", "Ready", "W36"],
  ];
  return (
    <div className={styles.sheet()} aria-label="Spreadsheet artifact mock">
      <p className={classes("m-0 px-related py-1", contentPresentation.caption)}>fx&nbsp;&nbsp;=COUNTIF(C2:C5, “Ready”)</p>
      <div className={styles.grid()} role="grid" aria-label="Launch plan">
        {cells.flatMap((row, rowIndex) => row.map((cell, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            role={rowIndex === 0 ? "columnheader" : "gridcell"}
            className={classes(rowIndex === 0 ? contentPresentation.tableHead : contentPresentation.tableCell, styles.cell())}
            {...(rowIndex === 0 ? {} : contentInteractionAttributes({ role: "content", selected: rowIndex === 2 && columnIndex === 2 }))}
          >{cell}</div>
        )))}
      </div>
    </div>
  );
}
