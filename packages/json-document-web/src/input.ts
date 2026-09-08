import type { SelectionRange } from "@interactive-os/json-document-selection";

export interface WebTextControl {
  readonly value: string;
  readonly selectionStart: number | null;
  readonly selectionEnd?: number | null;
  readonly selectionDirection?: "forward" | "backward" | "none" | null;
}

export interface WebTextControlEvent {
  readonly currentTarget: WebTextControl;
}

export interface WebTextInput {
  readonly text: string;
  readonly offset: number;
}

export function textInputFromControl(event: WebTextControlEvent): WebTextInput {
  const text = event.currentTarget.value;
  const offset = event.currentTarget.selectionStart ?? text.length;
  return { text, offset: Math.min(text.length, Math.max(0, offset)) };
}

/** Projects a native text control's directional selection into anchor/focus offsets. */
export function textSelectionFromControl(event: WebTextControlEvent): SelectionRange<number> {
  const { text, offset: start } = textInputFromControl(event);
  const end = Math.min(text.length, Math.max(start, event.currentTarget.selectionEnd ?? start));
  return event.currentTarget.selectionDirection === "backward"
    ? { anchor: end, focus: start }
    : { anchor: start, focus: end };
}

export function isWebEditableTarget(target: object | null): boolean {
  if (!(target instanceof Element)) return false;
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable)
    || target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

/** Whether a DOM target belongs to this host rather than a nested editing boundary. */
export function isWebEditingHostTarget(root: object, target: object | null): boolean {
  const view = (root as HTMLElement).ownerDocument?.defaultView;
  if (!view || !(root instanceof view.HTMLElement) || !(target instanceof view.Node) || !root.contains(target)) return false;
  let element = target instanceof view.Element ? target : target.parentElement;
  while (element !== null && element !== root) {
    if (["input", "textarea", "select", "option"].includes(element.localName)) return false;
    const editable = (element.getAttribute("contenteditable")
      ?? ("contentEditable" in element ? String(element.contentEditable) : "inherit")).toLowerCase();
    if (["", "true", "plaintext-only", "false"].includes(editable)) return false;
    element = element.parentElement;
  }
  return element === root;
}
