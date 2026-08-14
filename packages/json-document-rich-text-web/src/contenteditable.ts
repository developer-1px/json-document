import type {
  RichTextEditor,
  RichTextPoint,
  RichTextSelection,
} from "@interactive-os/json-document-rich-text";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { createWebClipboardBinding, type WebClipboardData, type WebClipboardEvent } from "@interactive-os/json-document-web";
import { createRichTextClipboardCodec, createRichTextClipboardRepresentations } from "./clipboard.js";

export interface RichTextContentEditableBinding {
  syncSelection(): RichTextSelection | null;
  restoreSelection(): void;
  destroy(): void;
}

export function createRichTextContentEditableBinding(options: {
  readonly root: HTMLElement;
  readonly editor: RichTextEditor;
  readonly createId?: () => string;
  readonly onAction?: (action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => void;
}): RichTextContentEditableBinding {
  const { root, editor } = options;
  const createId = options.createId ?? createRichTextNodeId;
  let compositionSequence = 0;
  let compositionId: string | null = null;
  let renderPending = false;
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
    if (compositionId !== null && (event.inputType.includes("Composition") || event.isComposing)) return;
    const usesPlatformTargetRange = ![
      "insertText",
      "insertTranspose",
      "deleteContentBackward",
      "deleteContentForward",
    ].includes(event.inputType);
    if (!usesPlatformTargetRange || syncSelectionFromInput(event) === null) syncSelection();
    if (["insertText", "insertReplacementText", "insertFromYank", "insertTranspose"].includes(event.inputType) && event.data !== null) {
      event.preventDefault();
      report("text.insert", editor.dispatch({ type: "text.insert", text: event.data }));
    } else if (event.inputType === "insertParagraph") {
      event.preventDefault();
      report("block.split", editor.dispatch({ type: "block.split" }));
    } else if (event.inputType === "insertLineBreak") {
      event.preventDefault();
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
      if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
        report("text.delete", editor.dispatch({ type: "text.delete", direction, unit: "character" }));
      } else {
        report("selection.remove", editor.dispatch({ type: "selection.remove" }));
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
  const compositionStart = () => {
    syncSelection();
    compositionId = `composition:${++compositionSequence}`;
    options.onAction?.("composition.start");
  };
  const compositionEnd = (event: CompositionEvent) => {
    const historyGroup = compositionId;
    compositionId = null;
    if (historyGroup === null || event.data.length === 0) return;
    report("composition.commit", editor.dispatch({ type: "text.insert", text: event.data, historyGroup }));
  };
  const copy = (event: ClipboardEvent) => {
    syncSelection();
    reportClipboard("clipboard.copy", clipboard.copy(asWebEvent(event)));
  };
  const cut = (event: ClipboardEvent) => {
    syncSelection();
    reportClipboard("clipboard.cut", clipboard.cut(asWebEvent(event)));
  };
  const paste = (event: ClipboardEvent) => {
    syncSelection();
    reportClipboard("clipboard.paste", clipboard.paste(asWebEvent(event)));
  };
  const selectionChanged = () => { if (!renderPending) syncSelection(); };
  const keyDown = (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    report(event.shiftKey ? "redo" : "undo", event.shiftKey ? editor.redo() : editor.undo());
  };

  root.addEventListener("beforeinput", beforeInput);
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
    syncSelection,
    restoreSelection: () => {
      restoreRichTextDOMSelection(root, editor.snapshot.selection);
      renderPending = false;
    },
    destroy() {
      root.removeEventListener("beforeinput", beforeInput);
      root.removeEventListener("compositionstart", compositionStart);
      root.removeEventListener("compositionend", compositionEnd);
      root.removeEventListener("copy", copy);
      root.removeEventListener("cut", cut);
      root.removeEventListener("paste", paste);
      root.removeEventListener("focus", selectionChanged);
      root.removeEventListener("mouseup", selectionChanged);
      root.removeEventListener("keyup", selectionChanged);
      root.removeEventListener("keydown", keyDown);
    },
  };

  function syncSelection(): RichTextSelection | null {
    if (renderPending) return editor.snapshot.selection;
    const selection = readRichTextDOMSelection(root);
    if (selection === null) return null;
    if (JSON.stringify(selection) !== JSON.stringify(editor.snapshot.selection)) {
      report("selection.set", editor.dispatch({ type: "selection.set", selection }));
    }
    return selection;
  }

  function syncSelectionFromInput(event: InputEvent): RichTextSelection | null {
    if (renderPending) return editor.snapshot.selection;
    const ranges = typeof event.getTargetRanges === "function" ? Array.from(event.getTargetRanges()) : [];
    if (ranges.length === 0) return null;
    const mapped = ranges.map((range) => {
      const anchor = domPoint(root, range.startContainer, range.startOffset);
      const focus = domPoint(root, range.endContainer, range.endOffset);
      return anchor && focus ? { anchor, focus } : null;
    }).filter((range): range is { anchor: RichTextPoint; focus: RichTextPoint } => range !== null);
    if (mapped.length === 0) return null;
    const selection: RichTextSelection = { kind: "range", ranges: mapped, primaryIndex: 0 };
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
