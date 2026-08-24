import { useRef, useState } from "react";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
} from "@interactive-os/json-document-editing";
import { useEditing, useRestoreTextCursor } from "@interactive-os/json-document-react";
import {
  createWebClipboardSurface,
  documentClipboardCodec,
  textInputFromControl,
} from "@interactive-os/json-document-web";
import { Inspector } from "../../../shared/ui/inspector";
import { SelectableItem } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";
import { optionProps } from "../../../shared/widget-binding";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Select this block and use the native clipboard." },
    { id: "beta", text: "Paste inserts a canonical block after the selection." },
    { id: "gamma", text: "Text input commits through the same editing history." },
  ],
};

export function ClipboardAdapterLab() {
  const [editor] = useState<DocumentEditor>(() => createDocumentEditor(initialDocument));
  const [announcement, setAnnouncement] = useState("Click a block, then use Mod+C and Mod+V inside this surface");
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
    onResult: (result) => setAnnouncement(result.ok
      ? `${result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted"} ${result.payload.blocks.length} structured block`
      : result.code),
  }));
  const focus = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: focus?.blockId ?? null,
    textOffset: focus?.offset ?? null,
    onSelect: (blockId, mode) => {
      const result = editor.dispatch({ type: "selection.set", blockId, mode });
      setAnnouncement(result.ok ? `Selection ${mode}` : result.code);
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as BlockDocument;

  return (
    <section
      aria-label="Clipboard adapter surface"
      tabIndex={0}
      {...clipboardSurface}
      className={classes("p-4", ui.surface.raised, ui.state.focus)}
    >
      <div className={classes("mb-3 flex flex-wrap justify-between gap-2", ui.text.meta)}>
        <output aria-live="polite" data-testid="clipboard-announcement">{announcement}</output>
        <span>revision {snapshot.revision} · {editor.selectedBlockIds.length} selected</span>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          {document.blocks.map((block) => {
            const item = editing.getItem(block.id);
            return (
            <SelectableItem
              as="article"
              key={block.id}
              data-block-id={block.id}
              className={classes("p-3", ui.surface.workspace)}
              {...optionProps(item)}
            >
              <label className={classes("grid gap-2", ui.text.label)}>
                {block.id}
                <ClipboardTextControl
                  label={`${block.id} text`}
                  text={block.text}
                  offset={item.getTextOffset()}
                  onChange={(input) => {
                    const result = editor.dispatch({ type: "text.replace", blockId: block.id, ...input });
                    setAnnouncement(result.ok ? "Native text input committed" : result.code);
                  }}
                />
              </label>
            </SelectableItem>
            );
          })}
        </div>

        <Inspector label="Inspect clipboard adapter state" items={[
          { label: "Canonical JSON", signal: `revision ${snapshot.revision}`, value: snapshot.value, testId: "clipboard-document-json", size: "tall" },
          { label: "Selection", value: snapshot.selection, testId: "clipboard-selection-json", size: "compact" },
        ]} />
      </div>
    </section>
  );
}

function ClipboardTextControl(props: {
  readonly label: string;
  readonly text: string;
  readonly offset: number | null;
  readonly onChange: (input: { readonly text: string; readonly offset: number }) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useRestoreTextCursor(ref, props.offset);
  return (
    <textarea
      ref={ref}
      aria-label={props.label}
      key={props.text}
      defaultValue={props.text}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => props.onChange(textInputFromControl(event))}
      className={classes("min-h-20 w-full", ui.field.control)}
    />
  );
}
