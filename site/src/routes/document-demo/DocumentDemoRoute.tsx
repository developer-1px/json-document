import { useRef, useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  type BlockDocument,
  type DocumentClipboard,
  type DocumentIntent,
  type DocumentSelection,
  type EditingResult,
  documentSelectionFocus,
} from "@interactive-os/json-document-editing";
import {
  DocumentTextControl,
  useDocumentEditor,
  useEditing,
  useEditingObservation,
} from "@interactive-os/json-document-react";
import {
  createWebClipboardSurface,
  createWebClipboardTextWriter,
  documentClipboardCodec,
  lineBoundary,
  moveLinePoint,
} from "@interactive-os/json-document-web";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "welcome", text: "A minimal document that still behaves like an editor." },
    { id: "select", text: "Shift-click for a range. Mod-click for multiple blocks." },
    { id: "clipboard", text: "Copy, cut, paste, move, duplicate, undo, and redo all preserve selection." },
    { id: "json", text: "Every interaction commits to the canonical JSON shown beside the document." },
  ],
};

const clipboardTextWriter = createWebClipboardTextWriter();

export function DocumentDemoRoute() {
  const editor = useDocumentEditor(initialDocument);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const observation = useEditingObservation<DocumentIntent>("Ready");
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
    onResult(result) {
      if (!result.ok) return observation.announce(result.code);
      if (result.operation === "paste") {
        observation.observe({ type: "clipboard.paste", clipboard: result.payload }, result.result);
      } else {
        setClipboard(result.payload);
      }
      const verb = result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted";
      observation.announce(`${verb} ${result.payload.blocks.length} structured block${result.payload.blocks.length === 1 ? "" : "s"}`);
    },
  }));
  const [lastClickCount, setLastClickCount] = useState(0);
  const surfaceRef = useRef<HTMLDivElement>(null);

  function remember(intent: DocumentIntent, result: EditingResult<DocumentSelection>) {
    return observation.observe(intent, result);
  }

  function dispatchIntent(intent: DocumentIntent) {
    return remember(intent, editor.dispatch(intent));
  }

  function run(action: () => { readonly ok: boolean }, message: string) {
    return observation.run(action, message, "That action is not available here");
  }

  const focus = documentSelectionFocus(editor.snapshot.selection);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: focus?.blockId ?? null,
    textOffset: focus?.offset ?? null,
    onSelect: (blockId, mode) => {
      run(() => dispatchIntent({ type: "selection.set", blockId, mode }), "Selection changed");
    },
    ignorePress: (event) => event.target instanceof Element && event.target.closest("textarea") !== null,
    keyboard: {
      resolve: (stroke) => editingCommandFromWebKeyboardStroke(stroke),
      focusKey: () => editor.selectedBlockIds.at(-1),
      neighbor: (key, command) => {
        const ids = (editor.snapshot.value as BlockDocument).blocks.map((block) => block.id);
        return command.type === "move"
          ? moveLinePoint(ids, key, command.direction)
          : lineBoundary(ids, command.edge);
      },
      onDelete: () => {
        run(() => dispatchIntent({ type: "selection.remove" }), "Selection deleted");
      },
      onUndo: () => {
        run(() => editor.undo(), "Undone");
      },
      onRedo: () => {
        run(() => editor.redo(), "Redone");
      },
      text: {
        offset: () => documentSelectionFocus(editor.snapshot.selection)?.offset ?? 0,
        length: () => {
          const blockId = documentSelectionFocus(editor.snapshot.selection)?.blockId;
          const block = (editor.snapshot.value as BlockDocument).blocks.find((item) => item.id === blockId);
          return block?.text.length ?? 0;
        },
        onOffset: (offset, mode) => {
          const blockId = documentSelectionFocus(editor.snapshot.selection)?.blockId;
          if (!blockId) return;
          run(() => dispatchIntent({ type: "selection.set", blockId, mode, offset }), "Selection changed");
        },
      },
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as BlockDocument;
  const commands = historyAffordance(snapshot).hand;

  function copySelection() {
    const next = editor.copy();
    if (!next) return observation.announce("Select a block first");
    setClipboard(next);
    void writeClipboardText(next.text);
    observation.announce(`Copied ${next.blocks.length} block${next.blocks.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) return observation.announce("Select a block first");
    setClipboard(result.clipboard);
    void writeClipboardText(result.clipboard.text);
    observation.announce(`Cut ${result.clipboard.blocks.length} block${result.clipboard.blocks.length === 1 ? "" : "s"}`);
  }

  function pasteSelection() {
    if (!clipboard) return observation.announce("Copy or cut blocks first");
    run(() => dispatchIntent({ type: "clipboard.paste", clipboard }), `Pasted ${clipboard.blocks.length} block${clipboard.blocks.length === 1 ? "" : "s"}`);
  }

  async function writeClipboardText(text: string) {
    const result = await clipboardTextWriter.writeText(text);
    if (!result.ok) observation.announce(result.reason ?? result.code);
  }

  const lastSelectedId = editor.selectedBlockIds.at(-1);

  return (
    <DemoPage documentation={(
        <PageHeader
          illustration="clipboard"
          title="Document"
          aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedBlockIds.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{observation.announcement}</div>
            <div data-testid="document-click-count">click count {lastClickCount}</div>
          </div>
          )}
        >A deliberately small interface for selection, clipboard, history, keyboard input, and canonical JSON publication.</PageHeader>

    )}>
        <ProductApp
          toolbarLabel="Document actions"
          toolbar={(
            <>
              <Action label="Add" onClick={() => run(() => dispatchIntent({ type: "block.insert", afterId: lastSelectedId, text: "New block" }), "Block added")} />
              <Action label="Duplicate" onClick={() => run(() => dispatchIntent({ type: "selection.duplicate" }), "Selection duplicated")} />
              <Action label="Move up" onClick={() => run(() => dispatchIntent({ type: "selection.move", direction: -1 }), "Selection moved up")} />
              <Action label="Move down" onClick={() => run(() => dispatchIntent({ type: "selection.move", direction: 1 }), "Selection moved down")} />
              <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
              <Action label="Copy" onClick={copySelection} />
              <Action label="Cut" onClick={cutSelection} />
              <Action label="Paste" onClick={pasteSelection} disabled={!clipboard} />
              <Action label="Delete" onClick={() => run(() => dispatchIntent({ type: "selection.remove" }), "Selection deleted")} />
              <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
              <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={commands.undo.disabled} />
              <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={commands.redo.disabled} />
            </>
          )}
          inspector={(
            <Inspector placement="inline" items={[
              {
                label: "Canonical JSON",
                meta: "JSON Patch document",
                value: snapshot.value,
                testId: "canonical-json",
                size: "tall",
              },
              {
                label: "intent",
                meta: observation.lastIntent ? observation.lastIntent.type : "dispatch only",
                value: observation.lastIntent,
                testId: "document-intent-json",
                size: "compact",
              },
              {
                label: "result",
                meta: observation.lastResult?.ok === false ? observation.lastResult.code : observation.lastResult?.ok ? "ok" : "none yet",
                value: observation.lastResult,
                testId: "document-result-json",
                size: "compact",
              },
            ]} />
          )}
        >
          <section aria-label="Editable document">
            <div
              ref={surfaceRef}
              tabIndex={0}
              {...clipboardSurface}
              onKeyDown={editing.getKeyDownHandler()}
              className={ui.state.focus}
            >
              {document.blocks.length === 0 ? (
                <ActionButton kind="primary" className="p-8" onClick={() => run(() => dispatchIntent({ type: "block.insert", text: "New block" }), "Block added")}>Add the first block</ActionButton>
              ) : document.blocks.map((block, index) => {
                const item = editing.getItem(block.id);
                return (
                <SelectableItem
                  as="article"
                  key={block.id}
                  data-block-id={block.id}
                  className={classes("group grid grid-cols-[2rem_minmax(0,1fr)]", ui.surface.documentBlock)}
                  {...optionProps(item)}
                >
                  <ActionButton
                    aria-label={`Select block ${index + 1}`}
                    className={classes(ui.surface.documentIndex, ui.text.meta)}
                  >{index + 1}</ActionButton>
                  <DocumentTextControl
                    aria-label={`Block ${index + 1} text`}
                    text={block.text}
                    offset={item.getTextOffset()}
                    onCaretRange={(from, to, mode) => {
                      dispatchIntent({ type: "selection.set", blockId: block.id, offset: from });
                      if (mode === "extend" || to !== from) {
                        dispatchIntent({ type: "selection.set", blockId: block.id, offset: to, mode: "extend" });
                      }
                    }}
                    onClickCount={setLastClickCount}
                    onTextInput={(next) => dispatchIntent({ type: "text.replace", blockId: block.id, ...next })}
                    rows={Math.max(1, Math.ceil(block.text.length / 64))}
                    className={classes("min-h-11 resize-none", ui.field.seamless)}
                  />
                </SelectableItem>
                );
              })}
            </div>
            <p className={classes("mb-0 mt-3", ui.text.meta)}>Shift-click selects a range. Mod-click adds or removes a block. Arrow keys move the selection when focus is on the surface.</p>
          </section>
        </ProductApp>
    </DemoPage>
  );
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <ActionButton disabled={props.disabled} onClick={props.onClick}>{props.label}</ActionButton>;
}
