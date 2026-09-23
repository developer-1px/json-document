import type { MarkdownChangedRange, MarkdownProjection, MarkdownStrongSpan } from "@interactive-os/json-document-markdown";

export interface SourceRun {
  readonly from: number;
  readonly to: number;
  readonly kind: "text" | "strong" | "delimiter";
  readonly owner?: MarkdownStrongSpan;
}

/** Sweep syntax boundaries once; do not search every span for every DOM run. */
export function sourceRuns(projection: MarkdownProjection, from = 0, to = projection.source.length): SourceRun[] {
  interface Boundary { content: number; opens: MarkdownStrongSpan[]; closes: MarkdownStrongSpan[] }
  const boundaries = new Map<number, Boundary>();
  const at = (offset: number): Boundary => {
    let value = boundaries.get(offset);
    if (!value) boundaries.set(offset, value = { content: 0, opens: [], closes: [] });
    return value;
  };
  at(from); at(to);
  for (const span of projection.strong) {
    if (span.from < from || span.to > to) continue;
    at(span.from).opens.push(span);
    at(span.contentFrom).closes.push(span);
    at(span.contentFrom).content++;
    at(span.contentTo).content--;
    at(span.contentTo).opens.push(span);
    at(span.to).closes.push(span);
  }
  const offsets = [...boundaries.keys()].sort((a, b) => a - b);
  const owners = new Set<MarkdownStrongSpan>();
  let content = 0;
  const runs: SourceRun[] = [];
  for (let index = 0; index < offsets.length - 1; index++) {
    const from = offsets[index]!;
    const boundary = boundaries.get(from)!;
    for (const owner of boundary.closes) owners.delete(owner);
    for (const owner of boundary.opens) owners.add(owner);
    content += boundary.content;
    const owner = owners.values().next().value;
    runs.push({ from, to: offsets[index + 1]!, kind: owner ? "delimiter" : content > 0 ? "strong" : "text", ...(owner ? { owner } : {}) });
  }
  return runs;
}

/** The parser invalidates complete blocks; unaffected runs only need their source offsets moved. */
export function updateSourceRuns(previous: ReadonlyArray<SourceRun>, projection: MarkdownProjection, changed: MarkdownChangedRange): SourceRun[] {
  const before: SourceRun[] = [], after: SourceRun[] = [];
  const delta = changed.newTo - changed.to;
  const owners = new Map<MarkdownStrongSpan, MarkdownStrongSpan>();
  const move = (owner: MarkdownStrongSpan): MarkdownStrongSpan => {
    if (delta === 0) return owner;
    let shifted = owners.get(owner);
    if (!shifted) {
      shifted = { from: owner.from + delta, to: owner.to + delta, contentFrom: owner.contentFrom + delta, contentTo: owner.contentTo + delta };
      owners.set(owner, shifted);
    }
    return shifted;
  };
  for (const run of previous) {
    if (run.from < changed.from) before.push(run.to <= changed.from ? run : { ...run, to: changed.from });
    if (run.to > changed.to) after.push({ ...run, from: Math.max(run.from, changed.to) + delta, to: run.to + delta, ...(run.owner ? { owner: move(run.owner) } : {}) });
  }
  const result: SourceRun[] = [];
  for (const run of [...before, ...sourceRuns(projection, changed.from, changed.newTo), ...after]) {
    const tail = result[result.length - 1];
    if (tail?.kind === "text" && run.kind === "text" && tail.to === run.from) result[result.length - 1] = { ...tail, to: run.to };
    else if (run.to > run.from) result.push(run);
  }
  return result;
}
