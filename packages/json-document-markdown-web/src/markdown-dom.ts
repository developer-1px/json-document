import { createWebKeyboardAdapter } from "@interactive-os/json-document-web";
import { createMarkdownParser, setMarkdownTaskChecked, type MarkdownParser } from "@interactive-os/json-document-markdown";
import { diffText, type TextEditor } from "@interactive-os/json-document-editing";
import { plainTextDOMAdapter, renderTextCaretBoundary, createTextProjectionDOMAdapter, type TextProjection, type TextDOMAdapter, type TextSelection } from "@interactive-os/json-document-contenteditable";
import { sourceRuns, type SourceRun } from "./source-runs.js";

const keyboard = createWebKeyboardAdapter();

type TaskAction = "toggle" | "undo" | "redo";

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

export interface MarkdownDOMOptions {
  /** Enables task controls using the existing source editor and its history. */
  readonly editor?: TextEditor;
}

/** Source-preserving CommonMark/GFM DOM; all editing still uses source coordinates. */
export function createMarkdownDOMAdapter(options: MarkdownDOMOptions = {}): TextDOMAdapter {
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
  return createTextProjectionDOMAdapter({
    observe: (root) => plainTextDOMAdapter.observe(root),
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
        surface.runs = reconcileRuns(root, surface.runs, sourceRuns(surface.parser.projection), (run, input, action) => {
          const editor = options.editor;
          const task = run.task!;
          const current = surface!.parser.projection.source;
          if (!editor || root.getAttribute("contenteditable") === "false" || editor.text !== current || plainTextDOMAdapter.observe(root).value !== current) {
            input.checked = task.checked;
            return;
          }
          const checked = input.checked;
          const result = action === "toggle"
            ? editor.replace(setMarkdownTaskChecked(current, task.from, checked), editor.snapshot.selection)
            : editor[action]();
          if (!result.ok) input.checked = task.checked;
          if (input.isConnected) input.focus({preventScroll:true});
        }, !!options.editor && root.getAttribute("contenteditable") !== "false");
        renderTextCaretBoundary(root, source);
        surface.observer.takeRecords();
        surface.dirty = false;
        surface.initialized = true;
        surface.selection = undefined;
      }
      reveal(surface, selection);
    },
    restoreSelection(root, selection, options) {
      const surface = surfaces.get(root);
      if (surface) reveal(surface, selection);
      return plainTextDOMAdapter.restoreSelection(root, selection, options);
    },
  }, root => {
    const result: TextProjection[] = [];
    const visit = ({run, element, children}: RenderedRun): void => {
      if (run.projection) result.push({from: run.from, element, ...run.projection});
      children.forEach(visit);
    };
    surfaces.get(root)?.runs.forEach(visit);
    return result;
  });
}

/** Reuse unchanged prefixes/suffixes and preserve text-node identity while typing. */
function reconcileRuns(parent: HTMLElement, previous: RenderedRun[], next: ReadonlyArray<SourceRun>,
  onTaskChange: (run: SourceRun, input: HTMLInputElement, action: TaskAction) => void, tasksEnabled: boolean): RenderedRun[] {
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
    } else entry.children = reconcileRuns(element, entry.children, run.children ?? [], onTaskChange, tasksEnabled);
    if (run.task) {
      const input = element as HTMLInputElement;
      input.checked = run.task.checked;
      input.disabled = !tasksEnabled;
      input.onchange = () => onTaskChange(entry!.run, input, "toggle");
      input.onkeydown = event => {
        if (event.isComposing || event.keyCode === 229) return;
        const command = keyboard.resolve(event);
        if (command?.type !== "undo" && command?.type !== "redo") return;
        event.preventDefault();
        onTaskChange(entry!.run, input, command.type);
      };
    }
    if (element === cursor) cursor = cursor.nextSibling;
    else parent.insertBefore(element, cursor);
    entry.run = run;
    result.push(entry);
  }
  while (cursor) { const nextSibling = cursor.nextSibling; cursor.remove(); cursor = nextSibling; }
  return result;
}
