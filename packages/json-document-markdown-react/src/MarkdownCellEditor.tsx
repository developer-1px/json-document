import {useEffect, useRef, useState} from "react";
import {createJSONDocument} from "@interactive-os/json-document";
import {createTextEditor} from "@interactive-os/json-document-editing";
import {createMarkdownEditingBinding} from "@interactive-os/json-document-markdown-web";
import type {SheetCellEditorProps} from "@interactive-os/json-document-sheet";

/** A draft-only Markdown editor. The table's editor owns the persisted source and its history. */
export function MarkdownCellEditor({label,value,onValueChange,style,onKeyDown,onBlur}: SheetCellEditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const change = useRef(onValueChange);change.current = onValueChange;
  const [editor] = useState(() => createTextEditor(createJSONDocument(value)));
  useEffect(() => {
    if (!root.current) return;
    const element = root.current;
    let observed = editor.text;
    const unsubscribe = editor.subscribe(() => {if (editor.text !== observed) {observed=editor.text;change.current(observed);}});
    const binding = createMarkdownEditingBinding({editor,root:element,revealSyntax:false});
    const unbind = binding.bind();
    element.focus();editor.select({anchor:0,focus:editor.text.length});
    return () => {unsubscribe();unbind();};
  }, [editor]);
  useEffect(() => {if (editor.text !== value) editor.replace(value,editor.snapshot.selection);}, [editor,value]);
  return <div ref={root} role="textbox" aria-label={label} aria-multiline="false" contentEditable suppressContentEditableWarning
    onPointerDown={event => event.stopPropagation()} onKeyDown={onKeyDown} onBlur={onBlur} style={style} />;
}
