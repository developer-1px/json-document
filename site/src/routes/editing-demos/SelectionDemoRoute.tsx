import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Inspector } from "../../shared/ui/inspector";
import { SegmentedControl, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";
import {
  collapsedRangeSelection,
  createMaterializedRangeSelectionFamily,
  type OrderedTopology,
} from "@interactive-os/json-document-selection";
import { selectionLabDocument, useSelectionLab } from "./useSelectionLab";

export function SelectionDemoRoute() {
  const { editing, lastIntent, lastResult, mode, setMode, snapshot } = useSelectionLab();
  const canonicalInitialSelection = collapsedRangeSelection({ blockId: selectionLabDocument.blocks[0]!.id, offset: 0 });
  const materializedFamily = createMaterializedRangeSelectionFamily<string>();
  const materializedTopology: OrderedTopology<string, string> = {
    equals: (left, right) => left === right,
    interval: (anchor, focus) => {
      const ids = selectionLabDocument.blocks.map((block) => block.id);
      const start = ids.indexOf(anchor);
      const end = ids.indexOf(focus);
      return start < 0 || end < 0 ? [] : ids.slice(Math.min(start, end), Math.max(start, end) + 1);
    },
    reconcilePoint: (point) => selectionLabDocument.blocks.some((block) => block.id === point) ? point : null,
  };
  const materializedSeed = materializedFamily.transition(
    { kind: "range", ranges: [], primaryIndex: null },
    { type: "collapse", point: selectionLabDocument.blocks[0]!.id },
    { topology: materializedTopology },
  ).state;

  return (
    <DemoPage documentation={(
      <PageHeader title="Selection Demo" illustration="cursor">
        Selection 입력을 dispatch한 뒤 바뀐 Selection을 그대로인 document.value와 History 옆에서 비교합니다.
      </PageHeader>

    )}>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="selection-input">
          <p className={ui.text.label}>1 · 입력</p>
          <h2 id="selection-input" className={classes("mb-2 mt-1", ui.text.heading)}>모드와 블록 선택하기</h2>
          <SegmentedControl className="mb-3" label="Selection mode" value={mode} options={(["replace", "extend", "toggle"] as const).map((item) => ({ id: item, label: item }))} onValueChange={setMode} />
          <div className="grid gap-1">
            {selectionLabDocument.blocks.map((block) => (
              <SelectableItem
                key={block.id}
                type="button"
                className={classes("px-3 py-2", ui.surface.selectableBlock)}
                {...editingItemProps(editing.getItem(block.id))}
              >
                {block.id} · {block.text}
              </SelectableItem>
            ))}
          </div>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="selection-call">
          <p className={ui.text.label}>2 · API 호출</p>
          <h2 id="selection-call" className={classes("mb-2 mt-1", ui.text.heading)}>dispatch(intent)</h2>
          <Inspector label="Inspect API call" items={[
            { label: "intent", value: lastIntent, testId: "selection-demo-intent", size: "compact" },
            { label: "result", value: lastResult, testId: "selection-demo-result", size: "compact" },
          ]} />
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="selection-result">
          <p className={ui.text.label}>3 · 결과</p>
          <h2 id="selection-result" className={classes("mb-2 mt-1", ui.text.heading)}>Selection만 바뀝니다</h2>
          <Inspector label="Inspect result state" items={[
            { label: "selection", value: snapshot.selection, testId: "selection-demo-selection", size: "compact" },
            { label: "selection family seed", value: canonicalInitialSelection, testId: "selection-demo-family", size: "compact" },
            { label: "materialized range", value: materializedSeed, testId: "selection-demo-materialized-range", size: "compact" },
            { label: "document.value", value: snapshot.value, testId: "selection-demo-document", size: "compact" },
            {
              label: "history",
              value: { canUndo: snapshot.canUndo, canRedo: snapshot.canRedo },
              testId: "selection-demo-history",
              size: "compact",
            },
          ]} />
        </section>
      </div>
    </DemoPage>
  );
}
