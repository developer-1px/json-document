import { useState } from "react";
import {
  type BlockDocument,
  type DocumentClipboard,
  type DocumentIntent,
  type DocumentSelection,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditingSnapshot } from "@interactive-os/json-document-react";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { Button } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "document", text: "JSON Document가 이 값을 가집니다." },
    { id: "selection", text: "고르면 선택만 바뀌고 history는 생기지 않습니다." },
    { id: "clipboard", text: "고른 블록이 구조화된 Clipboard가 됩니다." },
  ],
};

export function ConceptsLab() {
  const editor = useDocumentEditor(initialDocument);
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as BlockDocument;
  const selected = new Set(editor.selectedBlockIds);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [notice, setNotice] = useState("블록을 고르고 복사, 잘라내기, 실행 취소를 눌러 보세요.");
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const [lastResult, setLastResult] = useState<Pick<EditingResult<DocumentSelection>, "ok"> & { readonly code?: string } | null>(null);

  function rememberDispatch(intent: DocumentIntent, result: EditingResult<DocumentSelection>) {
    setLastIntent(intent);
    setLastResult(result.ok ? { ok: true } : { ok: false, code: result.code });
  }

  function select(blockId: string) {
    const intent = { type: "selection.set" as const, blockId };
    const result = editor.dispatch(intent);
    rememberDispatch(intent, result);
    setNotice(result.ok ? `Selection: ${blockId}. history 항목은 늘지 않았습니다.` : result.code);
  }

  function copySelection() {
    const next = editor.copy();
    if (!next) {
      setNotice("먼저 블록을 고르세요.");
      return;
    }
    setClipboard(next);
    setNotice(`Clipboard에 블록 ${next.blocks.length}개. 문서는 그대로입니다.`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) {
      setNotice("먼저 블록을 고르세요.");
      return;
    }
    setClipboard(result.clipboard);
    setNotice(result.result.ok
      ? "잘라냈습니다. History가 문서와 선택을 같이 기억합니다."
      : result.result.code);
  }

  function pasteClipboard() {
    if (!clipboard) {
      setNotice("먼저 복사하거나 잘라내세요.");
      return;
    }
    const intent = { type: "clipboard.paste" as const, clipboard };
    const result = editor.dispatch(intent);
    rememberDispatch(intent, result);
    setNotice(result.ok ? "Clipboard를 문서에 붙여 넣었습니다." : result.code);
  }

  function undo() {
    const result = editor.undo();
    setNotice(result.ok ? "History가 값과 선택을 같이 되돌렸습니다." : "되돌릴 History가 없습니다.");
  }

  function redo() {
    const result = editor.redo();
    setNotice(result.ok ? "History가 다시 적용했습니다." : "다시 적용할 History가 없습니다.");
  }

  return (
    <aside className={classes("grid gap-3 p-4", ui.surface.raised)} aria-label="같은 문서 위의 개념">
      <div>
        <p className={ui.text.label}>Live editing</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>편집이 붙은 문서</h2>
        <p className={classes("m-0", ui.text.meta)}>
          아래 JSON은 읽기 층입니다. 고르기·복사·실행 취소는 편집 층입니다.
          이 패널이 다시 그려지는 것은 React Connector입니다.
        </p>
      </div>

      <ol className={classes("m-0 grid list-none gap-1 p-0", ui.surface.inset)}>
        {document.blocks.map((block) => (
          <li key={block.id}>
            <button
              type="button"
              aria-pressed={selected.has(block.id)}
              className={classes("w-full px-3 py-2 text-left", ui.action.toggle)}
              onClick={() => select(block.id)}
            >
              {block.text}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copySelection}>복사</Button>
        <Button onClick={cutSelection}>잘라내기</Button>
        <Button onClick={pasteClipboard}>붙여넣기</Button>
        <Button onClick={undo} disabled={!snapshot.canUndo}>실행 취소</Button>
        <Button onClick={redo} disabled={!snapshot.canRedo}>다시 실행</Button>
      </div>

      <p className={classes("m-0", ui.text.meta)} data-testid="concepts-notice">
        {notice}
      </p>

      <JsonInspector
        label="document.value"
        testId="concepts-document-json"
        value={document}
        size="compact"
        meta={`undo ${snapshot.canUndo ? "on" : "off"} · redo ${snapshot.canRedo ? "on" : "off"}`}
      />
      <JsonInspector
        label="intent"
        testId="concepts-intent-json"
        value={lastIntent}
        size="compact"
        meta={lastIntent ? lastIntent.type : "dispatch만 여기를 바꿉니다"}
      />
      <JsonInspector
        label="result"
        testId="concepts-result-json"
        value={lastResult}
        size="compact"
        meta={lastResult?.ok === false ? lastResult.code : lastResult?.ok ? "ok" : "아직 없음"}
      />
      <JsonInspector
        label="clipboard"
        testId="concepts-clipboard-json"
        value={clipboard}
        size="compact"
      />
    </aside>
  );
}
