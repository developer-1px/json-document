import type {
  JSONDocument,
  Pointer,
  SelectionSnap,
  TextSurfaceFragment,
} from "@interactive-os/json-document";
import {
  JSON_ATOM_ATTRIBUTE,
  JSON_DOCUMENT_CONTENTEDITABLE_MIME,
  JSON_TEXT_ATTRIBUTE,
} from "../constants.js";
import {
  readClipboardFragment,
  readClipboardPlainText,
  writeClipboardFragment,
} from "./clipboardEvent.js";
import {
  createContentEditableCore,
  type ContentEditableObservationReader,
  type ContentEditableResult,
} from "../core.js";
import { editableTextContent, findElementByAttribute } from "./textProjection.js";
import {
  restoreDOMSelection,
  selectionFromDOM,
  textPointFromDOMSelection,
} from "./selection.js";
import type {
  ContentEditableAdapter,
  ContentEditableAdapterOptions,
} from "../types.js";

export function createContentEditableAdapter<T>({
  atomAttribute = JSON_ATOM_ATTRIBUTE,
  clipboardMime = JSON_DOCUMENT_CONTENTEDITABLE_MIME,
  document,
  root,
  surface,
  textAttribute = JSON_TEXT_ATTRIBUTE,
}: ContentEditableAdapterOptions<T>): ContentEditableAdapter<T> {
  const core = createContentEditableCore({ document, surface });

  const textElementForPath = (path: Pointer): HTMLElement | null =>
    findElementByAttribute(root, textAttribute, path);

  const domSelection = (): SelectionSnap | null =>
    selectionFromDOM(root, textAttribute, atomAttribute);

  const point = () => textPointFromDOMSelection(root, textAttribute, atomAttribute);

  const reader: ContentEditableObservationReader = {
    point,
    text(path) {
      const textElement = textElementForPath(path);
      return textElement === null ? null : editableTextContent(textElement, atomAttribute);
    },
    selection: domSelection,
  };

  const syncSelectionFromDOM = (): SelectionSnap | null => {
    const selection = domSelection();
    core.handle({ type: "sync-selection", selection }, reader);
    return selection;
  };

  const flush = (): ContentEditableResult<T> =>
    core.handle({ type: "flush" }, reader);

  const copy = (event?: ClipboardEvent): ContentEditableResult<T> => {
    const result = core.handle({ type: "copy" }, reader);
    if (result.ok && result.kind === "copy") {
      writeClipboardFragment(event, result.payload, clipboardMime);
    }
    return result;
  };

  const cut = (event?: ClipboardEvent): ContentEditableResult<T> => {
    const result = core.handle({ type: "cut" }, reader);
    if (result.ok && result.kind === "cut") {
      writeClipboardFragment(event, result.payload, clipboardMime);
    }
    return result;
  };

  const pasteFragment = (
    fragment: TextSurfaceFragment,
    selection = document.selection?.snapshot() ?? null,
  ): ContentEditableResult<T> =>
    core.handle({ type: "paste", payload: fragment, selection }, reader);

  const pasteText = (
    text: string,
    selection = document.selection?.snapshot() ?? null,
  ): ContentEditableResult<T> =>
    core.handle({ type: "paste", payload: text, selection }, reader);

  const paste = (event?: ClipboardEvent): ContentEditableResult<T> =>
    core.handle({
      type: "paste",
      payload: readClipboardPayload(event, clipboardMime),
    }, reader);

  const handle = (event: Event): ContentEditableResult<T> => {
    if (event.type === "beforeinput") {
      return core.handle({ type: "begin-native-input", point: point() }, reader);
    }
    if (event.type === "compositionstart") {
      return core.handle({ type: "begin-composition", point: point() }, reader);
    }
    if (event.type === "compositionend") {
      return core.handle({ type: "commit-composition", point: point() }, reader);
    }
    if (event.type === "input") {
      return core.handle({ type: "commit-native-input", point: point() }, reader);
    }
    if (event.type === "selectionchange" || event.type === "select") {
      return core.handle({ type: "sync-selection", selection: domSelection() }, reader);
    }
    if (event.type === "copy" && isClipboardEventLike(event)) {
      event.preventDefault();
      return copyCoreAndWrite(event);
    }
    if (event.type === "cut" && isClipboardEventLike(event)) {
      event.preventDefault();
      return cutCoreAndWrite(event);
    }
    if (event.type === "paste" && isClipboardEventLike(event)) {
      event.preventDefault();
      return core.handle({
        type: "paste",
        payload: readClipboardPayload(event, clipboardMime),
      }, reader);
    }
    if (event.type === "keydown" && isKeyboardEventLike(event)) {
      const command = historyCommandFromKey(event);
      if (command !== null) {
        event.preventDefault();
        const result = core.handle({ type: "history", command }, reader);
        if (result.ok) {
          restoreDOMSelection(
            root,
            document.selection?.snapshot(),
            textAttribute,
            atomAttribute,
          );
        }
        return result;
      }
    }
    return noChange(document);
  };

  const bind = (): (() => void) => {
    const rootEvents = [
      "beforeinput",
      "compositionstart",
      "compositionend",
      "input",
      "copy",
      "cut",
      "paste",
      "keydown",
      "select",
    ] as const;
    for (const type of rootEvents) root.addEventListener(type, handle);
    const selectionHandler = (event: Event) => {
      const selection = root.ownerDocument.getSelection();
      if (
        selection?.anchorNode !== null &&
        selection?.anchorNode !== undefined &&
        root.contains(selection.anchorNode)
      ) {
        handle(event);
      }
    };
    root.ownerDocument.addEventListener("selectionchange", selectionHandler);
    return () => {
      for (const type of rootEvents) root.removeEventListener(type, handle);
      root.ownerDocument.removeEventListener("selectionchange", selectionHandler);
    };
  };

  function copyCoreAndWrite(event?: ClipboardEvent): ContentEditableResult<T> {
    const result = core.handle({ type: "copy" }, reader);
    if (result.ok && result.kind === "copy") {
      writeClipboardFragment(event, result.payload, clipboardMime);
    }
    return result;
  }

  function cutCoreAndWrite(event?: ClipboardEvent): ContentEditableResult<T> {
    const result = core.handle({ type: "cut" }, reader);
    if (result.ok && result.kind === "cut") {
      writeClipboardFragment(event, result.payload, clipboardMime);
    }
    return result;
  }

  return {
    bind,
    handle,
    flush,
    syncSelectionFromDOM,
    restoreSelectionToDOM(selection = document.selection?.snapshot()) {
      return restoreDOMSelection(root, selection, textAttribute, atomAttribute);
    },
    copy,
    cut,
    paste,
    pasteFragment,
    pasteText,
    reset() {
      core.reset();
    },
  };
}

function readClipboardPayload(
  event: ClipboardEvent | undefined,
  clipboardMime: string,
): TextSurfaceFragment | string | null {
  const fragment = readClipboardFragment(event, clipboardMime);
  if (fragment !== null) return fragment;
  const text = readClipboardPlainText(event);
  return text.length === 0 ? null : text;
}

function noChange<T>(document: JSONDocument<T>): ContentEditableResult<T> {
  return {
    ok: true,
    kind: "no-change",
    patch: [],
    selection: document.selection?.snapshot() ?? null,
    value: document.value,
  };
}

function historyCommandFromKey(event: KeyboardEvent): "undo" | "redo" | null {
  const key = event.key.toLowerCase();
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
  if (key === "z" && !event.shiftKey) return "undo";
  if (key === "y" || (key === "z" && event.shiftKey)) return "redo";
  return null;
}

function isClipboardEventLike(event: Event): event is ClipboardEvent {
  return "clipboardData" in event;
}

function isKeyboardEventLike(event: Event): event is KeyboardEvent {
  return "key" in event;
}
