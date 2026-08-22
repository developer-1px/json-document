import { useState } from "react";
import { ActionButton, SelectableItem, ToggleButton } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { artifactViewerStyles as styles } from "./artifact-viewer-styles";

type ArtifactKind = "md" | "ppt" | "sheet";

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
      <PageHeader label="Artifact · Prototype" title="최종 계층의 계약을 먼저 검증합니다." illustration="peek">
        실제 파일 호환보다 먼저, 서로 다른 artifact surface가 같은 Core와 Hands를 조합하는 방식을 기록합니다.
      </PageHeader>

      <ProductApp
        toolbarLabel="Artifact 선택"
        toolbar={(
          <>
            {artifacts.map((candidate) => (
              <ToggleButton
                key={candidate.kind}
                pressed={candidate.kind === active}
                onClick={() => setActive(candidate.kind)}
              >
                {candidate.label}
              </ToggleButton>
            ))}
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <span className={ui.text.meta}>{artifact.name} · mock artifact</span>
            <ActionButton className="ml-auto">Undo</ActionButton>
          </>
        )}
        inspector={<Composer artifactName={artifact.name} />}
        canvasClassName={styles.canvas}
      >
        {active === "md" ? <MarkdownArtifact /> : null}
        {active === "ppt" ? <PresentationArtifact /> : null}
        {active === "sheet" ? <SheetArtifact /> : null}
      </ProductApp>

      <section className={styles.futureMap} aria-labelledby="viewer-model-title">
        <p className={ui.text.label}>Dependency map</p>
        <h2 id="viewer-model-title" className={ui.text.section}>Core에서 시작해 Hands를 거쳐 Artifact가 됩니다.</h2>
        <ol>
          <li><strong>Core</strong><span>사람과 agent의 변경을 같은 계약에 남깁니다.</span></li>
          <li><strong>Hands</strong><span>사람에게 익숙한 편집 도구를 붙입니다.</span></li>
          <li><strong>Artifact</strong><span>적절한 surface에서 완성된 경험이 됩니다.</span></li>
        </ol>
      </section>
    </>
  );
}

function Composer({ artifactName }: { readonly artifactName: string }) {
  return (
    <section className={styles.composer} aria-label="Composer mock">
      <div className={styles.context} aria-label="Composer context">
        <span>@Agent</span>
        <span>#{artifactName}</span>
      </div>
      <label className="sr-only" htmlFor="artifact-composer">Agent에게 이어서 요청</label>
      <input id="artifact-composer" className={ui.field.control} placeholder="이 artifact에서 무엇을 바꿀까요?" />
      <ActionButton kind="primary">Send</ActionButton>
      <p className={classes("col-span-full m-0", ui.text.meta)}>
        Composer와 Mention은 agent에게 지시와 artifact context를 건네는 Hands입니다.
      </p>
    </section>
  );
}

function MarkdownArtifact() {
  return (
    <article className={styles.document} aria-label="Markdown artifact mock">
      <p className={ui.text.label}>LAUNCH BRIEF · AUGUST 2026</p>
      <h2 contentEditable suppressContentEditableWarning>Artifacts should stay useful after generation.</h2>
      <p contentEditable suppressContentEditableWarning>
        The agent made the first draft. Keep writing—this is a document, not a frozen answer.
      </p>
      <h3 className={ui.text.heading}>What changes</h3>
      <ul>
        <li>One shared artifact for the person and the agent</li>
        <li>Familiar editing hands instead of a bespoke product UI</li>
        <li>Every accepted change goes through the same Core</li>
      </ul>
    </article>
  );
}

function PresentationArtifact() {
  return (
    <div className={styles.presentation} aria-label="Presentation artifact mock">
      <div className={styles.filmstrip} aria-label="Slide filmstrip">
        {[1, 2, 3].map((number) => (
          <SelectableItem key={number} selected={number === 2} className={ui.surface.selectableBlock}>
            {number}
          </SelectableItem>
        ))}
      </div>
      <article className={styles.slide}>
        <p className={ui.text.label}>02 / 03 · FROM OUTPUT TO TOOL</p>
        <h2>Generation is only the first move.</h2>
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
    <div className={styles.sheet} aria-label="Spreadsheet artifact mock">
      <p className={classes("m-0 px-2 py-1", ui.text.meta)}>fx&nbsp;&nbsp;=COUNTIF(C2:C5, “Ready”)</p>
      <div className={styles.grid} role="grid" aria-label="Launch plan">
        {cells.flatMap((row, rowIndex) => row.map((cell, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            role={rowIndex === 0 ? "columnheader" : "gridcell"}
            className={classes(
              rowIndex === 0 ? ui.surface.gridHead : ui.surface.gridCell,
              rowIndex === 2 && columnIndex === 2 && ui.surface.previewSelected,
              styles.cell,
            )}
          >{cell}</div>
        )))}
      </div>
    </div>
  );
}
