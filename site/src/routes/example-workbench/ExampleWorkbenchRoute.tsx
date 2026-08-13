import { useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import type { JSONPatchOperation, JSONValue } from "@interactive-os/json-document";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
  type DocumentIntent,
  type DocumentSelection,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { readJSONState, urlWithJSONState, urlWithoutJSONState } from "../../shared/url-json-state";
import { ExampleWorkbench } from "../../shared/ui/example-workbench";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { Button } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const defaultDocument: BlockDocument = {
  blocks: [
    { id: "welcome", text: "Select a block, then edit the canonical document." },
    { id: "patch", text: "Every successful edit publishes JSON Patch operations." },
    { id: "share", text: "Copy the URL to reproduce the current document state." },
  ],
};

const exampleSource = `const editor = createDocumentEditor(initialDocument);

editor.subscribe((snapshot) => {
  console.log(snapshot.value);
  console.log(snapshot.selection);
});

editor.dispatch({
  type: "block.insert",
  text: "A new block",
});`;

type TraceEntry = {
  readonly revision: number;
  readonly origin: string;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selection: DocumentSelection;
};

export function ExampleWorkbenchRoute() {
  const restored = useMemo(() => restoredDocument(window.location.search), []);
  const [session, setSession] = useState(() => ({ key: 0, document: restored ?? defaultDocument }));

  function reset() {
    const cleanUrl = urlWithoutJSONState(window.location.href);
    window.history.replaceState(null, "", cleanUrl);
    setSession((current) => ({ key: current.key + 1, document: defaultDocument }));
  }

  return <DocumentWorkbenchSession key={session.key} initial={session.document} onReset={reset} />;
}

function DocumentWorkbenchSession(props: { readonly initial: BlockDocument; readonly onReset: () => void }) {
  const [editor] = useState<DocumentEditor>(() => createDocumentEditor(props.initial));
  const snapshot = useEditingSnapshot(editor);
  const [trace, setTrace] = useState<ReadonlyArray<TraceEntry>>([]);
  const [shareStatus, setShareStatus] = useState("Copy link");
  const selected = new Set(editor.selectedBlockIds);
  const document = snapshot.value as BlockDocument;

  function record(origin: string, result: EditingResult<DocumentSelection>) {
    if (!result.ok) return;
    const entry: TraceEntry = {
      revision: result.snapshot.revision,
      origin,
      operations: result.change?.applied ?? [],
      selection: result.snapshot.selection,
    };
    setTrace((current) => [entry, ...current].slice(0, 8));
  }

  function dispatch(intent: DocumentIntent) {
    const result = editor.dispatch(intent);
    record(intent.type, result);
    return result;
  }

  function selectBlock(event: MouseEvent, blockId: string) {
    if ((event.target as HTMLElement).closest("textarea")) return;
    record("selection.set", editor.dispatch({ type: "selection.set", blockId }));
  }

  function replaceText(event: ChangeEvent<HTMLTextAreaElement>, blockId: string) {
    dispatch({ type: "text.replace", blockId, text: event.target.value, offset: event.target.selectionStart });
  }

  async function copyShareUrl() {
    const shareUrl = urlWithJSONState(window.location.href, snapshot.value);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("Link copied");
    } catch {
      setShareStatus("Copy failed");
    }
  }

  const lastSelectedId = editor.selectedBlockIds.at(-1);

  return (
    <ExampleWorkbench
      title="Document editing"
      description="Edit a real document and inspect every public state change it produces."
      scenario="Document · selection and history"
      summary={`revision ${snapshot.revision} · ${editor.selectedBlockIds.length} selected · ${trace.length} observed events`}
      source={exampleSource}
      actions={(
        <>
          <Button onClick={props.onReset}>Reset</Button>
          <Button kind="primary" onClick={() => void copyShareUrl()}>{shareStatus}</Button>
        </>
      )}
      live={(
        <>
          <div className="mb-3 flex flex-wrap gap-1" role="toolbar" aria-label="Workbench document actions">
            <Button onClick={() => dispatch({ type: "block.insert", afterId: lastSelectedId, text: "A new block" })}>Add</Button>
            <Button onClick={() => dispatch({ type: "selection.duplicate" })}>Duplicate</Button>
            <Button onClick={() => dispatch({ type: "selection.remove" })}>Delete</Button>
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <Button disabled={!snapshot.canUndo} onClick={() => record("undo", editor.undo())}>Undo</Button>
            <Button disabled={!snapshot.canRedo} onClick={() => record("redo", editor.redo())}>Redo</Button>
          </div>

          <div className={classes("overflow-hidden", ui.surface.workspace)}>
            {document.blocks.map((block, index) => (
              <article
                key={block.id}
                data-selected={selected.has(block.id) ? "true" : "false"}
                className={classes("grid grid-cols-[2rem_minmax(0,1fr)]", ui.surface.documentBlock, ui.state.selected)}
                onClick={(event) => selectBlock(event, block.id)}
              >
                <button
                  aria-label={`Select workbench block ${index + 1}`}
                  className={classes("cursor-default", ui.surface.documentIndex, ui.text.meta)}
                >
                  {index + 1}
                </button>
                <textarea
                  aria-label={`Workbench block ${index + 1} text`}
                  className={classes("min-h-12 resize-none", ui.field.seamless)}
                  rows={2}
                  value={block.text}
                  onChange={(event) => replaceText(event, block.id)}
                />
              </article>
            ))}
          </div>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>Select, edit, add, remove, undo, and share. The inspectors below subscribe to this exact editor instance.</p>
        </>
      )}
      inspectors={(
        <>
          <JsonInspector label="Canonical JSON" signal={`revision ${snapshot.revision}`} value={snapshot.value} testId="workbench-document-json" />
          <JsonInspector label="Selection" meta={`${snapshot.selection.ranges.length} ranges`} value={snapshot.selection} testId="workbench-selection-json" />
          <JsonInspector label="Operation trace" meta="latest first" value={trace as unknown as JSONValue} testId="workbench-trace-json" />
        </>
      )}
    />
  );
}

function restoredDocument(search: string): BlockDocument | null {
  const value = readJSONState(search);
  if (!isRecord(value) || !Array.isArray(value.blocks)) return null;
  const blocks = value.blocks;
  if (!blocks.every((block) => isRecord(block) && typeof block.id === "string" && typeof block.text === "string")) return null;
  if (new Set(blocks.map((block) => block.id)).size !== blocks.length) return null;
  return { blocks: blocks.map((block) => ({ id: block.id as string, text: block.text as string })) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
