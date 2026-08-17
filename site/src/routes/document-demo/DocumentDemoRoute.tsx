import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
  type BlockDocument,
  type DocumentClipboard,
  type DocumentIntent,
  type DocumentSelection,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import {
  useDocumentEditor,
  useEditingSnapshot,
} from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  createWebKeyboardAdapter,
  documentClipboardCodec,
  moveLinePoint,
  selectionOperationFromModifiers,
  textInputFromControl,
} from "@interactive-os/json-document-web";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

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
  const snapshot = useEditingSnapshot(editor);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [webClipboard] = useState(() => createWebClipboardBinding({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const [keyboard] = useState(() => createWebKeyboardAdapter());
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: true } | { readonly ok: false; readonly code: string } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const document = snapshot.value as BlockDocument;
  const selected = new Set(editor.selectedBlockIds);

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

  function handleBlockClick(event: MouseEvent, blockId: string) {
    if ((event.target as HTMLElement).closest("textarea")) return;
    const mode = selectionOperationFromModifiers(event);
    run(() => dispatchIntent({ type: "selection.set", blockId, mode }), "Selection changed");
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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const command = keyboard.resolve(event);
    if (command === null) return;
    const inField = (event.target as HTMLElement).closest("textarea, input, [contenteditable]");
    if (inField && command.type !== "undo" && command.type !== "redo") return;

    const ids = document.blocks.map((block) => block.id);
    const current = snapshot.selection.primaryIndex === null
      ? undefined
      : snapshot.selection.ranges[snapshot.selection.primaryIndex]?.focus.blockId;

    if (command.type === "move") {
      if (current === undefined) return;
      const next = moveLinePoint(ids, current, command.direction);
      if (next === null) return;
      event.preventDefault();
      run(() => dispatchIntent({ type: "selection.set", blockId: next, mode: command.operation }), "Selection changed");
      return;
    }
    if (command.type === "delete") {
      event.preventDefault();
      run(() => dispatchIntent({ type: "selection.remove" }), "Selection deleted");
      return;
    }
    if (command.type !== "undo" && command.type !== "redo") return;
    event.preventDefault();
    run(() => command.type === "redo" ? editor.redo() : editor.undo(), command.type === "redo" ? "Redone" : "Undone");
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
              <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={!snapshot.canUndo} />
              <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={!snapshot.canRedo} />
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
              onKeyDown={handleKeyDown}
              className={ui.state.focus}
            >
              {document.blocks.length === 0 ? (
                <ActionButton kind="primary" className="p-8" onClick={() => run(() => dispatchIntent({ type: "block.insert", text: "New block" }), "Block added")}>Add the first block</ActionButton>
              ) : document.blocks.map((block, index) => (
                <SelectableItem
                  as="article"
                  key={block.id}
                  selected={selected.has(block.id)}
                  data-block-id={block.id}
                  onClick={(event) => handleBlockClick(event, block.id)}
                  className={classes("group grid grid-cols-[2rem_minmax(0,1fr)]", ui.surface.documentBlock)}
                >
                  <ActionButton
                    aria-label={`Select block ${index + 1}`}
                    className={classes(ui.surface.documentIndex, ui.text.meta)}
                  >{index + 1}</ActionButton>
                  <textarea
                    aria-label={`Block ${index + 1} text`}
                    value={block.text}
                    rows={Math.max(1, Math.ceil(block.text.length / 64))}
                    onFocus={(event) => dispatchIntent({ type: "selection.set", blockId: block.id, offset: textInputFromControl(event).offset })}
                    onClick={(event) => dispatchIntent({ type: "selection.set", blockId: block.id, offset: textInputFromControl(event).offset })}
                    onChange={(event) => dispatchIntent({ type: "text.replace", blockId: block.id, ...textInputFromControl(event) })}
                    className={classes("min-h-11 resize-none", ui.field.seamless)}
                  />
                </SelectableItem>
              ))}
            </div>
            <p className={classes("mb-0 mt-3", ui.text.meta)}>Shift-click selects a range. Mod-click adds or removes a block. Arrow keys move the selection when focus is on the surface.</p>
          </section>
        </ProductApp>
    </PageFrame>
  );
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <ActionButton disabled={props.disabled} onClick={props.onClick}>{props.label}</ActionButton>;
}
