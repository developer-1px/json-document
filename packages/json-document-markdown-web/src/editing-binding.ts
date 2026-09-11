import { createContentEditableBinding, type ContentEditableBinding } from "@interactive-os/json-document-contenteditable";
import type { TextEditor } from "@interactive-os/json-document-editing";
import { indentMarkdownList, insertMarkdownParagraph } from "@interactive-os/json-document-markdown";
import { createMarkdownDOMAdapter } from "./markdown-dom.js";

export interface MarkdownEditingBindingOptions {
  readonly editor: TextEditor;
  readonly root: HTMLElement;
}

/** Connect Markdown DOM, syntax-owned Enter, and the editor's existing history. */
export function createMarkdownEditingBinding({editor, root}: MarkdownEditingBindingOptions): ContentEditableBinding {
  return createContentEditableBinding({
    document: editor.document, pointer: editor.pointer, editor, root,
    dom: createMarkdownDOMAdapter({editor}),
    indent(editor, direction) {
      const next = indentMarkdownList(editor.text, editor.snapshot.selection, direction);
      return next ? editor.replace(next.value, next.selection) : null;
    },
    insertBreak(editor) {
      const next = insertMarkdownParagraph(editor.text, editor.snapshot.selection);
      return editor.replace(next.value, next.selection);
    },
  });
}
