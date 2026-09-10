import { plainTextDOMAdapter } from "./dom/plain-text.js";
import { createWebClipboardBinding, createWebKeyboardAdapter, isWebEditingHostTarget, textClipboardCodec } from "@interactive-os/json-document-web";
import type {
  ContentEditableBinding,
  ContentEditableBindingOptions,
  ContentEditableBindingResult,
  TextSelection,
} from "./types.js";

interface ActiveLease {
  phase: "native" | "composing";
  nativeFallback: ReturnType<typeof setTimeout> | null;
  readonly value: string;
}

interface RenderedDocument {
  readonly available: boolean;
  readonly value: string;
}

/**
 * Binds one contenteditable root to one local JSONDocument string pointer.
 *
 * Document commits from other paths continue immediately. While native input
 * owns the root, only model-to-DOM rendering is leased.
 */
export function createContentEditableBinding({
  document,
  dom = plainTextDOMAdapter,
  pointer,
  root,
  editor,
}: ContentEditableBindingOptions): ContentEditableBinding {
  if (editor && (editor.document !== document || editor.pointer !== pointer)) {
    throw new TypeError("contenteditable editor must own the bound document and pointer");
  }
  let activeLease: ActiveLease | null = null;
  let trailingComposition = false;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let renderedDocument: RenderedDocument | null = null;
  let bound = false;
  let unsubscribeDocument: (() => void) | null = null;
  let rendering = false;
  const keyboard = createWebKeyboardAdapter();

  const currentDOMSelection = (): TextSelection | null =>
    dom.observe(root).selection;

  const readString = (): RenderedDocument => {
    const read = document.at(pointer);
    const available = read.ok && typeof read.value === "string";
    return {
      available,
      value: available ? read.value as string : "",
    };
  };

  const renderLatest = (
    requestedSelection: TextSelection | null | undefined,
    force: boolean,
  ): ContentEditableBindingResult => {
    const next = readString();
    const unchanged = (
      renderedDocument !== null
      && renderedDocument.available === next.available
      && renderedDocument.value === next.value
    );
    if (!force && unchanged) return NO_CHANGE;

    const selection = requestedSelection === undefined
      ? currentDOMSelection()
      : requestedSelection;
    rendering = true;
    try {
      dom.render(root, next.value, selection);
      renderedDocument = next;
      if (selection !== null && next.available) {
        dom.restoreSelection(root, selection);
      }
    } finally {
      rendering = false;
    }
    return RENDERED;
  };

  const clearTrailing = (): void => {
    if (trailingTimer !== null) clearTimeout(trailingTimer);
    trailingTimer = null;
    trailingComposition = false;
  };

  const finishTrailing = (): void => {
    clearTrailing();
    renderLatest(undefined, true);
  };

  const clearActiveLease = (): void => {
    const fallback = activeLease?.nativeFallback;
    if (fallback !== null && fallback !== undefined) clearTimeout(fallback);
    activeLease = null;
  };

  const commitObservation = (): ContentEditableBindingResult => {
    const lease = activeLease;
    if (lease === null) return NO_CHANGE;
    if (lease.nativeFallback !== null) {
      clearTimeout(lease.nativeFallback);
      lease.nativeFallback = null;
    }
    const observation = dom.observe(root);
    const current = readString();
    if (!current.available) {
      clearActiveLease();
      renderLatest(observation.selection, true);
      return failure(
        "text_target_unavailable",
        "contenteditable target is not a string",
      );
    }
    if (current.value !== lease.value) {
      clearActiveLease();
      renderLatest(undefined, true);
      return failure("text_source_stale", "source changed while the browser owned native input");
    }
    if (observation.value !== current.value) {
      const committed = editor ? editor.replace(observation.value, observation.selection ?? editor.snapshot.selection) : document.commit([{
        op: "replace",
        path: pointer,
        value: observation.value,
      }]);
      if (!committed.ok) {
        clearActiveLease();
        renderLatest(observation.selection, true);
        return failure(committed.code, committed.reason ?? committed.code);
      }
    }
    clearActiveLease();
    renderLatest(observation.selection, true);
    return COMMITTED;
  };

  const begin = (
    phase: ActiveLease["phase"],
    event: Event,
  ): ContentEditableBindingResult => {
    if (trailingComposition) {
      clearTrailing();
    }
    if (activeLease !== null) {
      if (phase === "composing") {
        activeLease.phase = "composing";
        if (activeLease.nativeFallback !== null) {
          clearTimeout(activeLease.nativeFallback);
          activeLease.nativeFallback = null;
        }
      }
      return NO_CHANGE;
    }
    const current = readString();
    if (!current.available) {
      if (event.cancelable) event.preventDefault();
      renderLatest(undefined, true);
      return failure(
        "text_target_unavailable",
        "contenteditable target is not a string",
      );
    }
    if (editor) {
      const selection = currentDOMSelection();
      if (selection) editor.select(selection);
    }
    activeLease = { phase, nativeFallback: null, value: current.value };
    if (phase === "native") {
      const lease = activeLease;
      lease.nativeFallback = setTimeout(() => {
        if (activeLease !== lease || lease.phase !== "native") return;
        clearActiveLease();
        renderLatest(undefined, true);
      }, 0);
    }
    return LEASE_STARTED;
  };

  const cancelInternal = (): ContentEditableBindingResult => {
    const changed = activeLease !== null || trailingComposition;
    if (!changed) return NO_CHANGE;
    clearActiveLease();
    clearTrailing();
    renderLatest(undefined, true);
    return CANCELLED;
  };

  const handleInternal = (event: Event): ContentEditableBindingResult => {
    if (event.type === "focus") {
      return editor ? renderLatest(undefined, true) : NO_CHANGE;
    }
    if (event.type === "blur") {
      const result = cancelInternal();
      if (editor) renderLatest(null, true);
      return result;
    }

    if (editor && event.type === "keydown" && activeLease?.phase !== "composing") {
      const keyboardEvent = event as KeyboardEvent;
      const command = keyboard.resolve(keyboardEvent);
      if (command?.type === "undo" || command?.type === "redo") {
        event.preventDefault();
        cancelInternal();
        const result = command.type === "undo" ? editor.undo() : editor.redo();
        return result.ok ? RENDERED : failure(result.code, result.reason ?? result.code);
      }
    }

    if (event.type === "beforeinput") {
      if (editor && event.cancelable && activeLease?.phase !== "composing") {
        const inputType = (event as InputEvent).inputType ?? "";
        if (inputType.startsWith("format")) {
          event.preventDefault();
          return failure("text_format_unsupported", "source text has no native formatting state");
        }
        if (inputType === "historyUndo" || inputType === "historyRedo") {
          event.preventDefault();
          const result = inputType === "historyUndo" ? editor.undo() : editor.redo();
          return result.ok ? RENDERED : failure(result.code, result.reason ?? result.code);
        }
      }
      if (trailingComposition) {
        if (isCompositionInput(event)) return NO_CHANGE;
        finishTrailing();
      }
      if (activeLease !== null) return NO_CHANGE;
      return begin("native", event);
    }

    if (event.type === "compositionstart") {
      if (trailingComposition) finishTrailing();
      return begin("composing", event);
    }

    if (event.type === "compositionend") {
      if (trailingComposition || activeLease === null) return NO_CHANGE;
      activeLease.phase = "composing";
      const result = commitObservation();
      trailingComposition = true;
      trailingTimer = setTimeout(finishTrailing, 0);
      return result;
    }

    if (event.type === "input") {
      if (trailingComposition) {
        finishTrailing();
        return NO_CHANGE;
      }
      if (activeLease?.phase === "composing") return NO_CHANGE;
      if (activeLease !== null) return commitObservation();
      renderLatest(undefined, true);
      return failure(
        "missing_text_lease",
        "native input arrived without a contenteditable lease",
      );
    }

    return NO_CHANGE;
  };

  const boundHandle = (event: Event): void => {
    if (!isWebEditingHostTarget(root, event.target)) return;
    if (event.defaultPrevented) return;
    handleInternal(event);
  };

  const onDocumentChange = (): void => {
    if (activeLease !== null || trailingComposition || rendering) return;
    const hasSelection = currentDOMSelection() !== null;
    renderLatest(editor ? hasSelection ? editor.snapshot.selection : null : undefined, editor !== undefined);
  };

  const onSelectionChange = (): void => {
    if (!editor || rendering || activeLease || trailingComposition) return;
    const selection = currentDOMSelection();
    if (selection === null) return;
    const current = editor.snapshot.selection;
    if (selection.anchor === current.anchor && selection.focus === current.focus) return;
    editor.select(selection);
  };

  const clipboard = editor ? createWebClipboardBinding({
    codec: textClipboardCodec,
    read: () => {
      const selection = currentDOMSelection();
      if (selection) editor.select(selection);
      const text = editor.copy();
      return text.length ? { type: "text/plain" as const, text } : null;
    },
    cut: () => editor.insert(""),
    paste: (payload) => {
      const selection = currentDOMSelection();
      if (selection) editor.select(selection);
      return editor.insert(payload.text);
    },
  }) : null;
  const onClipboard = (event: ClipboardEvent): void => {
    if (!clipboard || !isWebEditingHostTarget(root, event.target) || event.defaultPrevented) return;
    if (activeLease || trailingComposition) { event.preventDefault(); return; }
    if (event.type === "copy") clipboard.copy(event);
    else if (event.type === "cut") clipboard.cut(event);
    else {
      // This root accepts source text only, including refusal of HTML-only paste.
      event.preventDefault();
      clipboard.paste(event);
    }
  };

  const unbind = (): void => {
    if (!bound) return;
    bound = false;
    for (const type of ROOT_EVENTS) {
      root.removeEventListener(type, boundHandle, true);
    }
    unsubscribeDocument?.();
    unsubscribeDocument = null;
    root.ownerDocument.removeEventListener("selectionchange", onSelectionChange);
    for (const type of ["copy", "cut", "paste"]) root.removeEventListener(type, onClipboard as EventListener);
    clearActiveLease();
    clearTrailing();
  };

  return Object.freeze({
    bind(): () => void {
      if (bound) return () => {};
      bound = true;
      for (const type of ROOT_EVENTS) {
        root.addEventListener(type, boundHandle, true);
      }
      unsubscribeDocument = editor ? editor.subscribe(onDocumentChange) : document.subscribe(onDocumentChange);
      if (editor) {
        root.ownerDocument.addEventListener("selectionchange", onSelectionChange);
        for (const type of ["copy", "cut", "paste"]) root.addEventListener(type, onClipboard as EventListener);
      }
      renderLatest(undefined, true);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unbind();
      };
    },
    handle(event: Event): ContentEditableBindingResult {
      return handleInternal(event);
    },
    cancel(): ContentEditableBindingResult {
      return cancelInternal();
    },
    reset(): void {
      clearActiveLease();
      clearTrailing();
      renderLatest(undefined, true);
    },
  });
}

function isCompositionInput(event: Event): boolean {
  const inputType = "inputType" in event
    && typeof event.inputType === "string"
    ? event.inputType
    : "";
  const isComposing = "isComposing" in event
    && event.isComposing === true;
  return isComposing
    || inputType === "insertCompositionText"
    || inputType === "insertFromComposition"
    || inputType === "deleteCompositionText";
}

function failure(
  code: string,
  reason: string,
): Extract<ContentEditableBindingResult, { readonly ok: false }> {
  return Object.freeze({ ok: false, code, reason });
}

const ROOT_EVENTS = Object.freeze([
  "focus",
  "beforeinput",
  "compositionstart",
  "compositionend",
  "input",
  "blur",
  "keydown",
] as const);

const NO_CHANGE: ContentEditableBindingResult = Object.freeze({
  ok: true,
  kind: "no-change",
});

const LEASE_STARTED: ContentEditableBindingResult = Object.freeze({
  ok: true,
  kind: "lease-started",
});

const RENDERED: ContentEditableBindingResult = Object.freeze({
  ok: true,
  kind: "rendered",
});

const CANCELLED: ContentEditableBindingResult = Object.freeze({
  ok: true,
  kind: "cancelled",
});

const COMMITTED: ContentEditableBindingResult = Object.freeze({
  ok: true,
  kind: "committed",
});
