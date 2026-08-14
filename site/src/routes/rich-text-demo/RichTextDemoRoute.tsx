import {
  Children,
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  createRichTextEditor,
  renderRichText,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextMark,
  type RichTextNode,
  type RichTextPoint,
  type RichTextRenderAdapter,
  type RichTextText,
} from "@interactive-os/json-document-rich-text";
import {
  createRichTextContentEditableBinding,
  type RichTextContentEditableBinding,
} from "@interactive-os/json-document-rich-text-web";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { ActionButton } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialDocument: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1",
  id: "rich-text-demo",
  type: "doc",
  content: [
    {
      id: "heading-1",
      type: "heading",
      attrs: { level: 2 },
      content: [{
        id: "text-heading",
        type: "text",
        text: "Canonical Rich Text",
        marks: [{ type: "strong" }],
      }],
    },
    {
      id: "paragraph-1",
      type: "paragraph",
      content: [
        { id: "text-lead", type: "text", text: "이 문장은 ", marks: [] },
        { id: "text-emphasis", type: "text", text: "JSONDocument", marks: [{ type: "emphasis" }] },
        { id: "text-tail", type: "text", text: "의 canonical JSON입니다.", marks: [] },
      ],
    },
    {
      id: "paragraph-2",
      type: "paragraph",
      content: [{
        id: "text-editable",
        type: "text",
        text: "여기를 선택하고 직접 입력해 보세요.",
        marks: [],
      }],
    },
  ],
};

export function RichTextDemoRoute() {
  const [editor] = useState(() => createRichTextEditor({ document: createJSONDocument(initialDocument) }));
  const snapshot = useEditingSnapshot(editor);
  const [lastPatch, setLastPatch] = useState<ReadonlyArray<JSONPatchOperation>>([]);
  const [lastAction, setLastAction] = useState("selection.ready");
  const surfaceRef = useRef<HTMLElement>(null);
  const bindingRef = useRef<RichTextContentEditableBinding | null>(null);
  const rendered = useMemo(
    () => renderRichText(snapshot.value as RichTextDocument, reactAdapter).output.node,
    [snapshot.value],
  );
  const primary = snapshot.selection.primaryIndex === null
    ? null
    : snapshot.selection.ranges[snapshot.selection.primaryIndex] ?? null;
  const interval = primary === null ? [] : editor.topology.interval(primary.anchor, primary.focus);

  useLayoutEffect(() => {
    if (surfaceRef.current && surfaceRef.current.contains(document.activeElement)) {
      bindingRef.current?.restoreSelection();
    }
  }, [snapshot.selection, snapshot.value]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const binding = createRichTextContentEditableBinding({
      root: surface,
      editor,
      onAction(action, result) {
        setLastAction(action);
        if (result?.ok && result.change) setLastPatch(result.change.applied);
      },
    });
    bindingRef.current = binding;
    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [editor]);

  function remember(action: string, result: ReturnType<RichTextEditor["dispatch"]>) {
    setLastAction(result.ok ? action : result.code);
    if (result.ok && result.change) setLastPatch(result.change.applied);
    return result;
  }

  function runHistory(direction: "undo" | "redo") {
    const result = direction === "undo" ? editor.undo() : editor.redo();
    setLastAction(result.ok ? direction : result.code);
    if (result.ok && result.change) setLastPatch(result.change.applied);
  }

  function applySampleIntent() {
    const text = findTextNode(snapshot.value as RichTextDocument, "text-editable");
    if (!text) return setLastAction("rich-text.point-not-found");
    const point: RichTextPoint = {
      kind: "text",
      nodeId: text.id,
      offset: text.text.length,
      affinity: "forward",
    };
    editor.dispatch({
      type: "selection.set",
      selection: { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 },
    });
    remember("text.insert", editor.dispatch({ type: "text.insert", text: " ✓" }));
  }

  return (
    <PageFrame>
      <PageHeader
        label="Draft reference implementation"
        title="Rich Text Lab"
        illustration="patch"
        aside={<div className={ui.text.meta}>revision {snapshot.revision} · {snapshot.canUndo ? "undo ready" : "clean"}</div>}
      >
        DOM은 입력 경계일 뿐입니다. 아래 편집은 Rich Text intent, Selection mapping, EditingSession과 atomic JSON Patch를 차례로 통과합니다.
      </PageHeader>

      <div className={classes("mb-3 flex flex-wrap items-center gap-2 p-2", ui.surface.workspace)} role="toolbar" aria-label="Rich Text history">
        <ActionButton kind="primary" onClick={applySampleIntent}>Apply sample intent</ActionButton>
        <ActionButton onClick={() => runHistory("undo")} disabled={!snapshot.canUndo}>Undo</ActionButton>
        <ActionButton onClick={() => runHistory("redo")} disabled={!snapshot.canRedo}>Redo</ActionButton>
        <span className={classes("ml-auto", ui.text.meta)} aria-live="polite">last: {lastAction}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="rich-text-surface-label">
          <p className={ui.text.label}>Official semantic rendering + editable DOM lease</p>
          <h2 id="rich-text-surface-label" className={classes("mb-3 mt-1", ui.text.heading)}>Canonical document</h2>
          <article
            ref={surfaceRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            aria-label="Rich Text 편집기"
            data-testid="rich-text-editor"
            className={classes(ui.workbench.richTextEditor, ui.state.focus)}
          >
            {rendered}
          </article>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            입력·삭제, Enter block split, IME composition, DOM Selection 복원, structured/HTML/plain Clipboard와 undo/redo가 모두 Official Rich Text intent 경로에 연결됩니다.
          </p>
        </section>

        <section className="grid min-w-0 gap-3" aria-label="Rich Text state inspectors">
          <JsonInspector
            label="Canonical JSON"
            meta="JSONDocument.value"
            value={snapshot.value}
            testId="rich-text-document-json"
            size="tall"
          />
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <JsonInspector
              label="Selection + Topology"
              meta="RangeSelection / logical interval"
              value={{ selection: snapshot.selection, interval }}
              testId="rich-text-selection-json"
              size="standard"
            />
            <JsonInspector
              label="Applied JSON Patch"
              meta={lastAction}
              value={lastPatch}
              testId="rich-text-patch-json"
              size="standard"
            />
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

interface RenderedNode {
  readonly key: string;
  readonly node: ReactNode;
}

const reactAdapter: RichTextRenderAdapter<RenderedNode> = {
  document(document, children) {
    return { key: document.id, node: <>{children.map((child) => child.node)}</> };
  },
  text(node) {
    return {
      key: node.id,
      node: <span key={node.id} data-rich-text-node-id={node.id}>{node.text}</span>,
    };
  },
  node(node, children) {
    const props = { key: node.id, "data-rich-text-block-id": node.id };
    const content = Children.toArray(children.map((child) => child.node));
    if (node.type === "heading") {
      const level = Number((node as RichTextNode & { readonly attrs?: { readonly level?: number } }).attrs?.level ?? 2);
      return { key: node.id, node: createElement(`h${Math.min(Math.max(level, 1), 6)}`, props, content) };
    }
    const element = node.type === "paragraph" ? "p"
      : node.type === "blockquote" ? "blockquote"
      : node.type === "bulletList" ? "ul"
      : node.type === "orderedList" ? "ol"
      : node.type === "listItem" ? "li"
      : node.type === "codeBlock" ? "pre"
      : node.type === "hardBreak" ? "br"
      : "div";
    return { key: node.id, node: createElement(element, props, content) };
  },
  mark(mark, children) {
    const child = children[0]!;
    const element = markElement(mark);
    return { key: child.key, node: createElement(element.type, { ...element.props, key: child.key }, child.node) };
  },
  unknown(value) {
    return { key: "unknown", node: <span data-rich-text-unknown>{JSON.stringify(value)}</span> };
  },
};

function markElement(mark: RichTextMark): { readonly type: string; readonly props?: Readonly<Record<string, string>> } {
  if (mark.type === "strong") return { type: "strong" };
  if (mark.type === "emphasis") return { type: "em" };
  if (mark.type === "underline") return { type: "u" };
  if (mark.type === "strikethrough") return { type: "s" };
  if (mark.type === "code") return { type: "code" };
  return { type: "a", props: { href: mark.attrs.href, ...(mark.attrs.title ? { title: mark.attrs.title } : {}) } };
}

function findTextNode(node: RichTextDocument | RichTextNode, id: string): RichTextText | null {
  if (node.type === "text") return node.id === id ? node as RichTextText : null;
  if (!("content" in node) || !Array.isArray(node.content)) return null;
  for (const child of node.content) {
    const found = findTextNode(child as RichTextNode, id);
    if (found) return found;
  }
  return null;
}
