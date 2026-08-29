export interface WebTextControl {
  readonly value: string;
  readonly selectionStart: number | null;
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

export function isWebEditableTarget(target: object | null): boolean {
  if (!(target instanceof Element)) return false;
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable)
    || target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}
