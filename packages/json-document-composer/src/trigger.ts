import type { RichTextDocument, RichTextSelection } from "@interactive-os/json-document-rich-text";
import { findRichTextSuggestionTrigger } from "@interactive-os/json-document-rich-text-suggestion";
import type { ComposerTrigger } from "./model.js";

export function findComposerTrigger(document: RichTextDocument, selection: RichTextSelection): ComposerTrigger | null {
  const match = findRichTextSuggestionTrigger(document, selection, ["/", "@"]) ;
  if (match === null) return null;
  return {
    kind: match.trigger === "/" ? "skill" : "mention",
    query: match.query.toLowerCase(),
    range: match.range,
  };
}
