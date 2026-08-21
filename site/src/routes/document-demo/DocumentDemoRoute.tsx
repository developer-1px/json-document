import { useRef, useState, type ClipboardEvent } from "react";
import {
  type BlockDocument,
  type DocumentClipboard,
  type DocumentEditor,
  type DocumentIntent,
  type DocumentPoint,
  type DocumentSelection,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditing, useRestoreTextCursor } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  documentClipboardCodec,
  lineBoundary,
  moveLinePoint,
  textInputFromControl,
} from "@interactive-os/json-document-web";
import {
  applyAffordance,
  caretAffordance,
  caretCursor,
  clickCountAffordance,
  pointerSelect,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingCommandFromStroke, historyCommands, optionProps } from "../../shared/widget-binding";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "welcome", text: "A minimal document that still behaves like an editor." },
    { id: "select", text: "Shift-click for a range. Mod-click for multiple blocks." },
    { id: "clipboard", text: "Copy, cut, paste, move, duplicate, undo, and redo all preserve selection." },
    { id: "json", text: "Every interaction commits to the canonical JSON shown beside the document." },
  ],
};

export function DocumentDemoRoute() {
  const editor = useDocumentEditor(initialDocument);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [webClipboard] = useState(() => createWebClipboardBinding({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: true } | { readonly ok: false; readonly code: string } | null>(null);
  const [lastClickCount, setLastClickCount] = useState(0);
  const surfaceRef = useRef<HTMLDivElement>(null);

  function remember(intent: DocumentIntent, result: EditingResult<DocumentSelection>) {
    setLastIntent(intent);
    setLastResult(result.ok ? { ok: true } : { ok: false, code: result.code });
    return result;
  }

  function dispatchIntent(intent: DocumentIntent) {
    return remember(intent, editor.dispatch(intent));
  }

  function run(action: () => { readonly ok: boolean }, message: string) {
    const result = action();
    setAnnouncement(result.ok ? message : "That action is not available here");
    return result;
  }

  const focus = documentFocus(editor);
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
      resolve: (stroke) => editingCommandFromStroke(stroke),
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
        offset: () => documentFocus(editor)?.offset ?? 0,
        length: () => {
          const blockId = documentFocus(editor)?.blockId;
          const block = (editor.snapshot.value as BlockDocument).blocks.find((item) => item.id === blockId);
          return block?.text.length ?? 0;
        },
        onOffset: (offset, mode) => {
          const blockId = documentFocus(editor)?.blockId;
          if (!blockId) return;
          run(() => dispatchIntent({ type: "selection.set", blockId, mode, offset }), "Selection changed");
        },
      },
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as BlockDocument;
  const commands = historyCommands(snapshot);

  function copySelection() {
    const next = editor.copy();
    if (!next) return setAnnouncement("Select a block first");
    setClipboard(next);
    void navigator.clipboard?.writeText(next.text).catch(() => undefined);
    setAnnouncement(`Copied ${next.blocks.length} block${next.blocks.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) return setAnnouncement("Select a block first");
    setClipboard(result.clipboard);
    void navigator.clipboard?.writeText(result.clipboard.text).catch(() => undefined);
    setAnnouncement(`Cut ${result.clipboard.blocks.length} block${result.clipboard.blocks.length === 1 ? "" : "s"}`);
  }

  function pasteSelection() {
    if (!clipboard) return setAnnouncement("Copy or cut blocks first");
    run(() => dispatchIntent({ type: "clipboard.paste", clipboard }), `Pasted ${clipboard.blocks.length} block${clipboard.blocks.length === 1 ? "" : "s"}`);
  }

  function handleNativeCopy(event: ClipboardEvent<HTMLDivElement>) {
    const result = webClipboard.copy(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Copied ${result.payload.blocks.length} structured block${result.payload.blocks.length === 1 ? "" : "s"}`);
  }

  function handleNativeCut(event: ClipboardEvent<HTMLDivElement>) {
    const result = webClipboard.cut(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Cut ${result.payload.blocks.length} structured block${result.payload.blocks.length === 1 ? "" : "s"}`);
  }

  function handleNativePaste(event: ClipboardEvent<HTMLDivElement>) {
    const result = webClipboard.paste(event);
    if (result.ok) {
      setLastIntent({ type: "clipboard.paste", clipboard: result.payload });
      setLastResult({ ok: true });
    }
    setAnnouncement(result.ok
      ? `Pasted ${result.payload.blocks.length} structured block${result.payload.blocks.length === 1 ? "" : "s"}`
      : result.code);
  }

  const lastSelectedId = editor.selectedBlockIds.at(-1);

  return (
    <PageFrame>
        <PageHeader
          illustration="clipboard"
          title="Document"
          aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedBlockIds.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
            <div data-testid="document-click-count">click count {lastClickCount}</div>
          </div>
          )}
        >A deliberately small interface for selection, clipboard, history, keyboard input, and canonical JSON publication.</PageHeader>

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
                meta: lastIntent ? lastIntent.type : "dispatch only",
                value: lastIntent,
                testId: "document-intent-json",
                size: "compact",
              },
              {
                label: "result",
                meta: lastResult?.ok === false ? lastResult.code : lastResult?.ok ? "ok" : "none yet",
                value: lastResult,
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
              onCopy={handleNativeCopy}
              onCut={handleNativeCut}
              onPaste={handleNativePaste}
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
                  onClick={(event) => {
                    applyAffordance(pointerSelect(event), {
                      hand: (hand) => {
                        if (hand.type !== "select") return;
                        run(() => dispatchIntent({ type: "selection.set", blockId: block.id, mode: hand.operation }), "Selection changed");
                      },
                    });
                  }}
                >
                  <ActionButton
                    aria-label={`Select block ${index + 1}`}
                    className={classes(ui.surface.documentIndex, ui.text.meta)}
                  >{index + 1}</ActionButton>
                  <DocumentTextControl
                    label={`Block ${index + 1} text`}
                    text={block.text}
                    offset={item.getTextOffset()}
                    onCaretRange={(from, to, mode) => {
                      dispatchIntent({ type: "selection.set", blockId: block.id, offset: from });
                      if (mode === "extend" || to !== from) {
                        dispatchIntent({ type: "selection.set", blockId: block.id, offset: to, mode: "extend" });
                      }
                    }}
                    onClickCount={setLastClickCount}
                    onChange={(next) => dispatchIntent({ type: "text.replace", blockId: block.id, ...next })}
                  />
                </SelectableItem>
                );
              })}
            </div>
            <p className={classes("mb-0 mt-3", ui.text.meta)}>Shift-click selects a range. Mod-click adds or removes a block. Arrow keys move the selection when focus is on the surface.</p>
          </section>
        </ProductApp>
    </PageFrame>
  );
}

function documentFocus(editor: DocumentEditor): DocumentPoint | null {
  const selection = editor.snapshot.selection;
  if (selection.primaryIndex === null) return null;
  return selection.ranges[selection.primaryIndex]?.focus ?? null;
}

function DocumentTextControl(props: {
  readonly label: string;
  readonly text: string;
  readonly offset: number | null;
  readonly onCaretRange: (from: number, to: number, mode: "replace" | "extend") => void;
  readonly onClickCount: (count: number) => void;
  readonly onChange: (next: { readonly text: string; readonly offset: number }) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useRestoreTextCursor(ref, props.offset);
  return (
    <textarea
      ref={ref}
      aria-label={props.label}
      value={props.text}
      rows={Math.max(1, Math.ceil(props.text.length / 64))}
      onFocus={(event) => {
        const offset = textInputFromControl(event).offset;
        props.onCaretRange(offset, offset, "replace");
      }}
      onClick={(event) => {
        applyAffordance(caretAffordance({ type: "pointer" }), {
          hand: (hand) => {
            if (hand.type !== "caret") return;
            props.onCaretRange(event.currentTarget.selectionStart, event.currentTarget.selectionEnd, hand.operation);
          },
        });
        applyAffordance(clickCountAffordance(event.detail), {
          hand: (hand) => {
            if (hand.type === "click") props.onClickCount(hand.count);
          },
        });
      }}
      onSelect={(event) => {
        applyAffordance(caretAffordance({ type: "pointer", dragging: true }), {
          hand: (hand) => {
            if (hand.type !== "caret") return;
            props.onCaretRange(event.currentTarget.selectionStart, event.currentTarget.selectionEnd, hand.operation);
          },
        });
      }}
      onChange={(event) => props.onChange(textInputFromControl(event))}
      className={classes("min-h-11 resize-none", ui.field.seamless)}
      style={{ cursor: caretCursor("horizontal") }}
    />
  );
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <ActionButton disabled={props.disabled} onClick={props.onClick}>{props.label}</ActionButton>;
}
