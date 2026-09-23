import type { MarkdownProjection } from "./projection.js";
import { appendParagraphText, parseMarkdownSyntax, replaceLiteralText, syntaxProjection, type MarkdownBlock } from "./syntax.js";

/** Replaces an affected source region; the following region moves by newTo - to. */
export interface MarkdownChangedRange {
  readonly from: number;
  readonly to: number;
  readonly newTo: number;
}
export interface MarkdownUpdate {
  readonly projection: MarkdownProjection;
  readonly changed: MarkdownChangedRange | null;
}
export interface MarkdownParser {
  readonly projection: MarkdownProjection;
  /** Apply one replacement in the current source's half-open UTF-16 coordinates. */
  update(from: number, to: number, insert: string): MarkdownUpdate;
}

/** Persistent CommonMark projection. Uncertain grammar boundaries are reparsed in full. */
export function createMarkdownParser(source: string): MarkdownParser {
  let syntax = parseMarkdownSyntax(source);
  let projection = syntaxProjection(source, syntax);
  return {
    get projection() { return projection; },
    update(from, to, insert) {
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > source.length) throw new RangeError("Invalid Markdown edit range");
      if (typeof insert !== "string") throw new TypeError("Markdown insertion must be a string");
      if (source.slice(from, to) === insert) return { projection, changed: null };
      const nextSource = source.slice(0, from) + insert + source.slice(to);
      let index = containingBlock(syntax.blocks, from, to);
      if (index < 0 && from === source.length && to === from) index = syntax.blocks.length - 1;
      const block = syntax.blocks[index];
      let nextBlock = block ? replaceLiteralText(block, source, from, to, insert) ?? appendParagraphText(block, source, from, to, insert) : null;
      if (!nextBlock && block?.syntax.paragraph && !syntax.definitions && insideParagraphLine(source, from, to, insert, block)) {
        const parsed = parseMarkdownSyntax(source.slice(block.from, from) + insert + source.slice(to, block.to));
        const candidate = parsed.blocks[0];
        if (!parsed.definitions && parsed.blocks.length === 1 && candidate?.syntax.paragraph && candidate.from === 0) {
          nextBlock = { from: block.from, to: candidate.to + block.from, syntax: candidate.syntax };
        }
      }
      let changed: MarkdownChangedRange;
      if (block && nextBlock) {
        const delta = nextSource.length - source.length;
        syntax = { ...syntax, blocks: syntax.blocks.map((entry, at) => at < index ? entry : at === index ? nextBlock! : { ...entry, from: entry.from + delta, to: entry.to + delta }) };
        const end = Math.max(block.to, to);
        changed = { from: block.from, to: end, newTo: end + delta };
      } else {
        syntax = parseMarkdownSyntax(nextSource);
        changed = { from: 0, to: source.length, newTo: nextSource.length };
      }
      source = nextSource;
      projection = syntaxProjection(source, syntax);
      return { projection, changed };
    },
  };
}

function containingBlock(blocks: ReadonlyArray<MarkdownBlock>, from: number, to: number): number {
  let low = 0, high = blocks.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (blocks[middle]!.to < from) low = middle + 1;
    else high = middle;
  }
  const block = blocks[low];
  return block && from >= block.from && to <= block.to ? low : -1;
}

function insideParagraphLine(source: string, from: number, to: number, insert: string, block: MarkdownBlock): boolean {
  if (/[\r\n]/.test(insert) || /[\r\n]/.test(source.slice(from, to))) return false;
  const start = Math.max(block.from, source.lastIndexOf("\n", from - 1) + 1, source.lastIndexOf("\r", from - 1) + 1);
  // An unchanged leading letter rules out introducing a list, fence, definition or HTML block.
  return from > start && /^\p{L}/u.test(source.slice(start, from));
}
