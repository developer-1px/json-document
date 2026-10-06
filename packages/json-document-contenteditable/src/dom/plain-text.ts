import { clampTextSelection } from "@interactive-os/json-document-editing";
import type { DOMObservation, TextDOMAdapter, TextDOMSelectionOptions, TextSelection } from "../types.js";
import { textDOMIndex } from "./text-index.js";

export const plainTextDOMAdapter: TextDOMAdapter = Object.freeze({
  observe(root: HTMLElement): DOMObservation {
    const index = textDOMIndex(root);
    const selection = root.ownerDocument.getSelection();
    const anchor = selection?.anchorNode ? index.offset(selection.anchorNode, selection.anchorOffset) : null;
    const focus = selection?.focusNode ? index.offset(selection.focusNode, selection.focusOffset) : null;
    return { value: index.value, selection: anchor === null || focus === null ? null : { anchor, focus } };
  },
  render(root: HTMLElement, value: string): void {
    const first = root.firstChild;
    const stable = first?.nodeType === 3 && first.textContent === value && (root.childNodes.length === 1
      || (root.childNodes.length === 2 && root.lastElementChild?.matches("br[data-contenteditable-caret]")));
    if (!stable) root.replaceChildren(root.ownerDocument.createTextNode(value));
    renderTextCaretBoundary(root, value);
  },
  restoreSelection: restoreTextDOMSelection,
});

/** Gives a terminal empty line a caret position without adding source text. */
export function renderTextCaretBoundary(root: HTMLElement, value: string): void {
  const boundaries = Array.from(root.querySelectorAll("br[data-contenteditable-caret]"));
  const needed = value.length === 0 || value.endsWith("\n");
  const existing = boundaries.length === 1 && boundaries[0] === root.lastChild;
  if (needed && existing) return;
  boundaries.forEach(node => node.remove());
  if (!needed) return;
  const boundary = root.ownerDocument.createElement("br");
  boundary.dataset.contenteditableCaret = "";
  root.append(boundary);
}

/** Restore source selection once, with projection-defined affinity at shared DOM boundaries. */
export function restoreTextDOMSelection(root: HTMLElement, selection: TextSelection,
  options: TextDOMSelectionOptions = {},
): boolean {
  if (!root.isConnected) return false;
  const index = textDOMIndex(root);
  const clamped = clampTextSelection(index.value, selection);
  const domSelection = root.ownerDocument.getSelection();
  if (domSelection === null) return false;
  const position = (offset: number, node: Node | null, nodeOffset: number) => {
    const affinity = options.affinity?.(offset);
    // Equivalent source positions can lie on different visual lines or sides of a block.
    if (affinity === undefined && node && index.offset(node, nodeOffset) === offset) return {node, offset: nodeOffset};
    return index.position(offset, affinity);
  };
  const anchor = position(clamped.anchor, domSelection.anchorNode, domSelection.anchorOffset);
  const focus = position(clamped.focus, domSelection.focusNode, domSelection.focusOffset);
  if (domSelection.anchorNode === anchor.node && domSelection.anchorOffset === anchor.offset
    && domSelection.focusNode === focus.node && domSelection.focusOffset === focus.offset) return true;
  try {
    domSelection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
    return true;
  } catch {
    return false;
  }
}
