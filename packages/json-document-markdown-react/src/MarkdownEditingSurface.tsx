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
      document: editor.document, pointer: editor.pointer, editor, root, dom: createMarkdownDOMAdapter(),
    });
    return binding.bind();
  }, [editor]);
  return <div {...props} ref={rootRef} role="textbox" aria-multiline="true" contentEditable suppressContentEditableWarning style={{ ...style, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />;
}
