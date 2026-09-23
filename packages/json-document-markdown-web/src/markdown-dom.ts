import { createMarkdownParser, type MarkdownParser, type MarkdownProjection } from "@interactive-os/json-document-markdown";
import { diffText } from "@interactive-os/json-document-editing";
import { plainTextDOMAdapter, renderTextCaretBoundary, type TextDOMAdapter, type TextSelection } from "@interactive-os/json-document-contenteditable";
import { sourceRuns, updateSourceRuns, type SourceRun } from "./source-runs.js";

interface RenderedRun {
  run: SourceRun;
  value: string;
  readonly element: HTMLElement;
  readonly text: Text;
}
interface Surface {
  readonly parser: MarkdownParser;
  projection: MarkdownProjection;
  runs: RenderedRun[];
  readonly observer: MutationObserver;
  readonly mutations: MutationRecord[];
  initialized: boolean;
  selection: TextSelection | null | undefined;
}

/** Source-preserving DOM projection. Reconciles source runs without replacing unchanged DOM. */
export function createMarkdownDOMAdapter(): TextDOMAdapter {
  const surfaces = new WeakMap<HTMLElement, Surface>();
  const reveal = (surface: Surface, selection: TextSelection | null): void => {
    surface.mutations.push(...surface.observer.takeRecords());
    if (surface.mutations.length) surface.selection = undefined;
    if (surface.selection === selection || (selection && surface.selection?.anchor === selection.anchor && surface.selection.focus === selection.focus)) return;
    for (const { element, run } of surface.runs) {
      if (!run.owner) continue;
      const hidden = selection === null || Math.max(selection.anchor, selection.focus) < run.owner.from || Math.min(selection.anchor, selection.focus) > run.owner.to;
      if (element.hidden !== hidden) element.hidden = hidden;
    }
    surface.selection = selection;
    surface.observer.takeRecords();
  };
  return {
    observe: (root) => plainTextDOMAdapter.observe(root),
    render(root, source, selection = null) {
      let surface = surfaces.get(root);
      if (!surface) {
        const observer = new MutationObserver(records => { surface!.mutations.push(...records); });
        const parser = createMarkdownParser(source);
        surface = { parser, projection: parser.projection, runs: [], observer, mutations: [], initialized: false, selection: undefined };
        observer.observe(root, { childList: true, characterData: true, attributes: true, subtree: true });
        surfaces.set(root, surface);
      }
      const changed = surface.projection.source !== source;
      surface.mutations.push(...surface.observer.takeRecords());
      if (changed || !surface.initialized || surface.mutations.length) {
        let runs = surface.initialized ? surface.runs.map(entry => entry.run) : sourceRuns(surface.projection);
        if (changed) {
          const edit = diffText(surface.projection.source, source)!;
          const update = surface.parser.update(edit.from, edit.to, edit.insert);
          surface.projection = update.projection;
          if (update.changed) runs = updateSourceRuns(runs, surface.projection, update.changed);
        }
        reconcileRuns(root, surface, runs);
        renderTextCaretBoundary(root, source);
        surface.observer.takeRecords();
        surface.mutations.length = 0;
        surface.initialized = true;
        surface.selection = undefined;
      }
      reveal(surface, selection);
    },
    restoreSelection(root, selection) {
      const surface = surfaces.get(root);
      if (surface) reveal(surface, selection);
      return plainTextDOMAdapter.restoreSelection(root, selection);
    },
  };
}

function reconcileRuns(root: HTMLElement, surface: Surface, next: SourceRun[]): void {
  const previous = surface.runs;
  const source = surface.projection.source;
  const damaged = new Set<Node>();
  for (const { target } of surface.mutations) {
    let node = target;
    while (node.parentNode && node.parentNode !== root) node = node.parentNode;
    damaged.add(node);
  }
  const matches = (entry: RenderedRun, run: SourceRun) => entry.run.kind === run.kind && entry.value === source.slice(run.from, run.to);
  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && matches(previous[prefix]!, next[prefix]!)) prefix++;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < next.length - prefix && matches(previous[previous.length - suffix - 1]!, next[next.length - suffix - 1]!)) suffix++;
  const runs: RenderedRun[] = [];
  let cursor = root.firstChild;
  for (let index = 0; index < next.length; index++) {
    const run = next[index]!;
    const value = source.slice(run.from, run.to);
    let entry = index < prefix ? previous[index] : index >= next.length - suffix ? previous[previous.length - (next.length - index)] : index < previous.length - suffix ? previous[index] : undefined;
    if (!entry || entry.run.kind !== run.kind) {
      const element = root.ownerDocument.createElement(run.kind === "strong" ? "strong" : "span");
      entry = { run, value, element, text: root.ownerDocument.createTextNode(value) };
      element.append(entry.text);
      if (run.owner) element.dataset.markdownDelimiter = "";
    }
    const { element, text } = entry;
    if (entry.value !== value || damaged.has(element)) {
      if (text.data !== value) text.data = value;
      if (element.childNodes.length !== 1 || element.firstChild !== text) element.replaceChildren(text);
      if (run.owner && !element.hasAttribute("data-markdown-delimiter")) element.dataset.markdownDelimiter = "";
      for (const attribute of Array.from(element.attributes)) {
        if (!(run.owner && (attribute.name === "data-markdown-delimiter" || attribute.name === "hidden"))) element.removeAttribute(attribute.name);
      }
    }
    if (element === cursor) cursor = cursor.nextSibling;
    else root.insertBefore(element, cursor);
    entry.run = run;
    entry.value = value;
    runs.push(entry);
  }
  while (cursor) { const nextSibling = cursor.nextSibling; cursor.remove(); cursor = nextSibling; }
  surface.runs = runs;
}
