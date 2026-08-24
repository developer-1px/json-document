import { useState } from "react";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
  type DocumentIntent,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardSurface,
  createWebKeyboardAdapter,
  documentClipboardCodec,
  lineBoundary,
  moveLinePoint,
  type WebKeyboardCommand,
} from "@interactive-os/json-document-web";
import { Inspector } from "../../../shared/ui/inspector";
import { SelectableItem } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";
import { optionProps } from "../../../shared/widget-binding";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Select this block and use arrows, Delete, and undo." },
    { id: "beta", text: "Paste inserts a canonical block after the selection." },
    { id: "gamma", text: "Keyboard commands use the same Intent, Clipboard, and History doors." },
  ],
};

export function KeyboardAdapterLab() {
  const [editor] = useState<DocumentEditor>(() => createDocumentEditor(initialDocument));
  const [announcement, setAnnouncement] = useState("Click a block, then use arrows, Delete, or Mod+C / Mod+V");
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
    onResult: (result) => {
      if (result.ok && result.operation === "paste") {
        setLastIntent({ type: "clipboard.paste", clipboard: result.payload });
      }
      setAnnouncement(result.ok
        ? `${result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted"} ${result.payload.blocks.length} structured block`
        : result.code);
    },
  }));
  const [keyboard] = useState(() => createWebKeyboardAdapter());
  const [lastCommand, setLastCommand] = useState<WebKeyboardCommand | null>(null);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.blockId
      ?? editor.selectedBlockIds.at(-1)
      ?? null,
    onSelect: (blockId, mode) => {
      const intent = { type: "selection.set" as const, blockId, mode };
      const result = editor.dispatch(intent);
      setLastIntent(intent);
      setAnnouncement(result.ok ? `Selection ${mode}` : result.code);
    },
    keyboard: {
      resolve: (stroke) => {
        const command = keyboard.resolve(stroke);
        if (command) setLastCommand(command);
        return command;
      },
      focusKey: () => {
        const primary = editor.snapshot.selection.primaryIndex;
        return primary === null
          ? editor.selectedBlockIds.at(-1)
          : editor.snapshot.selection.ranges[primary]?.focus.blockId;
      },
      neighbor: (key, command) => {
        const ids = (editor.snapshot.value as BlockDocument).blocks.map((block) => block.id);
        return command.type === "move"
          ? moveLinePoint(ids, key, command.direction)
          : lineBoundary(ids, command.edge);
      },
      onDelete: () => {
        const intent = { type: "selection.remove" as const };
        const result = editor.dispatch(intent);
        setLastIntent(intent);
        setAnnouncement(result.ok ? "Keyboard delete" : result.code);
      },
      onUndo: () => {
        const result = editor.undo();
        setAnnouncement(result.ok ? "Undone" : result.code);
      },
      onRedo: () => {
        const result = editor.redo();
        setAnnouncement(result.ok ? "Redone" : result.code);
      },
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as BlockDocument;

  return (
    <section
      aria-label="Keyboard adapter surface"
      tabIndex={0}
      {...clipboardSurface}
      onKeyDown={editing.getKeyDownHandler()}
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
              data-block-id={block.id}
              className={classes("p-3", ui.surface.workspace)}
              {...optionProps(editing.getItem(block.id))}
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
