import { useEffect, useRef, type HTMLAttributes } from "react";
import { markdownTableBoundary, readMarkdownTable } from "@interactive-os/json-document-markdown";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { createRoot } from "react-dom/client";
import { SheetHand } from "@interactive-os/json-document-sheet";
import { createMarkdownTableEditor } from "./markdown-table-editor.js";
import type { TextEditor } from "@interactive-os/json-document-editing";
import { createMarkdownEditingBinding } from "@interactive-os/json-document-markdown-web";

export interface MarkdownEditingSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "contentEditable"> {
  readonly editor: TextEditor;
}

/** Markdown source editing, independent of the Rich Text document and renderer. */
export function MarkdownEditingSurface({ editor, style, ...props }: MarkdownEditingSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const disposals = new Set<() => void>();
    const binding = createMarkdownEditingBinding({editor, root, mountTable(element, position) {
      const reactRoot = createRoot(element);
      const table = createMarkdownTableEditor(editor, position);
      reactRoot.render(<SheetHand editor={table} headerRow onExit={edge => {
        const current = readMarkdownTable(editor.text, position());
        if (!current) return;
        const offset = markdownTableBoundary(editor.text, current, edge);
        root.focus(); editor.select({anchor: offset, focus: offset});
      }} renderCell={value => <MarkdownRenderer content={value} components={{p: ({children}) => <span>{children}</span>}} />} />);
      const dispose = () => {disposals.delete(dispose); queueMicrotask(() => reactRoot.unmount());};
      disposals.add(dispose);
      return dispose;
    }});
    const unbind = binding.bind();
    return () => {unbind(); disposals.forEach(dispose => dispose());};
  }, [editor]);
  return <div {...props} ref={rootRef} role="textbox" aria-multiline="true" contentEditable suppressContentEditableWarning style={{ ...style, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />;
}
