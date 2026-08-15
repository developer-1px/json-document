import {
  Children,
  createElement,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  hasRichTextContent,
  isRichTextText,
  richTextSchemaV1,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextMark,
  type RichTextNode,
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

let blockRenderListener: ((nodeId: string) => void) | null = null;

export function observeRichTextBlockRenders(listener: ((nodeId: string) => void) | null): void {
  blockRenderListener = listener;
}

export function RichTextRenderer({ document, schema, renderExtension, renderExtensionMark, renderUnknown }: RichTextRendererProps): ReactNode {
  return document.content.map((node) => (
    <RichTextMemoNode
      key={node.id}
      node={node}
      schema={schema}
      editable={false}
      renderExtension={renderExtension}
      renderExtensionMark={renderExtensionMark}
      renderUnknown={renderUnknown}
    />
  ));
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
  const document = (isComposing ? frozenDocumentRef.current : snapshot.value) as RichTextDocument;

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
    style: { ...props.style, whiteSpace: "pre-wrap" },
    ref: rootRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-rich-text-node-id": document.id,
    "data-rich-text-container-id": document.id,
  }, document.content.map((node) => (
    <RichTextMemoNode
      key={node.id}
      node={node}
      schema={editor.schema}
      editable
      renderExtension={renderExtension}
      renderExtensionMark={renderExtensionMark}
      renderUnknown={renderUnknown}
    />
  )));
}

interface MemoNodeProps {
  readonly node: RichTextNode;
  readonly schema: RichTextSchema | undefined;
  readonly editable: boolean;
  readonly renderExtension: RichTextRendererProps["renderExtension"];
  readonly renderExtensionMark: RichTextRendererProps["renderExtensionMark"];
  readonly renderUnknown: RichTextRendererProps["renderUnknown"];
}

const RichTextMemoNode = memo(function RichTextMemoNode({
  node,
  schema,
  editable,
  renderExtension,
  renderExtensionMark,
  renderUnknown,
}: MemoNodeProps) {
  blockRenderListener?.(node.id);
  const activeSchema = schema ?? richTextSchemaV1;
  if (activeSchema.nodes[node.type] === undefined) {
    return renderUnknown?.(node) ?? <span data-rich-text-unknown>{JSON.stringify(node)}</span>;
  }
  if (isRichTextText(node)) {
    const text = <span key={node.id} data-rich-text-node-id={node.id} data-rich-text-text-id={node.id}>{node.text}</span>;
    return node.marks.reduceRight<ReactNode>((children, mark) => wrapMark(mark, children, node.id, renderExtensionMark), text);
  }
  const children = hasRichTextContent(node)
    ? node.content.map((child) => (
      <RichTextMemoNode
        key={child.id}
        node={child}
        schema={schema}
        editable={editable}
        renderExtension={renderExtension}
        renderExtensionMark={renderExtensionMark}
        renderUnknown={renderUnknown}
      />
    ))
    : [];
  const content = Children.toArray(children);
  if (editable && children.length === 0 && (node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock")) {
    content.push(<br key={`${node.id}:placeholder`} data-rich-text-placeholder="" />);
  }
  const props = {
    "data-rich-text-node-id": node.id,
    ...(hasRichTextContent(node) ? { "data-rich-text-container-id": node.id } : {}),
  };
  if (node.type === "heading") return createElement(`h${node.attrs.level}`, { key: node.id, ...props }, content);
  if (node.type === "hardBreak") return <br key={node.id} {...props} />;
  if (node.type === "codeBlock") {
    return <pre key={node.id} {...props}><code {...(node.attrs.language === null ? {} : { className: `language-${node.attrs.language}` })}>{content}</code></pre>;
  }
  if (node.type === "orderedList") return <ol key={node.id} {...props} start={node.attrs.start}>{content}</ol>;
  if (node.type.includes("/") && renderExtension) return renderExtension(node, content);
  const element = node.type === "paragraph" ? "p"
    : node.type === "blockquote" ? "blockquote"
    : node.type === "bulletList" ? "ul"
    : node.type === "listItem" ? "li"
    : "div";
  return createElement(element, { key: node.id, ...props }, content);
}, (previous, next) => (
  previous.node === next.node
  && previous.schema === next.schema
  && previous.editable === next.editable
  && previous.renderExtension === next.renderExtension
  && previous.renderExtensionMark === next.renderExtensionMark
  && previous.renderUnknown === next.renderUnknown
));

function wrapMark(
  mark: RichTextMark,
  children: ReactNode,
  key: string,
  renderExtensionMark: RichTextRendererProps["renderExtensionMark"],
): ReactNode {
  if (mark.type.includes("/") && renderExtensionMark) return renderExtensionMark(mark, [children]);
  const element = markElement(mark);
  return createElement(element.type, { ...element.props, key }, children);
}

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
