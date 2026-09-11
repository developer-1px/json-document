import { createMarkdownParser, type MarkdownParser } from "@interactive-os/json-document-markdown";
import { diffText } from "@interactive-os/json-document-editing";
import { plainTextDOMAdapter, renderTextCaretBoundary, type TextDOMAdapter, type TextSelection } from "@interactive-os/json-document-contenteditable";
import { sourceRuns, type SourceRun } from "./source-runs.js";

interface RenderedRun {
  run: SourceRun;
  readonly element: HTMLElement;
  text?: Text;
  children: RenderedRun[];
}
interface Surface {
  readonly parser: MarkdownParser;
  runs: RenderedRun[];
  readonly observer: MutationObserver;
  dirty: boolean;
  initialized: boolean;
  selection: TextSelection | null | undefined;
}

/** Source-preserving CommonMark/GFM DOM; all editing still uses source coordinates. */
export function createMarkdownDOMAdapter(): TextDOMAdapter {
  const surfaces = new WeakMap<HTMLElement, Surface>();
  const reveal = (surface: Surface, selection: TextSelection | null): void => {
    if (surface.observer.takeRecords().length) surface.dirty = true;
    if (surface.dirty) surface.selection = undefined;
    if (surface.selection === selection || (selection && surface.selection?.anchor === selection.anchor && surface.selection.focus === selection.focus)) return;
    const visit = ({ element, run, children }: RenderedRun): void => {
      if (run.owner) {
        const active = selection !== null && Math.max(selection.anchor, selection.focus) >= run.owner.from && Math.min(selection.anchor, selection.focus) <= run.owner.to;
        if (run.conceal) element.hidden = run.conceal === "always" || !active;
        else if (run.kind === "imagePreview") element.hidden = active;
        else if (element.getAttribute("data-markdown-active") !== String(active)) element.setAttribute("data-markdown-active", String(active));
      }
      children.forEach(visit);
    };
    surface.runs.forEach(visit);
    surface.selection = selection;
    surface.observer.takeRecords();
  };
  return {
    observe: (root) => plainTextDOMAdapter.observe(root),
    resolveHorizontalSelection(root, selection, direction, extend) {
      let result: TextSelection | null = null;
      const collapsed = selection.anchor === selection.focus;
      const visit = ({ run, children }: RenderedRun): void => {
        if ("data-markdown-heading-marker" in run.attributes) {
          const focus = !extend && !collapsed
            ? (direction === "backward" ? Math.min(selection.anchor, selection.focus) : Math.max(selection.anchor, selection.focus))
            : selection.focus;
          if (focus >= run.from && focus <= run.to) {
            if (!extend && !collapsed) result = { anchor: focus, focus };
            else if (direction === "backward" ? focus > run.from : focus < run.to) {
              const next = focus + (direction === "backward" ? -1 : 1);
              result = { anchor: extend ? selection.anchor : next, focus: next };
            }
          }
        }
        children.forEach(visit);
      };
      surfaces.get(root)?.runs.forEach(visit);
      return result;
    },
    render(root, source, selection = null) {
      let surface = surfaces.get(root);
      if (!surface) {
        const observer = new MutationObserver(records => { if (records.length) surface!.dirty = true; });
        surface = { parser: createMarkdownParser(source), runs: [], observer, dirty: false, initialized: false, selection: undefined };
        observer.observe(root, { childList: true, characterData: true, attributes: true, subtree: true });
        surfaces.set(root, surface);
        root.setAttribute("data-markdown-editor", "");
      }
      if (surface.observer.takeRecords().length) surface.dirty = true;
      const previous = surface.parser.projection.source;
      const changed = previous !== source;
      if (changed || !surface.initialized || surface.dirty) {
        if (changed) {
          const edit = diffText(previous, source)!;
          surface.parser.update(edit.from, edit.to, edit.insert);
        }
        surface.runs = reconcileRuns(root, surface.runs, sourceRuns(surface.parser.projection));
        renderTextCaretBoundary(root, source);
        surface.observer.takeRecords();
        surface.dirty = false;
        surface.initialized = true;
        surface.selection = undefined;
      }
      reveal(surface, selection);
    },
    restoreSelection(root, selection) {
      const surface = surfaces.get(root);
      if (surface) reveal(surface, selection);
      // The end of an absolutely positioned prefix and the start of its body
      // share a source offset. Prefer the body so native arrows can leave the gutter.
      const bodyStart = (offset: number): Text | null => {
        let result: Text | null = null;
        const visit = (entry: RenderedRun): void => {
          if (entry.run.to === offset && "data-markdown-heading-marker" in entry.run.attributes && entry.text) {
            const walker = root.ownerDocument.createTreeWalker(root, 4);
            walker.currentNode = entry.text;
            result = walker.nextNode() as Text | null;
          }
          entry.children.forEach(visit);
        };
        surface?.runs.forEach(visit);
        return result;
      };
      const anchor = bodyStart(selection.anchor), focus = bodyStart(selection.focus);
      const native = root.ownerDocument.getSelection();
      const observed = plainTextDOMAdapter.observe(root).selection;
      if (observed?.anchor === selection.anchor && observed.focus === selection.focus
        && (!anchor || (native?.anchorNode === anchor && native.anchorOffset === 0))
        && (!focus || (native?.focusNode === focus && native.focusOffset === 0))) return true;
      if (!plainTextDOMAdapter.restoreSelection(root, selection)) return false;
      if (native && (anchor || focus)) native.setBaseAndExtent(
        anchor ?? native.anchorNode!, anchor ? 0 : native.anchorOffset,
        focus ?? native.focusNode!, focus ? 0 : native.focusOffset,
      );
      return true;
    },
  };
}

/** Reuse unchanged prefixes/suffixes and preserve text-node identity while typing. */
function reconcileRuns(parent: HTMLElement, previous: RenderedRun[], next: ReadonlyArray<SourceRun>): RenderedRun[] {
  const matches = (entry: RenderedRun, run: SourceRun) => entry.run.kind === run.kind && entry.run.value === run.value;
  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && matches(previous[prefix]!, next[prefix]!)) prefix++;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < next.length - prefix && matches(previous[previous.length - suffix - 1]!, next[next.length - suffix - 1]!)) suffix++;
  const result: RenderedRun[] = [];
  let cursor = parent.firstChild;
  for (const [index, run] of next.entries()) {
    let entry = index < prefix ? previous[index] : index >= next.length - suffix ? previous[previous.length - (next.length - index)] : index < previous.length - suffix ? previous[index] : undefined;
    if (!entry || entry.run.kind !== run.kind) {
      const element = parent.ownerDocument.createElement(run.tag);
      if (run.tag === "a") element.addEventListener("click", event => { if (!event.metaKey && !event.ctrlKey) event.preventDefault(); });
      entry = { run, element, children: [] };
    }
    const { element } = entry;
    for (const attribute of Array.from(element.attributes)) if (!(attribute.name in run.attributes)) element.removeAttribute(attribute.name);
    for (const [name, value] of Object.entries(run.attributes)) if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    if (run.value !== undefined) {
      entry.text ??= parent.ownerDocument.createTextNode(run.value);
      if (entry.text.data !== run.value) entry.text.data = run.value;
      if (element.childNodes.length !== 1 || element.firstChild !== entry.text) element.replaceChildren(entry.text);
    } else entry.children = reconcileRuns(element, entry.children, run.children ?? []);
    if (element === cursor) cursor = cursor.nextSibling;
    else parent.insertBefore(element, cursor);
    entry.run = run;
    result.push(entry);
  }
  while (cursor) { const nextSibling = cursor.nextSibling; cursor.remove(); cursor = nextSibling; }
  return result;
}
