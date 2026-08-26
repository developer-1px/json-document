import type {
  RichTextEditor,
  RichTextPoint,
  RichTextSelection,
} from "@interactive-os/json-document-rich-text";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { createWebClipboardBinding, type WebClipboardData, type WebClipboardEvent } from "@interactive-os/json-document-web";
import { createRichTextClipboardCodec, createRichTextClipboardRepresentations } from "./clipboard.js";

export interface RichTextContentEditableBinding {
  isComposing(): boolean;
  syncSelection(): RichTextSelection | null;
  restoreSelection(): void;
  destroy(): void;
}

export function createRichTextContentEditableBinding(options: {
  readonly root: HTMLElement;
  readonly editor: RichTextEditor;
  readonly createId?: () => string;
  readonly onAction?: (action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => void;
  readonly onCompositionChange?: (composing: boolean) => void;
}): RichTextContentEditableBinding {
  const { root, editor } = options;
  const createId = options.createId ?? createRichTextNodeId;
  let compositionSequence = 0;
  let composition: CompositionLease | null = null;
  let compositionEndTimer: ReturnType<typeof setTimeout> | null = null;
  let renderPending = false;
  let keyboardDeletion: "backward" | "forward" | null = null;
  const clipboard = createWebClipboardBinding({
    codec: createRichTextClipboardCodec(editor.schema),
    representations: createRichTextClipboardRepresentations(
      { schema: editor.schema, ...(options.createId === undefined ? {} : { createId: options.createId }) },
    ),
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false as const, code: "rich-text.selection-empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  });

  const beforeInput = (event: InputEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    if (composition !== null && (
      event.inputType.includes("Composition")
      || event.isComposing
      || (composition.phase === "ending" && event.inputType === "insertText")
    )) return;
    const inputDirection = event.inputType === "deleteContentBackward" ? "backward"
      : event.inputType === "deleteContentForward" ? "forward"
      : null;
    if (inputDirection !== null && keyboardDeletion === inputDirection) {
      event.preventDefault();
      keyboardDeletion = null;
      return;
    }
    const platformSelection = readSelectionFromInput(event);
    const normallyUsesPlatformRange = ![
      "insertText",
      "insertTranspose",
      "deleteContentBackward",
      "deleteContentForward",
    ].includes(event.inputType);
    const usesIOSKoreanReplacementRange = event.inputType === "deleteContentBackward"
      && platformSelection !== null
      && selectionIsExpanded(platformSelection)
      && isIOS(root.ownerDocument.defaultView?.navigator);
    const targetSelection = platformSelection !== null
      && (normallyUsesPlatformRange || usesIOSKoreanReplacementRange)
      ? publishSelection(platformSelection)
      : null;
    if (targetSelection === null) syncSelection();
    if (["insertText", "insertReplacementText", "insertFromYank", "insertTranspose"].includes(event.inputType) && event.data !== null) {
      event.preventDefault();
      report("text.insert", editor.dispatch({ type: "text.insert", text: event.data }));
    } else if (event.inputType === "insertParagraph") {
      event.preventDefault();
      report("block.split", editor.dispatch({ type: "block.split" }));
    } else if (event.inputType === "insertLineBreak") {
      event.preventDefault();
      const point = editor.snapshot.selection.primaryIndex === null
        ? null
        : editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex]?.focus;
      report("node.insert:hardBreak", point
        ? editor.dispatch({ type: "node.insert", point, node: { id: createId(), type: "hardBreak" } })
        : { ok: false, code: "rich-text.selection-empty" });
    } else if (["deleteContentBackward", "deleteContentForward", "deleteWordBackward", "deleteWordForward", "deleteSoftLineBackward", "deleteSoftLineForward", "deleteHardLineBackward", "deleteHardLineForward"].includes(event.inputType)) {
      event.preventDefault();
      const direction = event.inputType.endsWith("Backward") ? "backward" : "forward";
      if (targetSelection !== null && selectionIsExpanded(targetSelection)) {
        report("selection.remove", editor.dispatch({ type: "selection.remove" }));
      } else if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
        report("text.delete", editor.dispatch({ type: "text.delete", direction, unit: "character" }));
      } else {
        report("selection.remove", { ok: false, code: "rich-text.intent-unsupported" });
      }
    } else if (event.inputType === "deleteByDrag" || event.inputType === "deleteByCut") {
      event.preventDefault();
      report("selection.remove", editor.dispatch({ type: "selection.remove" }));
    } else if (event.inputType === "formatBold" || event.inputType === "formatItalic" || event.inputType === "formatUnderline" || event.inputType === "formatStrikeThrough") {
      event.preventDefault();
      const type = event.inputType === "formatBold" ? "strong"
        : event.inputType === "formatItalic" ? "emphasis"
        : event.inputType === "formatUnderline" ? "underline"
        : "strikethrough";
      report(`mark.toggle:${type}`, editor.dispatch({ type: "mark.toggle", mark: { type } }));
    } else if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      event.preventDefault();
      report(event.inputType === "historyUndo" ? "undo" : "redo", event.inputType === "historyUndo" ? editor.undo() : editor.redo());
    }
  };
  const compositionStart = (event: CompositionEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    if (composition !== null) finishComposition(true);
    const selection = syncSelection() ?? editor.snapshot.selection;
    const scope = compositionScope(root, selection);
    composition = {
      id: `composition:${++compositionSequence}`,
      selection,
      element: scope.element,
      beforeText: scope.beforeText,
      scoped: scope.scoped,
      phase: "composing",
      endData: null,
    };
    options.onCompositionChange?.(true);
    options.onAction?.("composition.start");
  };
  const compositionEnd = (event: CompositionEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    if (composition === null) return;
    composition.phase = "ending";
    composition.endData = event.data;
    queueMicrotask(() => finishComposition(false));
    if (compositionEndTimer !== null) clearTimeout(compositionEndTimer);
    compositionEndTimer = setTimeout(() => finishComposition(true), 30);
  };
  const input = (event: Event) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    if (composition?.phase === "ending") queueMicrotask(() => finishComposition(false));
  };
  const copy = (event: ClipboardEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    syncSelection();
    reportClipboard("clipboard.copy", clipboard.copy(asWebEvent(event)));
  };
  const cut = (event: ClipboardEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    syncSelection();
    reportClipboard("clipboard.cut", clipboard.cut(asWebEvent(event)));
  };
  const paste = (event: ClipboardEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    syncSelection();
    reportClipboard("clipboard.paste", clipboard.paste(asWebEvent(event)));
  };
  const selectionChanged = (event: Event) => {
    if (eventBelongsToEditingRoot(root, event) && !renderPending) syncSelection();
  };
  const keyDown = (event: KeyboardEvent) => {
    if (!eventBelongsToEditingRoot(root, event)) return;
    if ((event.key === "Backspace" || event.key === "Delete") && !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing && composition === null) {
      const direction = event.key === "Backspace" ? "backward" : "forward";
      event.preventDefault();
      keyboardDeletion = direction;
      queueMicrotask(() => { if (keyboardDeletion === direction) keyboardDeletion = null; });
      report("text.delete", editor.dispatch({ type: "text.delete", direction, unit: "character" }));
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      report(event.shiftKey ? "redo" : "undo", event.shiftKey ? editor.redo() : editor.undo());
    }
  };

  root.addEventListener("beforeinput", beforeInput);
  root.addEventListener("input", input);
  root.addEventListener("compositionstart", compositionStart);
  root.addEventListener("compositionend", compositionEnd);
  root.addEventListener("copy", copy);
  root.addEventListener("cut", cut);
  root.addEventListener("paste", paste);
  root.addEventListener("focus", selectionChanged);
  root.addEventListener("mouseup", selectionChanged);
  root.addEventListener("keyup", selectionChanged);
  root.addEventListener("keydown", keyDown);

  return {
    isComposing: () => composition !== null,
    syncSelection,
    restoreSelection: () => {
      if (composition !== null) return;
      restoreRichTextDOMSelection(root, editor.snapshot.selection);
      renderPending = false;
    },
    destroy() {
      if (compositionEndTimer !== null) clearTimeout(compositionEndTimer);
      root.removeEventListener("beforeinput", beforeInput);
      root.removeEventListener("input", input);
      root.removeEventListener("compositionstart", compositionStart);
      root.removeEventListener("compositionend", compositionEnd);
      root.removeEventListener("copy", copy);
      root.removeEventListener("cut", cut);
      root.removeEventListener("paste", paste);
      root.removeEventListener("focus", selectionChanged);
      root.removeEventListener("mouseup", selectionChanged);
      root.removeEventListener("keyup", selectionChanged);
      root.removeEventListener("keydown", keyDown);
      composition = null;
      options.onCompositionChange?.(false);
    },
  };

  function finishComposition(force: boolean): void {
    const lease = composition;
    if (lease === null || lease.phase !== "ending") return;
    const after = lease.element.textContent ?? "";
    const diff = lease.scoped
      ? singleTextDiff(lease.beforeText, after)
      : lease.endData ? { removed: "", inserted: lease.endData } : null;
    if (!force && !compositionDOMIsFinal(diff, lease.endData)) return;
    if (compositionEndTimer !== null) clearTimeout(compositionEndTimer);
    compositionEndTimer = null;
    composition = null;

    if (diff === null) {
      options.onCompositionChange?.(false);
      options.onAction?.("composition.cancel");
      return;
    }

    report("selection.set", editor.dispatch({ type: "selection.set", selection: lease.selection }));
    report("composition.commit", editor.dispatch({
      type: "text.insert",
      text: diff.inserted,
      historyGroup: lease.id,
    }));
    options.onCompositionChange?.(false);
  }

  function syncSelection(): RichTextSelection | null {
    if (renderPending) return editor.snapshot.selection;
    const selection = readRichTextDOMSelection(root);
    if (selection === null) return null;
    if (JSON.stringify(selection) !== JSON.stringify(editor.snapshot.selection)) {
      report("selection.set", editor.dispatch({ type: "selection.set", selection }));
    }
    return selection;
  }

  function readSelectionFromInput(event: InputEvent): RichTextSelection | null {
    if (renderPending) return editor.snapshot.selection;
    const ranges = typeof event.getTargetRanges === "function" ? Array.from(event.getTargetRanges()) : [];
    if (ranges.length === 0) return null;
    const mapped = ranges.map((range) => {
      const anchor = domPoint(root, range.startContainer, range.startOffset);
      const focus = domPoint(root, range.endContainer, range.endOffset);
      return anchor && focus ? { anchor, focus } : null;
    }).filter((range): range is { anchor: RichTextPoint; focus: RichTextPoint } => range !== null);
    if (mapped.length === 0) return null;
    return { kind: "range", ranges: mapped, primaryIndex: 0 };
  }

  function publishSelection(selection: RichTextSelection): RichTextSelection {
    report("selection.set", editor.dispatch({ type: "selection.set", selection }));
    return selection;
  }

  function report(action: string, result: ReturnType<RichTextEditor["dispatch"]>) {
    if (result.ok && result.change) renderPending = true;
    options.onAction?.(result.ok ? action : result.code, result);
  }

  function reportClipboard(action: string, result: ReturnType<typeof clipboard.copy>) {
    if (!result.ok) options.onAction?.(result.code);
    else if (result.operation === "copy") options.onAction?.(action);
    else options.onAction?.(action, result.result);
  }
}

interface CompositionLease {
  readonly id: string;
  readonly selection: RichTextSelection;
  readonly element: HTMLElement;
  readonly beforeText: string;
  readonly scoped: boolean;
  phase: "composing" | "ending";
  endData: string | null;
}

function compositionScope(root: HTMLElement, selection: RichTextSelection): {
  readonly element: HTMLElement;
  readonly beforeText: string;
  readonly scoped: boolean;
} {
  const range = selection.primaryIndex === null ? selection.ranges[0] : selection.ranges[selection.primaryIndex];
  const escape = root.ownerDocument.defaultView?.CSS?.escape ?? ((value: string) => value.replaceAll('"', '\\"'));
  if (range) {
    const text = root.querySelector<HTMLElement>(`[data-rich-text-text-id="${escape(range.anchor.nodeId)}"]`);
    if (text && root.contains(text)) return { element: text, beforeText: text.textContent ?? "", scoped: true };
    const container = root.querySelector<HTMLElement>(`[data-rich-text-container-id="${escape(range.anchor.nodeId)}"]`);
    if (container && container !== root && root.contains(container)) {
      return { element: container, beforeText: container.textContent ?? "", scoped: true };
    }
  }
  const focus = root.ownerDocument.getSelection()?.focusNode;
  const host = (focus instanceof HTMLElement ? focus : focus?.parentElement)
    ?.closest<HTMLElement>("[data-rich-text-text-id], [data-rich-text-container-id], [data-rich-text-node-id]");
  if (host && host !== root && root.contains(host)) return { element: host, beforeText: host.textContent ?? "", scoped: true };
  return { element: root, beforeText: "", scoped: false };
}

interface TextDiff {
  readonly removed: string;
  readonly inserted: string;
}

function singleTextDiff(before: string, after: string): TextDiff | null {
  if (before === after) return null;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd--;
    afterEnd--;
  }
  return { removed: before.slice(start, beforeEnd), inserted: after.slice(start, afterEnd) };
}

function compositionDOMIsFinal(diff: TextDiff | null, endData: string | null): boolean {
  if (endData === null) return false;
  if (endData.length === 0) return diff === null;
  return diff?.inserted === endData;
}

function selectionIsExpanded(selection: RichTextSelection): boolean {
  return selection.ranges.some((range) => JSON.stringify(range.anchor) !== JSON.stringify(range.focus));
}

function isIOS(navigator: Navigator | undefined): boolean {
  if (navigator === undefined) return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function readRichTextDOMSelection(root: HTMLElement): RichTextSelection | null {
  const selection = root.ownerDocument.defaultView?.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode || !selection.focusNode) return null;
  const anchor = domPoint(root, selection.anchorNode, selection.anchorOffset);
  const focus = domPoint(root, selection.focusNode, selection.focusOffset);
  if (!anchor || !focus) return null;
  return { kind: "range", ranges: [{ anchor, focus }], primaryIndex: 0 };
}

export function restoreRichTextDOMSelection(root: HTMLElement, selection: RichTextSelection): void {
  if (selection.primaryIndex === null) return;
  const range = selection.ranges[selection.primaryIndex];
  if (!range) return;
  const anchor = findDOMPoint(root, range.anchor);
  const focus = findDOMPoint(root, range.focus);
  if (!anchor || !focus) return;
  root.ownerDocument.defaultView?.getSelection()?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
}

function domPoint(root: HTMLElement, node: Node, offset: number): RichTextPoint | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  if (!elementBelongsToEditingRoot(root, element)) return null;
  const textRoot = element?.closest<HTMLElement>("[data-rich-text-text-id]");
  if (textRoot && root.contains(textRoot)) {
    const range = root.ownerDocument.createRange();
    range.selectNodeContents(textRoot);
    try { range.setEnd(node, offset); } catch { return null; }
    return { kind: "text", nodeId: textRoot.dataset.richTextTextId!, offset: range.toString().length, affinity: "forward" };
  }
  const container = element?.closest<HTMLElement>("[data-rich-text-container-id]") ?? root;
  if (container !== root && !root.contains(container)) return null;
  const containerId = container.dataset.richTextContainerId;
  if (!containerId) return null;
  const boundary = root.ownerDocument.createRange();
  boundary.selectNodeContents(container);
  try { boundary.setEnd(node, offset); } catch { return null; }
  const childRoots = logicalChildRoots(container);
  const logicalOffset = childRoots.filter((child) => {
    const probe = root.ownerDocument.createRange();
    probe.selectNode(child);
    return boundary.compareBoundaryPoints(Range.END_TO_END, probe) >= 0;
  }).length;
  return { kind: "child", nodeId: containerId, offset: logicalOffset, affinity: "forward" };
}

function eventBelongsToEditingRoot(root: HTMLElement, event: Event): boolean {
  const target = event.target;
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return elementBelongsToEditingRoot(root, element);
}

function elementBelongsToEditingRoot(root: HTMLElement, element: Element | null): boolean {
  if (element === null || !root.contains(element)) return false;
  let current: Element | null = element;
  while (current !== null && current !== root) {
    if (current.hasAttribute("contenteditable")) {
      const value = current.getAttribute("contenteditable")?.toLowerCase();
      if (value !== "false" && value !== "inherit") return false;
    }
    current = current.parentElement;
  }
  return current === root;
}

function findDOMPoint(root: HTMLElement, point: RichTextPoint): { readonly node: Node; readonly offset: number } | null {
  const escaped = root.ownerDocument.defaultView?.CSS?.escape?.(point.nodeId) ?? point.nodeId.replaceAll('"', '\\"');
  const element = root.querySelector<HTMLElement>(point.kind === "text"
    ? `[data-rich-text-text-id="${escaped}"]`
    : `[data-rich-text-container-id="${escaped}"]`);
  if (!element) return null;
  if (point.kind === "child") {
    const children = logicalChildRoots(element);
    if (point.offset < 0 || point.offset > children.length) return null;
    if (point.offset === 0) return { node: element, offset: 0 };
    const host = directHost(element, children[point.offset - 1]!);
    return { node: element, offset: Array.prototype.indexOf.call(element.childNodes, host) + 1 };
  }
  const walker = root.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = point.offset;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    node = walker.nextNode();
  }
  return { node: element, offset: element.childNodes.length };
}

function logicalChildRoots(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-rich-text-node-id]"))
    .filter((candidate) => candidate.parentElement?.closest("[data-rich-text-container-id]") === container);
}

function directHost(container: HTMLElement, descendant: HTMLElement): Node {
  let host: Node = descendant;
  while (host.parentNode && host.parentNode !== container) host = host.parentNode;
  return host;
}

function asWebEvent(event: ClipboardEvent): WebClipboardEvent {
  const clipboardData: WebClipboardData | null = event.clipboardData === null ? null : {
    get types() { return Array.from(event.clipboardData?.types ?? []); },
    getData: (format) => event.clipboardData?.getData(format) ?? "",
    setData: (format, data) => { event.clipboardData?.setData(format, data); },
  };
  return { clipboardData, preventDefault: () => event.preventDefault() };
}
