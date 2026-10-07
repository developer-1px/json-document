import type { SheetHandProps } from "@interactive-os/json-document-sheet";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { MarkdownCellEditor } from "./MarkdownCellEditor.js";

/** One inline Markdown presentation for both resting cells and editing drafts. */
export const markdownSheetPresentation = {
  renderCell: value => <MarkdownRenderer content={value} components={{p: ({children}) => <span>{children}</span>}} />,
  renderEditor: props => <MarkdownCellEditor {...props} />,
} satisfies Required<Pick<SheetHandProps, "renderCell" | "renderEditor">>;
