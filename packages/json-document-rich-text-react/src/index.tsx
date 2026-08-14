import {
  Children,
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  renderRichText,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextMark,
  type RichTextNode,
  type RichTextRenderAdapter,
  type RichTextSchema,
} from "@interactive-os/json-document-rich-text";
import {
  createRichTextContentEditableBinding,
  type RichTextContentEditableBinding,
} from "@interactive-os/json-document-rich-text-web";

export interface RichTextRendererProps {
  readonly document: RichTextDocument;
  readonly schema?: RichTextSchema;
  readonly renderExtension?: (node: RichTextNode, children: ReadonlyArray<ReactNode>) => ReactNode;
  readonly renderExtensionMark?: (mark: RichTextMark, children: ReadonlyArray<ReactNode>) => ReactNode;
  readonly renderUnknown?: (value: unknown) => ReactNode;
}

export function RichTextRenderer({ document, schema, renderExtension, renderExtensionMark, renderUnknown }: RichTextRendererProps): ReactNode {
  const adapter = createReactAdapter({
    ...(renderExtension === undefined ? {} : { renderExtension }),
    ...(renderExtensionMark === undefined ? {} : { renderExtensionMark }),
    ...(renderUnknown === undefined ? {} : { renderUnknown }),
  });
  return (schema === undefined
    ? renderRichText(document, adapter)
    : renderRichText(document, schema, adapter)).output.node;
}

export interface RichTextEditorSurfaceProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "contentEditable" | "onInput"> {
  readonly editor: RichTextEditor;
  readonly as?: "article" | "div" | "section";
  readonly createId?: () => string;
  readonly onAction?: (action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => void;
  readonly renderExtension?: RichTextRendererProps["renderExtension"];
  readonly renderExtensionMark?: RichTextRendererProps["renderExtensionMark"];
  readonly renderUnknown?: RichTextRendererProps["renderUnknown"];
}

export function RichTextEditorSurface({ editor, as = "article", createId, onAction, renderExtension, renderExtensionMark, renderUnknown, ...props }: RichTextEditorSurfaceProps) {
  const snapshot = useEditingSnapshot(editor);
  const [isComposing, setIsComposing] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const bindingRef = useRef<RichTextContentEditableBinding | null>(null);
  const frozenDocumentRef = useRef(snapshot.value);
  if (!isComposing) frozenDocumentRef.current = snapshot.value;
  const rendered = useMemo(
    () => <RichTextRenderer document={(isComposing ? frozenDocumentRef.current : snapshot.value) as RichTextDocument} schema={editor.schema} {...(renderExtension === undefined ? {} : { renderExtension })} {...(renderExtensionMark === undefined ? {} : { renderExtensionMark })} {...(renderUnknown === undefined ? {} : { renderUnknown })} />,
    [editor.schema, isComposing, renderExtension, renderExtensionMark, renderUnknown, snapshot.value],
  );

  useLayoutEffect(() => {
    if (!bindingRef.current?.isComposing() && rootRef.current?.contains(rootRef.current.ownerDocument.activeElement)) bindingRef.current?.restoreSelection();
  }, [snapshot.selection, snapshot.value]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const binding = createRichTextContentEditableBinding({
      root,
      editor,
      ...(createId === undefined ? {} : { createId }),
      ...(onAction === undefined ? {} : { onAction }),
      onCompositionChange: setIsComposing,
    });
    bindingRef.current = binding;
    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [createId, editor, onAction]);

  return createElement(as, {
    ...props,
    ref: rootRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-rich-text-node-id": (snapshot.value as RichTextDocument).id,
    "data-rich-text-container-id": (snapshot.value as RichTextDocument).id,
  }, rendered);
}

interface RenderedNode { readonly key: string; readonly node: ReactNode }

function createReactAdapter(options: Pick<RichTextRendererProps, "renderExtension" | "renderExtensionMark" | "renderUnknown">): RichTextRenderAdapter<RenderedNode> { return {
  document(document, children) {
    return { key: document.id, node: <>{children.map((child) => child.node)}</> };
  },
  text(node) {
    return { key: node.id, node: <span key={node.id} data-rich-text-node-id={node.id} data-rich-text-text-id={node.id}>{node.text}</span> };
  },
  node(node, children) {
    const content = Children.toArray(children.map((child) => child.node));
    const hasContent = "content" in node && Array.isArray(node.content);
    const props = {
      "data-rich-text-node-id": node.id,
      ...(hasContent ? { "data-rich-text-container-id": node.id } : {}),
    };
    if (node.type === "heading") return { key: node.id, node: createElement(`h${node.attrs.level}`, { key: node.id, ...props }, content) };
    if (node.type === "hardBreak") return { key: node.id, node: <br key={node.id} {...props} /> };
    if (node.type === "codeBlock") return { key: node.id, node: <pre key={node.id} {...props}><code {...(node.attrs.language === null ? {} : { className: `language-${node.attrs.language}` })}>{content}</code></pre> };
    if (node.type === "orderedList") return { key: node.id, node: <ol key={node.id} {...props} start={node.attrs.start}>{content}</ol> };
    if (node.type.includes("/") && options.renderExtension) return { key: node.id, node: options.renderExtension(node, content) };
    const element = node.type === "paragraph" ? "p"
      : node.type === "blockquote" ? "blockquote"
      : node.type === "bulletList" ? "ul"
      : node.type === "listItem" ? "li"
      : "div";
    return { key: node.id, node: createElement(element, { key: node.id, ...props }, content) };
  },
  mark(mark, children) {
    const child = children[0]!;
    if (mark.type.includes("/") && options.renderExtensionMark) return { key: child.key, node: options.renderExtensionMark(mark, children.map((item) => item.node)) };
    const element = markElement(mark);
    return { key: child.key, node: createElement(element.type, { ...element.props, key: child.key }, child.node) };
  },
  unknown(value) {
    const id = typeof value === "object" && value !== null && "id" in value ? String(value.id) : "unknown";
    return { key: id, node: options.renderUnknown?.(value) ?? <span data-rich-text-unknown>{JSON.stringify(value)}</span> };
  },
}; }

function markElement(mark: RichTextMark): { readonly type: string; readonly props?: Readonly<Record<string, string>> } {
  if (mark.type === "strong") return { type: "strong" };
  if (mark.type === "emphasis") return { type: "em" };
  if (mark.type === "underline") return { type: "u" };
  if (mark.type === "strikethrough") return { type: "s" };
  if (mark.type === "code") return { type: "code" };
  if (mark.type === "link") return { type: "a", props: { href: mark.attrs.href, ...(mark.attrs.title ? { title: mark.attrs.title } : {}) } };
  return { type: "span" };
}

export type { RichTextDocument, RichTextEditor, RichTextNode };
