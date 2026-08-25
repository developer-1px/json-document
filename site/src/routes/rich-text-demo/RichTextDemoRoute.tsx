import { useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { createJSONDocument } from "@interactive-os/json-document";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createRichTextEditor,
  type RichTextDocument,
  type RichTextPoint,
} from "@interactive-os/json-document-rich-text";
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";
import { historyAffordance } from "@interactive-os/json-document-affordance";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { ActionButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { richTextRecipe } from "./rich-text-styles";
import { collectRichTextDemoNodeIds, findRichTextDemoTextNode } from "./richTextDemoQuery";
import { useRichTextDemoCommands } from "./useRichTextDemoCommands";

const richTextStyles = richTextRecipe();

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
      const text = findRichTextDemoTextNode(document, nodeId);
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
  const commands = historyAffordance(snapshot).hand;

  const {
    applySampleIntent,
    insertHardBreak,
    lastAction,
    lastPatch,
    onSurfaceAction,
    runHistory,
    setHeading,
    toggleStrong,
    updateCodeAttrs,
  } = useRichTextDemoCommands(editor);
  return (
    <DemoPage documentation={(
      <PageHeader
        label="Draft reference implementation"
        title="Rich Text Lab"
        illustration="patch"
        aside={<div className={ui.text.meta}>revision {snapshot.revision} · {commands.undo.disabled ? "clean" : "undo ready"}</div>}
      >
        DOM은 입력 경계일 뿐입니다. 아래 편집은 Rich Text intent, Selection mapping, EditingSession과 atomic JSON Patch를 차례로 통과합니다.
      </PageHeader>

    )}>
      <div className={classes("mb-3 flex flex-wrap items-center gap-2 p-2", ui.surface.workspace)} role="toolbar" aria-label="Rich Text history">
        <ActionButton data-kind="primary" onClick={applySampleIntent}>Apply sample intent</ActionButton>
        <ActionButton onClick={() => runHistory("undo")} disabled={commands.undo.disabled}>Undo</ActionButton>
        <ActionButton onClick={() => runHistory("redo")} disabled={commands.redo.disabled}>Redo</ActionButton>
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
            className={classes(richTextStyles.editor(), ui.state.focus)}
          />
          <ol className="mt-3 m-0 grid list-none gap-1 p-0" aria-label="Rich Text blocks">
            {(snapshot.value as RichTextDocument).content.map((block) => {
              const ids = collectRichTextDemoNodeIds(block);
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
    </DemoPage>
  );
}
