import { insertMarkdownParagraph } from "@interactive-os/json-document-markdown";
import { useEffect, useRef, type HTMLAttributes } from "react";
import type { TextEditor } from "@interactive-os/json-document-editing";
import { createContentEditableBinding } from "@interactive-os/json-document-contenteditable";
import { createMarkdownDOMAdapter } from "@interactive-os/json-document-markdown-web";

export interface MarkdownEditingSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "contentEditable"> {
  readonly editor: TextEditor;
}

/** Markdown source editing, independent of the Rich Text document and renderer. */
export function MarkdownEditingSurface({ editor, style, ...props }: MarkdownEditingSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const binding = createContentEditableBinding({
      document: editor.document, pointer: editor.pointer, editor, root,
      insertBreak: editor => {
        const next = insertMarkdownParagraph(editor.text, editor.snapshot.selection);
        return editor.replace(next.value, next.selection);
      },
      dom: createMarkdownDOMAdapter({editor}),
    });
    return binding.bind();
  }, [editor]);
  return <div {...props} ref={rootRef} role="textbox" aria-multiline="true" contentEditable suppressContentEditableWarning style={{ ...style, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />;
}
