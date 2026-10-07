import { decodeString } from "micromark-util-decode-string";
import type { RootContent } from "mdast";
import type { Extension, Handle } from "mdast-util-from-markdown";

/** Recognized syntax only: code/HTML contents and unmatched punctuation are not markers. */
export type MarkdownMarkerKind = "heading" | "setext" | "list" | "blockquote" | "task" | "fence" | "code" | "emphasis" | "strong" | "delete" | "link" | "image" | "definition" | "table" | "thematicBreak" | "escape" | "break" | "footnote" | "entity";
export interface MarkdownMarker {
  readonly kind: MarkdownMarkerKind;
  readonly from: number;
  readonly to: number;
  /** Decoded character reference; other marker kinds have no replacement value. */
  readonly value?: string;
}

// These token enter events have no mdast node-building handler. Observing them
// preserves the existing compiler and captures syntax in the same parse pass.
const tokenKinds: Readonly<Record<string, MarkdownMarkerKind>> = {
  atxHeadingSequence: "heading", setextHeadingLineSequence: "setext",
  listItemPrefix: "list", blockQuoteMarker: "blockquote", taskListCheck: "task",
  codeFencedFenceSequence: "fence", codeTextSequence: "code",
  emphasisSequence: "emphasis", strongSequence: "strong", strikethroughSequence: "delete",
  labelMarker: "link", labelImageMarker: "image", resourceMarker: "link",
  resourceTitleMarker: "link", autolinkMarker: "link", referenceMarker: "link",
  definitionLabelMarker: "definition", definitionMarker: "definition",
  definitionDestinationLiteralMarker: "definition", definitionTitleMarker: "definition",
  tableCellDivider: "table", tableDelimiterMarker: "table", tableDelimiterFiller: "table",
  thematicBreakSequence: "thematicBreak", escapeMarker: "escape", characterReferenceMarker: "entity",
  gfmFootnoteCallLabelMarker: "footnote", gfmFootnoteCallMarker: "footnote",
  gfmFootnoteDefinitionLabelMarker: "footnote", gfmFootnoteDefinitionMarker: "footnote",
};

export function captureMarkdownMarkers(source: string, markers: MarkdownMarker[]): Extension {
  const enter: Record<string, Handle> = {};
  for (const [token, kind] of Object.entries(tokenKinds)) enter[token] = token => {
    const from = token.start.offset;
    if (kind === "entity") {
      if (source[from] !== "&") return;
      const to = source.indexOf(";", from) + 1;
      markers.push(Object.freeze({kind, from, to, value:decodeString(source.slice(from, to))}));
      return;
    }
    const to = kind === "list" ? token.end.offset - (source.slice(from, token.end.offset).match(/[ \t]+$/)?.[0].length ?? 0) : token.end.offset;
    if (to > from) markers.push(Object.freeze({kind, from, to}));
  };
  return {enter, transforms: [tree => {
    // Hard-break compiler handlers construct nodes; preserve those handlers and
    // collect their syntax prefix from the completed node instead of overriding them.
    const visit = (nodes: ReadonlyArray<RootContent>): void => {
      for (const node of nodes) {
        if (node.type === "break") {
          const from = node.position!.start.offset!;
          const end = node.position!.end.offset!;
          const to = end - (source.slice(from, end).match(/(?:\r\n|\r|\n)$/)?.[0].length ?? 0);
          if (to > from) markers.push(Object.freeze({kind:"break", from, to}));
        }
        if ("children" in node) visit(node.children);
      }
    };
    visit(tree.children);
    return tree;
  }]};
}

export function offsetMarker(marker: MarkdownMarker, offset: number): MarkdownMarker {
  return offset === 0 ? marker : Object.freeze({...marker, from: marker.from + offset, to: marker.to + offset});
}
