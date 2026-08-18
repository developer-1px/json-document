import { useCallback, useState } from "react";
import { createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createRichTextEditor,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
  type RichTextPoint,
  type RichTextText,
} from "@interactive-os/json-document-rich-text";
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { richTextStyles } from "./rich-text-styles";

const initialDocument: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1",
  id: "rich-text-demo",
  type: "doc",
  content: [
    {
      id: "heading-1",
      type: "heading",
      attrs: { level: 2 },
      content: [{
        id: "text-heading",
        type: "text",
        text: "Canonical Rich Text",
        marks: [{ type: "strong" }],
      }],
    },
    {
      id: "paragraph-1",
      type: "paragraph",
      content: [
        { id: "text-lead", type: "text", text: "이 문장은 ", marks: [] },
        { id: "text-emphasis", type: "text", text: "JSONDocument", marks: [{ type: "emphasis" }] },
        { id: "text-tail", type: "text", text: "의 canonical JSON입니다.", marks: [] },
      ],
    },
    {
      id: "paragraph-2",
      type: "paragraph",
      content: [{
        id: "text-editable",
        type: "text",
        text: "여기를 선택하고 직접 입력해 보세요.",
        marks: [],
      }],
    },
    {
      id: "blockquote-1",
      type: "blockquote",
      content: [{
        id: "quote-paragraph",
        type: "paragraph",
        content: [
          { id: "quote-text", type: "text", text: "Blockquote와 ", marks: [] },
          { id: "quote-code", type: "text", text: "inline code", marks: [{ type: "code" }] },
          { id: "quote-break", type: "hardBreak" },
          { id: "quote-link", type: "text", text: "안전한 링크", marks: [{ type: "link", attrs: { href: "#canonical-json" } }] },
        ],
      }],
    },
    {
      id: "code-block-1",
      type: "codeBlock",
      attrs: { language: "json" },
      content: [{ id: "code-text", type: "text", text: '{ "canonical": true }', marks: [] }],
    },
    {
      id: "ordered-list-1",
      type: "orderedList",
      attrs: { start: 2 },
      content: [{
        id: "list-item-1",
        type: "listItem",
        content: [{
          id: "list-paragraph-1",
          type: "paragraph",
          content: [{ id: "list-text-1", type: "text", text: "stable node identity", marks: [{ type: "underline" }] }],
        }],
      }],
    },
    {
      id: "bullet-list-1",
      type: "bulletList",
      content: [{
        id: "bullet-item-1",
        type: "listItem",
        content: [{
          id: "bullet-paragraph-1",
          type: "paragraph",
          content: [{ id: "bullet-text-1", type: "text", text: "schema-aware transforms", marks: [{ type: "strikethrough" }] }],
        }],
      }],
    },
  ],
};

export function RichTextDemoRoute() {
  const [editor] = useState(() => createRichTextEditor({ document: createJSONDocument(initialDocument) }));
  const [lastPatch, setLastPatch] = useState<ReadonlyArray<JSONPatchOperation>>([]);
  const [lastAction, setLastAction] = useState("selection.ready");
  const document = editor.snapshot.value as RichTextDocument;
  const primary = editor.snapshot.selection.primaryIndex === null
    ? null
    : editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex] ?? null;
  const interval = primary === null ? [] : editor.topology.interval(primary.anchor, primary.focus);
  const focus = primary?.focus ?? null;
  const editing = useEditing({
    source: editor,
    selectedKeys: interval.map((target) => target.nodeId),
    focusKey: focus?.nodeId ?? null,
    textOffset: focus?.kind === "text" ? focus.offset : null,
    onSelect: (nodeId) => {
      const text = findTextNode(document, nodeId);
      const point: RichTextPoint = text
        ? { kind: "text", nodeId, offset: 0, affinity: "forward" }
        : { kind: "child", nodeId, offset: 0, affinity: "forward" };
      editor.dispatch({
        type: "selection.set",
        selection: { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 },
      });
    },
  });
  const snapshot = editing.snapshot;

  const onSurfaceAction = useCallback((action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => {
    setLastAction(action);
    if (result?.ok && result.change) setLastPatch(result.change.applied);
  }, []);

  function remember(action: string, result: ReturnType<RichTextEditor["dispatch"]>) {
    setLastAction(result.ok ? action : result.code);
    if (result.ok && result.change) setLastPatch(result.change.applied);
    return result;
  }

  function runHistory(direction: "undo" | "redo") {
    const result = direction === "undo" ? editor.undo() : editor.redo();
    setLastAction(result.ok ? direction : result.code);
    if (result.ok && result.change) setLastPatch(result.change.applied);
  }

  function applySampleIntent() {
    const text = findTextNode(snapshot.value as RichTextDocument, "text-editable");
    if (!text) return setLastAction("rich-text.point-not-found");
    const point: RichTextPoint = {
      kind: "text",
      nodeId: text.id,
      offset: text.text.length,
      affinity: "forward",
    };
    editor.dispatch({
      type: "selection.set",
      selection: { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 },
    });
    remember("text.insert", editor.dispatch({ type: "text.insert", text: " ✓" }));
  }

  function selectText(nodeId: string, from: number, to: number) {
    const anchor: RichTextPoint = { kind: "text", nodeId, offset: from, affinity: "forward" };
    const focus: RichTextPoint = { kind: "text", nodeId, offset: to, affinity: "forward" };
    editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor, focus }], primaryIndex: 0 } });
  }

  function toggleStrong() {
    selectText("text-editable", 0, 3);
    remember("mark.toggle:strong", editor.dispatch({ type: "mark.toggle", mark: { type: "strong" } }));
  }

  function setHeading() {
    selectText("text-editable", 0, 0);
    remember("block.set-type:heading", editor.dispatch({ type: "block.set-type", nodeType: "heading", attrs: { level: 3 } }));
  }

  function insertHardBreak() {
    remember("node.insert:hardBreak", editor.dispatch({
      type: "node.insert",
      point: { kind: "child", nodeId: "paragraph-2", offset: 1, affinity: "forward" },
      node: { id: "demo-hard-break", type: "hardBreak" },
    }));
  }

  function updateCodeAttrs() {
    remember("node.set-attrs", editor.dispatch({ type: "node.set-attrs", nodeId: "code-block-1", attrs: { language: "typescript" } }));
  }

  return (
    <PageFrame>
      <PageHeader
        label="Draft reference implementation"
        title="Rich Text Lab"
        illustration="patch"
        aside={<div className={ui.text.meta}>revision {snapshot.revision} · {snapshot.canUndo ? "undo ready" : "clean"}</div>}
      >
        DOM은 입력 경계일 뿐입니다. 아래 편집은 Rich Text intent, Selection mapping, EditingSession과 atomic JSON Patch를 차례로 통과합니다.
      </PageHeader>

      <div className={classes("mb-3 flex flex-wrap items-center gap-2 p-2", ui.surface.workspace)} role="toolbar" aria-label="Rich Text history">
        <ActionButton kind="primary" onClick={applySampleIntent}>Apply sample intent</ActionButton>
        <ActionButton onClick={() => runHistory("undo")} disabled={!snapshot.canUndo}>Undo</ActionButton>
        <ActionButton onClick={() => runHistory("redo")} disabled={!snapshot.canRedo}>Redo</ActionButton>
        <span className={classes("ml-auto", ui.text.meta)} aria-live="polite">last: {lastAction}</span>
      </div>

      <div className={classes("mb-3 flex flex-wrap items-center gap-2 p-2", ui.surface.workspace)} role="group" aria-label="Official Rich Text intent proofs">
        <span className={ui.text.meta}>Schema-aware intent proofs</span>
        <ActionButton onClick={toggleStrong}>Toggle strong</ActionButton>
        <ActionButton onClick={setHeading}>Set heading</ActionButton>
        <ActionButton onClick={insertHardBreak}>Insert hard break</ActionButton>
        <ActionButton onClick={updateCodeAttrs}>Set code attrs</ActionButton>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="rich-text-surface-label">
          <p className={ui.text.label}>Official semantic rendering + editable DOM lease</p>
          <h2 id="rich-text-surface-label" className={classes("mb-3 mt-1", ui.text.heading)}>Canonical document</h2>
          <RichTextEditorSurface
            editor={editor}
            onAction={onSurfaceAction}
            spellCheck={false}
            aria-label="Rich Text 편집기"
            data-testid="rich-text-editor"
            className={classes(richTextStyles.editor, ui.state.focus)}
          />
          <ol className="mt-3 m-0 grid list-none gap-1 p-0" aria-label="Rich Text blocks">
            {(snapshot.value as RichTextDocument).content.map((block) => {
              const ids = collectNodeIds(block);
              const selected = ids.some((id) => editing.getItem(id).getIsSelected());
              const focused = ids.some((id) => editing.getItem(id).getIsFocus());
              const offset = ids
                .map((id) => editing.getItem(id).getTextOffset())
                .find((value) => value !== null) ?? null;
              return (
                <li key={block.id}>
                  <SelectableItem
                    type="button"
                    selected={selected}
                    focus={focused}
                    className={classes("w-full px-3 py-2", ui.surface.selectableBlock)}
                    onClick={editing.getItem(block.id).getPressHandler()}
                  >
                    {block.type} · {block.id}
                    {offset === null ? "" : ` · offset ${offset}`}
                  </SelectableItem>
                </li>
              );
            })}
          </ol>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            입력·삭제, Enter block split, IME composition, DOM Selection 복원, structured/HTML/plain Clipboard와 undo/redo가 모두 Official Rich Text intent 경로에 연결됩니다.
          </p>
        </section>

        <section className="grid min-w-0 gap-3" aria-label="Rich Text state inspectors">
          <JsonInspector
            label="Canonical JSON"
            meta="JSONDocument.value"
            value={snapshot.value}
            testId="rich-text-document-json"
            size="tall"
          />
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <JsonInspector
              label="Selection + Topology"
              meta="RangeSelection / logical interval"
              value={{ selection: snapshot.selection, interval }}
              testId="rich-text-selection-json"
              size="standard"
            />
            <JsonInspector
              label="Applied JSON Patch"
              meta={lastAction}
              value={lastPatch}
              testId="rich-text-patch-json"
              size="standard"
            />
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

function findTextNode(node: RichTextDocument | RichTextNode, id: string): RichTextText | null {
  if (node.type === "text") return node.id === id ? node as RichTextText : null;
  if (!("content" in node) || !Array.isArray(node.content)) return null;
  for (const child of node.content) {
    const found = findTextNode(child as RichTextNode, id);
    if (found) return found;
  }
  return null;
}

function collectNodeIds(node: RichTextDocument | RichTextNode): string[] {
  const ids = [node.id];
  if (!("content" in node) || !Array.isArray(node.content)) return ids;
  return ids.concat(node.content.flatMap((child) => collectNodeIds(child as RichTextNode)));
}
