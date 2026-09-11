/** A source-only Markdown edit; the consumer applies it to its existing history. */
export interface MarkdownSourceEdit {
  readonly value: string;
  readonly selection: { readonly anchor: number; readonly focus: number };
}
export function assertMarkdownSelection(source: string, selection: MarkdownSourceEdit["selection"]): void {
  for (const offset of [selection.anchor, selection.focus]) {
    if (!Number.isInteger(offset) || offset < 0 || offset > source.length) throw new RangeError("Invalid Markdown selection");
  }
}
