import { useState, type ClipboardEvent, type MouseEvent } from "react";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  documentClipboardCodec,
  selectionOperationFromModifiers,
  textInputFromControl,
} from "@interactive-os/json-document-web";
import { JsonInspector } from "../../../shared/ui/json-inspector";
import { SelectableItem } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Select this block and use the native clipboard." },
    { id: "beta", text: "Paste inserts a canonical block after the selection." },
    { id: "gamma", text: "Text input commits through the same editing history." },
  ],
};

export function WebConnectorLab() {
  const [editor] = useState<DocumentEditor>(() => createDocumentEditor(initialDocument));
  const [clipboard] = useState(() => createWebClipboardBinding({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const snapshot = useEditingSnapshot(editor);
  const [announcement, setAnnouncement] = useState("Click a block, then use Mod+C and Mod+V inside this surface");
  const document = snapshot.value as BlockDocument;
  const selected = new Set(editor.selectedBlockIds);

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

  function select(event: MouseEvent, blockId: string) {
    const mode = selectionOperationFromModifiers(event);
    const result = editor.dispatch({ type: "selection.set", blockId, mode });
    setAnnouncement(result.ok ? `Selection ${mode}` : result.code);
  }

  return (
    <section
      aria-label="Web Platform editing surface"
      tabIndex={0}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      className={classes("p-4", ui.surface.raised, ui.state.focus)}
    >
      <div className={classes("mb-3 flex flex-wrap justify-between gap-2", ui.text.meta)}>
        <output aria-live="polite" data-testid="web-announcement">{announcement}</output>
        <span>revision {snapshot.revision} · {editor.selectedBlockIds.length} selected</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
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

        <aside className="grid min-w-0 gap-3" aria-label="Canonical state">
          <JsonInspector label="Canonical JSON" signal={`revision ${snapshot.revision}`} value={snapshot.value} testId="web-document-json" size="tall" />
          <JsonInspector label="Selection" value={snapshot.selection} testId="web-selection-json" size="compact" />
        </aside>
      </div>
    </section>
  );
}
