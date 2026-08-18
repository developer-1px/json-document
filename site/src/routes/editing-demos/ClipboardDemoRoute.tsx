import { useState } from "react";
import { type BlockDocument, type DocumentClipboard } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditing } from "@interactive-os/json-document-react";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Copy this block" },
    { id: "bravo", text: "Paste after this block" },
    { id: "charlie", text: "The document receives cloned blocks" },
  ],
};

export function ClipboardDemoRoute() {
  const editor = useDocumentEditor(initialDocument);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [lastCall, setLastCall] = useState("블록을 선택한 뒤 copy 또는 cut을 실행합니다.");
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.blockId ?? null,
    onSelect: (blockId) => {
      editor.dispatch({ type: "selection.set", blockId });
      setLastCall(`dispatch({ type: "selection.set", blockId: "${blockId}" })`);
    },
    operationFromEvent: () => "replace",
  });
  const snapshot = editing.snapshot;

  function copy() {
    const payload = editor.copy();
    if (!payload) return;
    setClipboard(payload);
    setLastCall("editor.copy()");
  }

  function cut() {
    const result = editor.cut();
    if (!result) return;
    setClipboard(result.clipboard);
    setLastCall("editor.cut()");
  }

  function paste() {
    if (!clipboard) return;
    editor.dispatch({ type: "clipboard.paste", clipboard });
    setLastCall("dispatch({ type: \"clipboard.paste\", clipboard })");
  }

  return (
    <PageFrame>
      <PageHeader title="Clipboard Demo" illustration="braces">
        Selection에서 시작해 copy 또는 cut으로 구조화된 payload를 만들고 paste에 넘깁니다.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-input">
          <p className={ui.text.label}>1 · Selection</p>
          <h2 id="clipboard-input" className={classes("mb-2 mt-1", ui.text.heading)}>복사할 블록 선택하기</h2>
          <div className="grid gap-1">
            {(snapshot.value as BlockDocument).blocks.map((block) => (
              <SelectableItem
                key={block.id}
                type="button"
                selected={editing.getItem(block.id).getIsSelected()}
                focus={editing.getItem(block.id).getIsFocus()}
                className={classes("px-3 py-2", ui.surface.selectableBlock)}
                onClick={editing.getItem(block.id).getPressHandler()}
              >
                {block.text}
              </SelectableItem>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton onClick={copy}>Copy</ActionButton>
            <ActionButton onClick={cut}>Cut</ActionButton>
          </div>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-payload">
          <p className={ui.text.label}>2 · API와 payload</p>
          <h2 id="clipboard-payload" className={classes("mb-2 mt-1", ui.text.heading)}>{lastCall}</h2>
          <Inspector label="Inspect clipboard payload" items={[
            { label: "clipboard", value: clipboard, testId: "clipboard-demo-payload", size: "compact" },
          ]} />
          <ActionButton className="mt-3" kind="primary" onClick={paste} disabled={!clipboard}>payload 붙여넣기</ActionButton>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-result">
          <p className={ui.text.label}>3 · 결과</p>
          <h2 id="clipboard-result" className={classes("mb-2 mt-1", ui.text.heading)}>paste하면 복제한 블록을 commit합니다</h2>
          <Inspector label="Inspect paste result" items={[
            { label: "document.value", value: snapshot.value, testId: "clipboard-demo-document", size: "tall" },
            { label: "selection", value: snapshot.selection, testId: "clipboard-demo-selection", size: "compact" },
          ]} />
        </section>
      </div>
    </PageFrame>
  );
}
