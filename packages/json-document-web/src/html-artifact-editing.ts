import { createWebKeyboardAdapter } from "./keyboard.js";

export interface WebHTMLNodeSelection {
  readonly id: string;
  readonly text: string;
  readonly editableText: boolean;
  readonly color: string;
  readonly backgroundColor: string;
  readonly fontSize: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Parent-owned events for a script-disabled, same-origin iframe. No injected script. */
export function bindWebHTMLArtifactEditing(frame: { readonly contentDocument: unknown; readonly contentWindow: unknown }, options: {
  readonly selectedId?: string;
  readonly onSelect: (selection: WebHTMLNodeSelection | null) => void;
  readonly onCommitText: (id: string, text: string) => boolean;
  readonly onEditingChange: (editing: boolean) => void;
  readonly onHistory: (action: "undo" | "redo") => void;
  readonly onExit: () => void;
}) {
  const doc = frame.contentDocument as Document | null;
  const win = frame.contentWindow as Window | null;
  if (!doc || !win) return () => {};
  const keyboard = createWebKeyboardAdapter();
  let selected: HTMLElement | null = null;
  let editing: { node: HTMLElement; before: string; cursor: string; cursorPriority: string } | null = null;
  const selectable = (node: Element | null): node is HTMLElement => !!node && node.hasAttribute("data-node-id") && !["style", "meta", "title"].includes(node.localName);
  const refresh = () => {
    if (!selected?.isConnected) { options.onSelect(null); return; }
    const rect = selected.getBoundingClientRect(), css = win.getComputedStyle(selected);
    options.onSelect({ id: selected.dataset.nodeId!, text: selected.textContent ?? "", editableText: selected.children.length === 0 && selected.localName !== "img",
      color: css.color, backgroundColor: css.backgroundColor, fontSize: parseFloat(css.fontSize),
      x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  };
  const finish = (cancel = false) => {
    if (!editing) return true;
    const { node, before, cursor, cursorPriority } = editing;
    const text = node.innerText;
    if (!cancel && text !== before && !options.onCommitText(node.dataset.nodeId!, text)) return false;
    editing = null;
    node.removeAttribute("contenteditable");
    if (cursor) node.style.setProperty("cursor", cursor, cursorPriority);
    else node.style.removeProperty("cursor");
    if (cancel) node.textContent = before;
    options.onEditingChange(false); refresh(); return true;
  };
  const select = (node: HTMLElement | null) => { selected = node; refresh(); };
  const target = (event: Event) => {
    const element = event.target as Element | null;
    const node = element?.closest?.("[data-node-id]") ?? null;
    return selectable(node) ? node : null;
  };
  const pointer = (event: Event) => {
    if (editing && target(event) === editing.node) return;
    if (!finish()) { event.preventDefault(); return; }
    select(target(event));
  };
  const begin = () => {
    if (!selected || selected.children.length || selected.localName === "img" || editing) return;
    editing = { node: selected, before: selected.textContent ?? "", cursor: selected.style.cursor, cursorPriority: selected.style.getPropertyPriority("cursor") };
    selected.contentEditable = "plaintext-only";
    selected.style.cursor = "text";
    options.onEditingChange(true);
    selected.focus();
    const range = doc.createRange(); range.selectNodeContents(selected);
    const selection = win.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  };
  const doubleClick = (event: Event) => { if (!finish()) return; select(target(event)); begin(); };
  const key = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === "Escape") { event.preventDefault(); if (editing) finish(true); else options.onExit(); return; }
    if (editing) {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); finish(); }
      return; // Native text undo belongs to the active editable element.
    }
    const command = keyboard.resolve(event);
    if (command?.type === "undo" || command?.type === "redo") { event.preventDefault(); options.onHistory(command.type); }
    else if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); begin(); }
  };
  const blur = (event: FocusEvent) => { if (editing && event.target === editing.node) finish(); };
  doc.addEventListener("pointerdown", pointer);
  doc.addEventListener("dblclick", doubleClick);
  doc.addEventListener("keydown", key);
  doc.addEventListener("focusout", blur);
  doc.addEventListener("input", refresh);
  const observer = new ResizeObserver(refresh); observer.observe(doc.body);
  if (options.selectedId) select(Array.from(doc.querySelectorAll<HTMLElement>("[data-node-id]")).find(node => node.dataset.nodeId === options.selectedId) ?? null);
  return () => {
    observer.disconnect();
    doc.removeEventListener("pointerdown", pointer); doc.removeEventListener("dblclick", doubleClick);
    doc.removeEventListener("keydown", key); doc.removeEventListener("focusout", blur); doc.removeEventListener("input", refresh);
  };
}
