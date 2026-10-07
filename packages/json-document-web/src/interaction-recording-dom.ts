export const RECORDING_EVENTS = [
  "keydown", "keyup", "compositionstart", "compositionupdate", "compositionend",
  "beforeinput", "input", "selectionchange", "focus", "blur", "pointerdown", "pointerup", "click", "paste", "cut", "copy",
] as const;

/** Passwords, explicitly private regions, and recorder controls are excluded. */
export function recordingTarget(target: unknown): HTMLElement | null {
  const node = target as Node | null;
  const element = node?.nodeType === 1 ? node as HTMLElement : node?.parentElement;
  if (!element?.closest || element.closest('[data-interaction-recorder], [data-recording-private], input[type="password"]')) return null;
  const root = element.closest<HTMLElement>('input, textarea, [contenteditable]:not([contenteditable="false"])') ?? element;
  if (root.querySelector('[data-recording-private], input[type="password"]')) return null;
  return root;
}

export function recordingDOMSnapshot(root: HTMLElement): unknown {
  const control = root as HTMLInputElement | HTMLTextAreaElement;
  const editable = root.matches('input, textarea, [contenteditable]:not([contenteditable="false"])');
  const selection = root.ownerDocument.getSelection();
  const point = (node: Node | null, offset: number) => {
    if (!node || !root.contains(node)) return null;
    const path: number[] = [];
    for (let current: Node | null = node; current && current !== root; current = current.parentNode) {
      path.unshift(Array.prototype.indexOf.call(current.parentNode!.childNodes, current));
    }
    return { path, offset };
  };
  return {
    tag: root.tagName, id: root.id, testId: root.getAttribute("data-testid"), role: root.getAttribute("role"),
    label: root.getAttribute("aria-label"),
    ...(editable ? {
      text: "value" in control ? control.value : root.textContent,
      // Plain structure preserves BR/DIV differences that textContent alone loses.
      html: "value" in control ? undefined : root.innerHTML,
      selection: "selectionStart" in control
        ? { start: control.selectionStart, end: control.selectionEnd, direction: control.selectionDirection }
        : { anchor: point(selection?.anchorNode ?? null, selection?.anchorOffset ?? 0),
            focus: point(selection?.focusNode ?? null, selection?.focusOffset ?? 0) },
    } : {}),
  };
}

export function recordingEventData(event: Event): Record<string, unknown> {
  const data: Record<string, unknown> = {
    type: event.type, timeStamp: event.timeStamp, isTrusted: event.isTrusted,
    cancelable: event.cancelable, defaultPrevented: event.defaultPrevented,
  };
  for (const key of ["key", "code", "keyCode", "isComposing", "repeat", "metaKey", "ctrlKey", "altKey", "shiftKey", "inputType", "data", "button", "clientX", "clientY"]) {
    if (key in event) data[key] = (event as unknown as Record<string, unknown>)[key];
  }
  if ("getTargetRanges" in event && typeof event.getTargetRanges === "function") {
    data.targetRanges = (event as InputEvent).getTargetRanges().map(range => ({
      startOffset: range.startOffset, endOffset: range.endOffset,
      startNode: range.startContainer.nodeName, endNode: range.endContainer.nodeName,
    }));
  }
  return data;
}
