import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  type BlockDocument,
  type DocumentClipboard,
} from "@interactive-os/json-document-editing";
import {
  useDocumentEditor,
  useEditingSnapshot,
} from "@interactive-os/json-document-react";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "welcome", text: "A minimal document that still behaves like an editor." },
    { id: "select", text: "Shift-click for a range. Mod-click for multiple blocks." },
    { id: "clipboard", text: "Copy, cut, paste, move, duplicate, undo, and redo all preserve selection." },
    { id: "json", text: "Every interaction commits to the canonical JSON shown beside the document." },
  ],
};

export function DocumentDemo() {
  const editor = useDocumentEditor(initialDocument);
  const snapshot = useEditingSnapshot(editor);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const surfaceRef = useRef<HTMLDivElement>(null);

  const document = snapshot.value as BlockDocument;
  const selected = new Set(editor.selectedBlockIds);

  function run(action: () => { readonly ok: boolean }, message: string) {
    const result = action();
    setAnnouncement(result.ok ? message : "That action is not available here");
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
    run(() => editor.dispatch({ type: "clipboard.paste", clipboard }), `Pasted ${clipboard.blocks.length} block${clipboard.blocks.length === 1 ? "" : "s"}`);
  }

  function handleBlockClick(event: MouseEvent, blockId: string) {
    if ((event.target as HTMLElement).closest("textarea")) return;
    const mode = event.shiftKey ? "extend" : event.metaKey || event.ctrlKey ? "toggle" : "replace";
    run(() => editor.dispatch({ type: "selection.set", blockId, mode }), "Selection changed");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === "c") {
      event.preventDefault();
      return copySelection();
    }
    if (modifier && event.key.toLowerCase() === "x") {
      event.preventDefault();
      return cutSelection();
    }
    if (modifier && event.key.toLowerCase() === "v" && clipboard) {
      event.preventDefault();
      return pasteSelection();
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      return run(() => event.shiftKey ? editor.redo() : editor.undo(), event.shiftKey ? "Redone" : "Undone");
    }
    if ((event.target as HTMLElement).closest("textarea")) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const primary = snapshot.selection.ranges[snapshot.selection.primaryIndex]?.focus.blockId;
    const index = document.blocks.findIndex((block) => block.id === primary);
    const next = document.blocks[index + (event.key === "ArrowUp" ? -1 : 1)];
    if (next) run(() => editor.dispatch({ type: "selection.set", blockId: next.id, mode: event.shiftKey ? "extend" : "replace" }), "Selection changed");
  }

  const lastSelectedId = editor.selectedBlockIds.at(-1);

  return (
    <main className="min-h-full bg-stone-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-400">Headless editing vertical slice</p>
            <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">Document demo</h1>
            <p className="m-0 max-w-2xl text-sm leading-6 text-stone-600">A deliberately small interface for selection, clipboard, history, keyboard input, and canonical JSON publication.</p>
          </div>
          <div className="text-right text-xs text-stone-500">
            <div>{editor.selectedBlockIds.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap gap-1 rounded border border-stone-200 bg-white p-2" role="toolbar" aria-label="Document actions">
          <Action label="Add" onClick={() => run(() => editor.dispatch({ type: "block.insert", afterId: lastSelectedId, text: "New block" }), "Block added")} />
          <Action label="Duplicate" onClick={() => run(() => editor.dispatch({ type: "selection.duplicate" }), "Selection duplicated")} />
          <Action label="Move up" onClick={() => run(() => editor.dispatch({ type: "selection.move", direction: -1 }), "Selection moved up")} />
          <Action label="Move down" onClick={() => run(() => editor.dispatch({ type: "selection.move", direction: 1 }), "Selection moved down")} />
          <span className="mx-1 w-px bg-stone-200" aria-hidden="true" />
          <Action label="Copy" onClick={copySelection} />
          <Action label="Cut" onClick={cutSelection} />
          <Action label="Paste" onClick={pasteSelection} disabled={!clipboard} />
          <Action label="Delete" onClick={() => run(() => editor.dispatch({ type: "selection.remove" }), "Selection deleted")} />
          <span className="mx-1 w-px bg-stone-200" aria-hidden="true" />
          <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={!snapshot.canUndo} />
          <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={!snapshot.canRedo} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <section aria-label="Editable document" className="rounded border border-stone-200 bg-white p-3">
            <div ref={surfaceRef} tabIndex={0} onKeyDown={handleKeyDown} className="grid gap-2 outline-none focus-visible:ring-2 focus-visible:ring-stone-400">
              {document.blocks.length === 0 ? (
                <button className="rounded border border-dashed border-stone-300 p-8 text-sm text-stone-500" onClick={() => run(() => editor.dispatch({ type: "block.insert", text: "New block" }), "Block added")}>Add the first block</button>
              ) : document.blocks.map((block, index) => (
                <article
                  key={block.id}
                  data-block-id={block.id}
                  data-selected={selected.has(block.id) ? "true" : "false"}
                  onClick={(event) => handleBlockClick(event, block.id)}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)] rounded border border-stone-200 bg-white data-[selected=true]:border-stone-900 data-[selected=true]:ring-1 data-[selected=true]:ring-stone-900"
                >
                  <button
                    aria-label={`Select block ${index + 1}`}
                    className="cursor-default border-0 border-r border-stone-100 bg-stone-50 text-xs text-stone-400"
                  >{index + 1}</button>
                  <textarea
                    aria-label={`Block ${index + 1} text`}
                    value={block.text}
                    rows={Math.max(1, Math.ceil(block.text.length / 64))}
                    onFocus={(event) => editor.dispatch({ type: "selection.set", blockId: block.id, offset: event.currentTarget.selectionStart })}
                    onClick={(event) => editor.dispatch({ type: "selection.set", blockId: block.id, offset: event.currentTarget.selectionStart })}
                    onChange={(event) => editor.dispatch({ type: "text.replace", blockId: block.id, text: event.currentTarget.value, offset: event.currentTarget.selectionStart })}
                    className="min-h-11 resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 text-stone-800 outline-none"
                  />
                </article>
              ))}
            </div>
            <p className="mb-0 mt-3 text-xs text-stone-400">Shift-click selects a range. Mod-click adds or removes a block. Arrow keys move the selection when focus is on the surface.</p>
          </section>

          <aside className="min-w-0 rounded border border-stone-800 bg-stone-950 p-3 text-stone-100" aria-label="Canonical JSON">
            <div className="mb-2 flex items-center justify-between text-xs text-stone-400"><span>Canonical JSON</span><span>JSON Patch document</span></div>
            <pre data-testid="canonical-json" className="m-0 max-h-[34rem] overflow-auto whitespace-pre-wrap text-xs leading-5"><code>{JSON.stringify(snapshot.value, null, 2)}</code></pre>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <button type="button" disabled={props.disabled} onClick={props.onClick} className="rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35">{props.label}</button>;
}
