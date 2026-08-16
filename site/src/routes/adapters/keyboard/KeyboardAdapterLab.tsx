import { useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
  type DocumentIntent,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  createWebKeyboardAdapter,
  documentClipboardCodec,
  lineBoundary,
  moveLinePoint,
  selectionOperationFromModifiers,
  type WebKeyboardCommand,
} from "@interactive-os/json-document-web";
import { Inspector } from "../../../shared/ui/inspector";
import { SelectableItem } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Select this block and use arrows, Delete, and undo." },
    { id: "beta", text: "Paste inserts a canonical block after the selection." },
    { id: "gamma", text: "Keyboard commands use the same Intent, Clipboard, and History doors." },
  ],
};

export function KeyboardAdapterLab() {
  const [editor] = useState<DocumentEditor>(() => createDocumentEditor(initialDocument));
  const [clipboard] = useState(() => createWebClipboardBinding({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const [keyboard] = useState(() => createWebKeyboardAdapter());
  const snapshot = useEditingSnapshot(editor);
  const [announcement, setAnnouncement] = useState("Click a block, then use arrows, Delete, or Mod+C / Mod+V");
  const [lastCommand, setLastCommand] = useState<WebKeyboardCommand | null>(null);
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const document = snapshot.value as BlockDocument;
  const selected = new Set(editor.selectedBlockIds);

  function focusId(): string | undefined {
    const primary = snapshot.selection.primaryIndex;
    return primary === null ? editor.selectedBlockIds.at(-1) : snapshot.selection.ranges[primary]?.focus.blockId;
  }

  function handleCopy(event: ClipboardEvent<HTMLElement>) {
    const result = clipboard.copy(event);
    setAnnouncement(result.ok ? `Copied ${result.payload.blocks.length} structured block` : result.code);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const result = clipboard.paste(event);
    if (result.ok) setLastIntent({ type: "clipboard.paste", clipboard: result.payload });
    setAnnouncement(result.ok ? `Pasted ${result.payload.blocks.length} structured block` : result.code);
  }

  function handleCut(event: ClipboardEvent<HTMLElement>) {
    const result = clipboard.cut(event);
    setAnnouncement(result.ok ? `Cut ${result.payload.blocks.length} structured block` : result.code);
  }

  function select(event: MouseEvent, blockId: string) {
    const intent = { type: "selection.set" as const, blockId, mode: selectionOperationFromModifiers(event) };
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? `Selection ${intent.mode}` : result.code);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const command = keyboard.resolve(event);
    if (command === null) return;
    const inField = (event.target as HTMLElement).closest("textarea, input, [contenteditable]");
    if (inField && command.type === "toggle" && event.key === " ") return;
    if (inField && (command.type === "move" || command.type === "boundary" || command.type === "delete")) return;

    const ids = document.blocks.map((block) => block.id);
    const current = focusId();
    if (command.type === "move" || command.type === "boundary") {
      if (current === undefined) return;
      const next = command.type === "move"
        ? moveLinePoint(ids, current, command.direction)
        : lineBoundary(ids, command.edge);
      if (next === null) return;
      event.preventDefault();
      setLastCommand(command);
      const intent = { type: "selection.set" as const, blockId: next, mode: command.operation };
      const result = editor.dispatch(intent);
      setLastIntent(intent);
      setAnnouncement(result.ok ? `Keyboard ${command.operation}` : result.code);
      return;
    }
    if (command.type === "toggle") {
      if (current === undefined) return;
      event.preventDefault();
      setLastCommand(command);
      const intent = { type: "selection.set" as const, blockId: current, mode: "toggle" as const };
      const result = editor.dispatch(intent);
      setLastIntent(intent);
      setAnnouncement(result.ok ? "Keyboard toggle" : result.code);
      return;
    }
    if (command.type === "delete") {
      event.preventDefault();
      setLastCommand(command);
      const intent = { type: "selection.remove" as const };
      const result = editor.dispatch(intent);
      setLastIntent(intent);
      setAnnouncement(result.ok ? "Keyboard delete" : result.code);
      return;
    }
    event.preventDefault();
    setLastCommand(command);
    const result = command.type === "redo" ? editor.redo() : editor.undo();
    setAnnouncement(result.ok ? (command.type === "redo" ? "Redone" : "Undone") : result.code);
  }

  return (
    <section
      aria-label="Keyboard adapter surface"
      tabIndex={0}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      className={classes("p-4", ui.surface.raised, ui.state.focus)}
    >
      <div className={classes("mb-3 flex flex-wrap justify-between gap-2", ui.text.meta)}>
        <output aria-live="polite" data-testid="keyboard-announcement">{announcement}</output>
        <span data-testid="keyboard-history-state">
          revision {snapshot.revision} · {editor.selectedBlockIds.length} selected
          {snapshot.canUndo ? " · undo" : ""}
          {snapshot.canRedo ? " · redo" : ""}
        </span>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          {document.blocks.map((block) => (
            <SelectableItem
              as="article"
              key={block.id}
              selected={selected.has(block.id)}
              data-block-id={block.id}
              onClick={(event) => select(event, block.id)}
              className={classes("p-3", ui.surface.workspace)}
            >
              <span className={ui.text.label}>{block.id}</span>
            </SelectableItem>
          ))}
        </div>

        <Inspector label="Inspect keyboard adapter state" items={[
          { label: "Canonical JSON", signal: `revision ${snapshot.revision}`, value: snapshot.value, testId: "keyboard-document-json", size: "tall" },
          { label: "Keyboard command", value: lastCommand, testId: "keyboard-command-json", size: "compact" },
          { label: "Intent", value: lastIntent, testId: "keyboard-intent-json", size: "compact" },
          { label: "Selection", value: snapshot.selection, testId: "keyboard-selection-json", size: "compact" },
        ]} />
      </div>
    </section>
  );
}
