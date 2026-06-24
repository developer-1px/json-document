import {
  replaceTextSurfaceSelection,
  syncTextSurfaceMutation,
  type JSONDocument,
  type Pointer,
  type SelectionSnap,
  type TextSurface,
  type TextSurfaceFragment,
} from "@interactive-os/json-document";
import {
  JSON_ATOM_ATTRIBUTE,
  JSON_DOCUMENT_CONTENTEDITABLE_MIME,
  JSON_TEXT_ATTRIBUTE,
} from "./constants.js";
import {
  isTextSurfaceFragment,
  readClipboardFragment,
  readClipboardPlainText,
  selectedTextSurfaceFragment,
  writeClipboardFragment,
} from "./clipboard.js";
import { editableTextContent, findElementByAttribute } from "./domText.js";
import {
  restoreDOMSelection,
  selectionFromDOM,
  textPathFromSelection,
  textPointFromDOMSelection,
} from "./selection.js";
import type {
  ContentEditableAdapter,
  ContentEditableAdapterOptions,
  ContentEditableClipboardResult,
  ContentEditableFlushOptions,
  ContentEditableUpdate,
  TextSurfaceResolver,
} from "./types.js";

type BrowserLease = {
  path: Pointer;
  phase: "native" | "composing" | "pending-commit";
};

export function createContentEditableAdapter<T>({
  atomAttribute = JSON_ATOM_ATTRIBUTE,
  clipboardMime = JSON_DOCUMENT_CONTENTEDITABLE_MIME,
  document,
  root,
  surface,
  textAttribute = JSON_TEXT_ATTRIBUTE,
}: ContentEditableAdapterOptions<T>): ContentEditableAdapter<T> {
  let lease: BrowserLease | null = null;

  const textElementForPath = (path: Pointer): HTMLElement | null =>
    findElementByAttribute(root, textAttribute, path);

  const beginLeaseFromDOM = (
    phase: BrowserLease["phase"] = "native",
  ): BrowserLease | null => {
    const point = textPointFromDOMSelection(root, textAttribute, atomAttribute);
    if (point === null) return lease;
    if (readDocumentString(document, point.path) === null) return lease;
    lease = { path: point.path, phase };
    return lease;
  };

  const syncSelectionFromDOM = (): SelectionSnap | null => {
    const selection = selectionFromDOM(root, textAttribute, atomAttribute);
    if (selection !== null) document.selection?.restore(selection);
    return selection;
  };

  const flush = (options: ContentEditableFlushOptions = {}): ContentEditableUpdate => {
    const path =
      lease?.path ??
      textPointFromDOMSelection(root, textAttribute, atomAttribute)?.path ??
      null;
    if (path === null) {
      const selection = syncSelectionFromDOM();
      return {
        ok: true,
        kind: selection === null ? "no-change" : "selection",
        patch: [],
        selection,
      };
    }

    const textElement = textElementForPath(path);
    if (textElement === null) {
      return {
        ok: false,
        code: "missing_text_path",
        reason: `No text element found for ${path}.`,
      };
    }

    const previousText = readDocumentString(document, path);
    const textSurface = resolveSurface(surface, path);
    if (previousText === null || textSurface === null) {
      return {
        ok: false,
        code: "missing_text_path",
        reason: `No text surface found for ${path}.`,
      };
    }

    const nextText = editableTextContent(textElement, atomAttribute);
    const selectionAfter =
      selectionFromDOM(root, textAttribute, atomAttribute) ??
      document.selection?.snapshot() ??
      null;

    const planned = syncTextSurfaceMutation(
      document.value,
      textSurface,
      previousText,
      nextText,
    );
    if (!planned.ok) {
      return {
        ok: false,
        code: "invalid_payload",
        reason: planned.reason,
      };
    }

    if (planned.patch.length === 0) {
      if (selectionAfter !== null) document.selection?.restore(selectionAfter);
      lease = null;
      return { ok: true, kind: "selection", patch: [], selection: selectionAfter };
    }

    const commit = document.commit(planned.patch, {
      label: options.label ?? "contenteditable text",
      origin: "contenteditable",
      ...(options.mergeKey === undefined ? {} : { mergeKey: options.mergeKey }),
      ...(selectionAfter === null ? {} : { selectionAfter }),
    });
    if (!commit.ok) {
      return {
        ok: false,
        code: "commit_failed",
        reason: commit.reason ?? commit.code,
      };
    }
    lease = null;
    return {
      ok: true,
      kind: "text",
      patch: planned.patch,
      selection: selectionAfter,
    };
  };

  const copy = (event?: ClipboardEvent): ContentEditableClipboardResult<T> => {
    flush({ label: "copy selection" });
    const selection = document.selection?.snapshot() ?? null;
    const textSurface = surfaceFromSelection(surface, selection);
    if (selection === null || textSurface === null) {
      return emptySelectionError("No text surface selection was copied.");
    }

    const fragment = selectedTextSurfaceFragment(document, selection, textSurface);
    if (fragment === null) {
      return emptySelectionError("No text or atom range is selected.");
    }

    writeClipboardFragment(event, fragment, clipboardMime);
    document.clipboard.write(fragment, { trustedPayload: true });
    return { ok: true, value: document.value };
  };

  const cut = (event?: ClipboardEvent): ContentEditableClipboardResult<T> => {
    const copyResult = copy(event);
    if (!copyResult.ok) return copyResult;
    const selection = document.selection?.snapshot() ?? null;
    return replaceSelection("", selection, "cut text");
  };

  const pasteFragment = (
    fragment: TextSurfaceFragment,
    selection = document.selection?.snapshot() ?? null,
  ): ContentEditableClipboardResult<T> =>
    replaceSelection(fragment, selection, "paste text");

  const pasteText = (
    text: string,
    selection = document.selection?.snapshot() ?? null,
  ): ContentEditableClipboardResult<T> =>
    replaceSelection(text, selection, "paste text");

  const paste = (event?: ClipboardEvent): ContentEditableClipboardResult<T> => {
    const fragment =
      readClipboardFragment(event, clipboardMime) ??
      readDocumentClipboardFragment(document);
    if (fragment !== null) return pasteFragment(fragment);

    const text = readClipboardPlainText(event);
    if (text.length > 0) return pasteText(text);
    return {
      ok: false,
      code: "clipboard_unavailable",
      reason: "No paste payload was available.",
    };
  };

  const handle = (event: Event): ContentEditableUpdate => {
    if (event.type === "beforeinput") {
      beginLeaseFromDOM("native");
      return noChange(document);
    }
    if (event.type === "compositionstart") {
      beginLeaseFromDOM("composing");
      return noChange(document);
    }
    if (event.type === "compositionend") {
      if (lease !== null) lease = { ...lease, phase: "pending-commit" };
      return flush({ label: "composition commit" });
    }
    if (event.type === "input") {
      beginLeaseFromDOM(lease?.phase === "pending-commit" ? "pending-commit" : "native");
      return flush({
        label: "native input",
        ...(lease === null ? {} : { mergeKey: `native:${lease.path}` }),
      });
    }
    if (event.type === "selectionchange" || event.type === "select") {
      const selection = syncSelectionFromDOM();
      return {
        ok: true,
        kind: selection === null ? "no-change" : "selection",
        patch: [],
        selection,
      };
    }
    if (event.type === "copy" && isClipboardEventLike(event)) {
      event.preventDefault();
      const result = copy(event);
      return clipboardResultToUpdate(result, document);
    }
    if (event.type === "cut" && isClipboardEventLike(event)) {
      event.preventDefault();
      const result = cut(event);
      return clipboardResultToUpdate(result, document);
    }
    if (event.type === "paste" && isClipboardEventLike(event)) {
      event.preventDefault();
      const result = paste(event);
      return clipboardResultToUpdate(result, document);
    }
    if (event.type === "keydown" && isKeyboardEventLike(event)) {
      const command = historyCommandFromKey(event);
      if (command !== null) {
        event.preventDefault();
        const result = command === "undo" ? document.undo() : document.redo();
        restoreDOMSelection(
          root,
          document.selection?.snapshot(),
          textAttribute,
          atomAttribute,
        );
        return result.ok
          ? { ok: true, kind: "text", patch: [], selection: document.selection?.snapshot() ?? null }
          : { ok: false, code: "commit_failed", reason: result.reason ?? result.code };
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

  function replaceSelection(
    replacement: string | TextSurfaceFragment,
    selection: SelectionSnap | null,
    label: string,
  ): ContentEditableClipboardResult<T> {
    flush({ label: "flush before text surface replace" });
    if (selection !== null) document.selection?.restore(selection);
    const textSurface = surfaceFromSelection(surface, selection);
    if (selection === null || textSurface === null) {
      return emptySelectionError("No text surface selection is available.");
    }
    const planned = replaceTextSurfaceSelection(
      selection,
      document.value,
      textSurface,
      replacement,
    );
    if (!planned.ok) {
      return { ok: false, code: "invalid_payload", reason: planned.reason };
    }
    const commit = document.commit(planned.patch, {
      label,
      origin: "contenteditable",
      selectionAfter: planned.selectionAfter,
    });
    return commit.ok
      ? { ok: true, value: document.value }
      : { ok: false, code: "commit_failed", reason: commit.reason ?? commit.code };
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
      lease = null;
    },
  };
}

function resolveSurface(
  resolver: TextSurfaceResolver,
  textPath: Pointer,
): TextSurface | null {
  return typeof resolver === "function" ? resolver(textPath) : resolver;
}

function surfaceFromSelection(
  resolver: TextSurfaceResolver,
  selection: SelectionSnap | null,
): TextSurface | null {
  const path = textPathFromSelection(selection);
  return path === null ? null : resolveSurface(resolver, path);
}

function readDocumentString<T>(document: JSONDocument<T>, path: Pointer): string | null {
  const result = document.at(path);
  return result.ok && typeof result.value === "string" ? result.value : null;
}

function readDocumentClipboardFragment<T>(
  document: JSONDocument<T>,
): TextSurfaceFragment | null {
  const result = document.clipboard.read();
  return result.ok && isTextSurfaceFragment(result.payload) ? result.payload : null;
}

function noChange<T>(document: JSONDocument<T>): ContentEditableUpdate {
  return {
    ok: true,
    kind: "no-change",
    patch: [],
    selection: document.selection?.snapshot() ?? null,
  };
}

function emptySelectionError<T>(reason: string): ContentEditableClipboardResult<T> {
  return { ok: false, code: "empty_selection", reason };
}

function clipboardResultToUpdate<T>(
  result: ContentEditableClipboardResult<T>,
  document: JSONDocument<T>,
): ContentEditableUpdate {
  return result.ok
    ? {
        ok: true,
        kind: "text",
        patch: document.lastPatch,
        selection: document.selection?.snapshot() ?? null,
      }
    : result;
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
