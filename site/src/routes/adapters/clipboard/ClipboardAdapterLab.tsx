import { useState, type ClipboardEvent } from "react";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  documentClipboardCodec,
  textInputFromControl,
} from "@interactive-os/json-document-web";
import { Inspector } from "../../../shared/ui/inspector";
import { SelectableItem } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Select this block and use the native clipboard." },
    { id: "beta", text: "Paste inserts a canonical block after the selection." },
    { id: "gamma", text: "Text input commits through the same editing history." },
  ],
};

export function ClipboardAdapterLab() {
  const [editor] = useState<DocumentEditor>(() => createDocumentEditor(initialDocument));
  const [clipboard] = useState(() => createWebClipboardBinding({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const [announcement, setAnnouncement] = useState("Click a block, then use Mod+C and Mod+V inside this surface");
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    onSelect: (blockId, mode) => {
      const result = editor.dispatch({ type: "selection.set", blockId, mode });
      setAnnouncement(result.ok ? `Selection ${mode}` : result.code);
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as BlockDocument;

  function handleCopy(event: ClipboardEvent<HTMLElement>) {
    const result = clipboard.copy(event);
    setAnnouncement(result.ok ? `Copied ${result.payload.blocks.length} structured block` : result.code);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const result = clipboard.paste(event);
    setAnnouncement(result.ok ? `Pasted ${result.payload.blocks.length} structured block` : result.code);
  }

  function handleCut(event: ClipboardEvent<HTMLElement>) {
    const result = clipboard.cut(event);
    setAnnouncement(result.ok ? `Cut ${result.payload.blocks.length} structured block` : result.code);
  }

  return (
    <section
      aria-label="Clipboard adapter surface"
      tabIndex={0}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      className={classes("p-4", ui.surface.raised, ui.state.focus)}
    >
      <div className={classes("mb-3 flex flex-wrap justify-between gap-2", ui.text.meta)}>
        <output aria-live="polite" data-testid="clipboard-announcement">{announcement}</output>
        <span>revision {snapshot.revision} · {editor.selectedBlockIds.length} selected</span>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          {document.blocks.map((block) => (
            <SelectableItem
              as="article"
              key={block.id}
              selected={editing.getItem(block.id).getIsSelected()}
              data-block-id={block.id}
              onClick={editing.getItem(block.id).getPressHandler()}
              className={classes("p-3", ui.surface.workspace)}
            >
              <label className={classes("grid gap-2", ui.text.label)}>
                {block.id}
                <textarea
                  aria-label={`${block.id} text`}
                  key={block.text}
                  defaultValue={block.text}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const input = textInputFromControl(event);
                    const result = editor.dispatch({ type: "text.replace", blockId: block.id, ...input });
                    setAnnouncement(result.ok ? "Native text input committed" : result.code);
                  }}
                  className={classes("min-h-20 w-full", ui.field.control)}
                />
              </label>
            </SelectableItem>
          ))}
        </div>

        <Inspector label="Inspect clipboard adapter state" items={[
          { label: "Canonical JSON", signal: `revision ${snapshot.revision}`, value: snapshot.value, testId: "clipboard-document-json", size: "tall" },
          { label: "Selection", value: snapshot.selection, testId: "clipboard-selection-json", size: "compact" },
        ]} />
      </div>
    </section>
  );
}
