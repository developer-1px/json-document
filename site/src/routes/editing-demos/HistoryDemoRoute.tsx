import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
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
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="history-input">
          <p className={ui.text.label}>1 · 편집</p>
          <h2 id="history-input" className={classes("mb-2 mt-1", ui.text.heading)}>History 항목 하나 만들기</h2>
          <p className={classes("mt-0", ui.text.meta)}>
            편집은 bravo 블록의 offset 0에서 시작해 Selection을 offset 6으로 옮깁니다.
          </p>
          <div className="mb-3 grid gap-1">
            {document.blocks.map((block) => {
              const item = editing.getItem(block.id);
              return (
                <SelectableItem
                  key={block.id}
                  type="button"
                  className={classes("px-3 py-2", ui.surface.selectableBlock)}
                  {...editingItemProps(item)}
                >
                  {block.id} · {block.text}
                  {item.getTextOffset() === null ? "" : ` · offset ${item.getTextOffset()}`}
                </SelectableItem>
              );
            })}
          </div>
          <ActionButton data-kind="primary" onClick={edit}>편집 적용</ActionButton>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="history-call">
          <p className={ui.text.label}>2 · History API</p>
          <h2 id="history-call" className={classes("mb-2 mt-1", ui.text.heading)}>{lastCall}</h2>
          <div className="mb-3 flex gap-2">
            <ActionButton onClick={undo} disabled={commands.undo.disabled}>Undo</ActionButton>
            <ActionButton onClick={redo} disabled={commands.redo.disabled}>Redo</ActionButton>
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

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="history-result">
          <p className={ui.text.label}>3 · 복원된 상태</p>
          <h2 id="history-result" className={classes("mb-2 mt-1", ui.text.heading)}>document.value와 Selection이 함께 이동합니다</h2>
          <Inspector label="Inspect restored state" items={[
            { label: "document.value", value: snapshot.value, testId: "history-demo-document", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "history-demo-selection", size: "compact" },
          ]} />
        </section>
      </div>
    </DemoPage>
  );
}
