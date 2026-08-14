import type {
  RichTextEditor,
  RichTextPoint,
  RichTextSelection,
} from "@interactive-os/json-document-rich-text";
import { createWebClipboardBinding, type WebClipboardData, type WebClipboardEvent } from "@interactive-os/json-document-web";
import { createRichTextClipboardRepresentations, richTextClipboardCodec } from "./clipboard.js";

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
  let compositionSequence = 0;
  let compositionId: string | null = null;
  const clipboard = createWebClipboardBinding({
    codec: richTextClipboardCodec,
    representations: createRichTextClipboardRepresentations(
      options.createId === undefined ? {} : { createId: options.createId },
    ),
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false as const, code: "rich-text.selection-empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  });

  const beforeInput = (event: InputEvent) => {
    if (compositionId !== null && (event.inputType.includes("Composition") || event.isComposing)) return;
    syncSelection();
    if (event.inputType === "insertText" && event.data !== null) {
      event.preventDefault();
      report("text.insert", editor.dispatch({ type: "text.insert", text: event.data }));
    } else if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") {
      event.preventDefault();
      report("block.split", editor.dispatch({ type: "block.split" }));
    } else if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
      event.preventDefault();
      report("text.delete", editor.dispatch({
        type: "text.delete",
        direction: event.inputType === "deleteContentBackward" ? "backward" : "forward",
        unit: "character",
      }));
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
  const selectionChanged = () => { syncSelection(); };
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
    restoreSelection: () => restoreRichTextDOMSelection(root, editor.snapshot.selection),
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
    const selection = readRichTextDOMSelection(root);
    if (selection === null) return null;
    if (JSON.stringify(selection) !== JSON.stringify(editor.snapshot.selection)) {
      report("selection.set", editor.dispatch({ type: "selection.set", selection }));
    }
    return selection;
  }

  function report(action: string, result: ReturnType<RichTextEditor["dispatch"]>) {
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
  if (!range || range.anchor.kind !== "text" || range.focus.kind !== "text") return;
  const anchor = findDOMPoint(root, range.anchor);
  const focus = findDOMPoint(root, range.focus);
  if (!anchor || !focus) return;
  root.ownerDocument.defaultView?.getSelection()?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
}

function domPoint(root: HTMLElement, node: Node, offset: number): RichTextPoint | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  const textRoot = element?.closest<HTMLElement>("[data-rich-text-node-id]");
  if (!textRoot || !root.contains(textRoot)) return null;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(textRoot);
  try { range.setEnd(node, offset); } catch { return null; }
  return { kind: "text", nodeId: textRoot.dataset.richTextNodeId!, offset: range.toString().length, affinity: "forward" };
}

function findDOMPoint(root: HTMLElement, point: RichTextPoint): { readonly node: Node; readonly offset: number } | null {
  if (point.kind !== "text") return null;
  const escaped = root.ownerDocument.defaultView?.CSS?.escape?.(point.nodeId) ?? point.nodeId.replaceAll('"', '\\"');
  const element = root.querySelector<HTMLElement>(`[data-rich-text-node-id="${escaped}"]`);
  if (!element) return null;
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

function asWebEvent(event: ClipboardEvent): WebClipboardEvent {
  const clipboardData: WebClipboardData | null = event.clipboardData === null ? null : {
    get types() { return Array.from(event.clipboardData?.types ?? []); },
    getData: (format) => event.clipboardData?.getData(format) ?? "",
    setData: (format, data) => { event.clipboardData?.setData(format, data); },
  };
  return { clipboardData, preventDefault: () => event.preventDefault() };
}
