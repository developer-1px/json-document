import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Redo2, Undo2 } from "lucide-react";
import { Inspector } from "../../shared/ui/inspector";
import { Command, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";
import { useHistoryLab } from "./useHistoryLab";

export function HistoryDemoRoute() {
  const { commands, document, edit, editing, lastCall, redo, snapshot, undo } = useHistoryLab();

  return (
    <DemoPage documentation={(
      <PageHeader title="History Demo" illustration="cursor">
        편집을 한 번 commit하고, 만들어진 History 항목으로 document.value와 Selection을 함께 복원합니다.
      </PageHeader>

    )}>
      <div className="grid gap-group lg:grid-cols-3">
        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="history-input">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>1 · 편집</p>
          <h2 id="history-input" className={contentPresentation.itemTitle}>History 항목 하나 만들기</h2>
          <p className={classes("mt-0", contentPresentation.caption)}>
            편집은 bravo 블록의 offset 0에서 시작해 Selection을 offset 6으로 옮깁니다.
          </p></div>
          <div className="grid gap-related">
            {document.blocks.map((block) => {
              const item = editing.getItem(block.id);
              return (
                <SelectableItem presentation="row"
                  key={block.id}
                  type="button"
                  className={classes("px-related py-related", contentPresentation.itemSummary)}
                  {...editingItemProps(item)}
                >
                  {block.id} · {block.text}
                  {item.getTextOffset() === null ? "" : ` · offset ${item.getTextOffset()}`}
                </SelectableItem>
              );
            })}
          </div>
          <Command kind="primary" onClick={edit}>편집 적용</Command>
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="history-call">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>2 · History API</p>
          <h2 id="history-call" className={contentPresentation.itemTitle}>{lastCall}</h2></div>
          <div className="flex gap-related">
            <Command label="Undo" onClick={undo} disabled={commands.undo.disabled}><Undo2 aria-hidden="true" size={16} /></Command>
            <Command label="Redo" onClick={redo} disabled={commands.redo.disabled}><Redo2 aria-hidden="true" size={16} /></Command>
          </div>
          <Inspector label="Inspect history state" items={[
            {
              label: "history",
              value: { canUndo: snapshot.canUndo, canRedo: snapshot.canRedo },
              testId: "history-demo-status",
              size: "compact",
            },
          ]} />
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="history-result">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>3 · 복원된 상태</p>
          <h2 id="history-result" className={contentPresentation.itemTitle}>document.value와 Selection이 함께 이동합니다</h2></div>
          <Inspector label="Inspect restored state" items={[
            { label: "document.value", value: snapshot.value, testId: "history-demo-document", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "history-demo-selection", size: "compact" },
          ]} />
        </section>
      </div>
    </DemoPage>
  );
}
