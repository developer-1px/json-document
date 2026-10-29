import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Inspector } from "../../shared/ui/inspector";
import { Choice, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
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
      <div className="grid gap-group lg:grid-cols-3">
        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="selection-input">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>1 · 입력</p>
          <h2 id="selection-input" className={contentPresentation.itemTitle}>모드와 블록 선택하기</h2></div>
          <Choice presentation="inline" label="Selection mode" value={mode} options={(["replace", "extend", "toggle"] as const).map((item) => ({ id: item, label: item }))} onValueChange={setMode} />
          <div className="grid gap-related">
            {selectionLabDocument.blocks.map((block) => (
              <SelectableItem presentation="row"
                key={block.id}
                type="button"
                className={classes("px-related py-related", contentPresentation.itemSummary)}
                {...editingItemProps(editing.getItem(block.id))}
              >
                {block.id} · {block.text}
              </SelectableItem>
            ))}
          </div>
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="selection-call">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>2 · API 호출</p>
          <h2 id="selection-call" className={contentPresentation.itemTitle}>dispatch(intent)</h2></div>
          <Inspector label="Inspect API call" items={[
            { label: "intent", value: lastIntent, testId: "selection-demo-intent", size: "compact" },
            { label: "result", value: lastResult, testId: "selection-demo-result", size: "compact" },
          ]} />
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="selection-result">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>3 · 결과</p>
          <h2 id="selection-result" className={contentPresentation.itemTitle}>Selection만 바뀝니다</h2></div>
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
