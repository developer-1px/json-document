import { useState } from "react";
import { type BlockDocument, type DocumentIntent } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditing } from "@interactive-os/json-document-react";
import { Inspector } from "../../shared/ui/inspector";
import { SelectableItem, ToggleButton } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Anchor" },
    { id: "bravo", text: "Middle" },
    { id: "charlie", text: "Focus" },
  ],
};

export function SelectionDemoRoute() {
  const editor = useDocumentEditor(initialDocument);
  const [mode, setMode] = useState<"replace" | "extend" | "toggle">("replace");
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: boolean; readonly code?: string } | null>(null);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.blockId ?? null,
    onSelect: (blockId, nextMode) => {
      const intent: DocumentIntent = { type: "selection.set", blockId, mode: nextMode };
      const result = editor.dispatch(intent);
      setLastIntent(intent);
      setLastResult(result.ok ? { ok: true } : { ok: false, code: result.code });
    },
    operationFromEvent: () => mode,
  });
  const snapshot = editing.snapshot;

  return (
    <PageFrame>
      <PageHeader title="Selection Demo" illustration="cursor">
        Selection 입력을 dispatch한 뒤 바뀐 Selection을 그대로인 document.value와 History 옆에서 비교합니다.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="selection-input">
          <p className={ui.text.label}>1 · 입력</p>
          <h2 id="selection-input" className={classes("mb-2 mt-1", ui.text.heading)}>모드와 블록 선택하기</h2>
          <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Selection mode">
            {(["replace", "extend", "toggle"] as const).map((item) => (
              <ToggleButton
                key={item}
                pressed={mode === item}
                className="px-3 py-1.5"
                onClick={() => setMode(item)}
              >
                {item}
              </ToggleButton>
            ))}
          </div>
          <div className="grid gap-1">
            {initialDocument.blocks.map((block) => (
              <SelectableItem
                key={block.id}
                type="button"
                selected={editing.getItem(block.id).getIsSelected()}
                focus={editing.getItem(block.id).getIsFocus()}
                className={classes("px-3 py-2", ui.surface.selectableBlock)}
                onClick={editing.getItem(block.id).getPressHandler()}
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
    </PageFrame>
  );
}
