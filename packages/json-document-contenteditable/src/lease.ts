import { registerWebInteractionSource, traceWebInteraction } from "@interactive-os/json-document-web/interaction-recording";
import { selectAllAffordance } from "@interactive-os/json-document-affordance";
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
  lineBreakAfterComposition: "requested" | "native" | null;
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
  insertBreak = (editor) => editor.insert("\n"),
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
  let compositionEnter: { timeStamp: number; keyCode: number; released: boolean } | null = null;
  const keyboard = createWebKeyboardAdapter();
  let diagnosticEvent: Event | undefined;
  let unregisterDiagnosticSource: (() => void) | null = null;
  let unsubscribeDiagnosticDocument: (() => void) | null = null;
  const diagnosticState = () => ({
    pointer, model: readString(), dom: dom.observe(root),
    lease: activeLease && { phase: activeLease.phase, value: activeLease.value, lineBreakAfterComposition: activeLease.lineBreakAfterComposition },
    trailingComposition, compositionEnterKeyDown: compositionEnter !== null, compositionEnter, rendering,
    editor: editor && { selection: editor.snapshot.selection, revision: editor.snapshot.revision,
      canUndo: editor.snapshot.canUndo, canRedo: editor.snapshot.canRedo },
  });
  const trace = (kind: string, extra: unknown = null) =>
    traceWebInteraction(root, `contenteditable.${kind}`, () => ({ ...diagnosticState(), extra }), diagnosticEvent);

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
      trace("command", { command: "replace", reason: "native-observation" });
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
    let selection = observation.selection;
    if (editor && lease.lineBreakAfterComposition === "requested") {
      const focus = (selection ?? editor.snapshot.selection).focus;
      editor.select({ anchor: focus, focus });
      trace("command", { command: "insert-break", reason: "composition-enter" });
      const inserted = insertBreak(editor);
      if (!inserted.ok) {
        clearActiveLease();
        renderLatest(undefined, true);
        return failure(inserted.code, inserted.reason ?? inserted.code);
      }
      selection = inserted.snapshot.selection;
    }
    clearActiveLease();
    renderLatest(selection, true);
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
    activeLease = { phase, nativeFallback: null, value: current.value, lineBreakAfterComposition: null };
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
    dom.resetNavigation?.(root);
    compositionEnter = null;
    const changed = activeLease !== null || trailingComposition;
    if (!changed) return NO_CHANGE;
    clearActiveLease();
    clearTrailing();
    renderLatest(undefined, true);
    return CANCELLED;
  };

  const handleInternal = (event: Event): ContentEditableBindingResult => {
    if (editor && event.type === "keydown") {
      const key = event as KeyboardEvent;
      // A replayed IME release may precede another keydown with the original
      // timestamp. A distinct timestamp after that release is a new press,
      // however close in time; no debounce window is needed.
      if (!isEnterKey(key) || key.repeat
        || (compositionEnter?.released && key.timeStamp !== compositionEnter.timeStamp)) {
        compositionEnter = null;
      }
      if (activeLease?.phase === "composing" && isEnterKey(key) && !key.metaKey && !key.ctrlKey && !key.altKey) {
        // Let the IME confirm its text. The line break follows compositionend.
        if (activeLease.lineBreakAfterComposition !== "native") {
          activeLease.lineBreakAfterComposition = "requested";
        }
        compositionEnter = { timeStamp: key.timeStamp, keyCode: key.keyCode, released: false };
        return NO_CHANGE;
      }
    }
    if (event.type === "keyup" && isEnterKey(event as KeyboardEvent)) {
      const key = event as KeyboardEvent;
      // The captured Korean IME sequence replays keyup(13) with precisely the
      // keydown(229) timestamp, then keydown(13). The real release is later.
      if (compositionEnter?.keyCode === 229 && key.keyCode === 13
        && key.timeStamp === compositionEnter.timeStamp && !compositionEnter.released) {
        compositionEnter.released = true;
      } else {
        compositionEnter = null;
      }
    }
    if (["pointerdown", "beforeinput", "compositionstart", "blur"].includes(event.type)) dom.resetNavigation?.(root);
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
      const vertical = command?.type === "move" && (command.direction === "up" || command.direction === "down")
        && !keyboardEvent.altKey && !keyboardEvent.ctrlKey && !keyboardEvent.metaKey;
      if (!vertical && !["Shift", "Control", "Alt", "Meta"].includes(keyboardEvent.key)) dom.resetNavigation?.(root);
      if (vertical && !activeLease && !trailingComposition && !keyboardEvent.isComposing && keyboardEvent.keyCode !== 229) {
        const selection = currentDOMSelection();
        const next = selection && dom.resolveVerticalSelection?.(root, selection,
          command.direction === "up" ? "backward" : "forward", command.operation === "extend");
        if (next) {
          event.preventDefault();
          editor.select(next);
          return renderLatest(next, true);
        }
      }
      if (!activeLease && !trailingComposition && !keyboardEvent.isComposing && keyboardEvent.keyCode !== 229
        && command?.type === "move" && (command.direction === "left" || command.direction === "right")) {
        const selection = currentDOMSelection();
        const next = selection && dom.resolveHorizontalSelection?.(root, selection,
          command.direction === "left" ? "backward" : "forward", command.operation === "extend");
        if (next) {
          event.preventDefault();
          editor.select(next);
          return renderLatest(next, true);
        }
      }
      const current = editor.snapshot.selection;
      const text = readString();
      const selectAll = selectAllAffordance(keyboardEvent, {
        allSelected: Math.min(current.anchor, current.focus) === 0 && Math.max(current.anchor, current.focus) === text.value.length,
      }, { repeat: "preserve" });
      if (selectAll.hand?.type === "select-all" && text.available) {
        event.preventDefault();
        cancelInternal();
        const selection = { anchor: 0, focus: text.value.length };
        editor.select(selection);
        return renderLatest(selection, true);
      }
      if (command?.type === "undo" || command?.type === "redo") {
        event.preventDefault();
        cancelInternal();
        trace("command", { command: command.type, reason: "keydown" });
        const result = command.type === "undo" ? editor.undo() : editor.redo();
        return result.ok ? RENDERED : failure(result.code, result.reason ?? result.code);
      }
    }

    if (event.type === "beforeinput") {
      const inputType = (event as InputEvent).inputType ?? "";
      if (editor && event.cancelable && (compositionEnter || activeLease?.lineBreakAfterComposition)
        && (inputType === "insertParagraph" || inputType === "insertLineBreak")) {
        // Some browsers also emit a native break for the same confirming Enter.
        event.preventDefault();
        return NO_CHANGE;
      }
      if (editor && event.cancelable && activeLease?.phase !== "composing") {
        if (!activeLease && !trailingComposition && !(event as InputEvent).isComposing
          && (inputType === "deleteContentBackward" || inputType === "deleteContentForward")) {
          const selection = currentDOMSelection();
          const range = selection && dom.resolveDeletionSelection?.(root, selection,
            inputType === "deleteContentBackward" ? "backward" : "forward");
          if (selection && range) {
            event.preventDefault();
            editor.select(selection);
            const from = Math.min(range.anchor, range.focus), to = Math.max(range.anchor, range.focus);
            trace("command", {command: "replace", reason: "projected-source-deletion", from, to});
            const result = editor.replace(editor.text.slice(0, from) + editor.text.slice(to), {anchor: from, focus: from});
            return result.ok ? COMMITTED : failure(result.code, result.reason ?? result.code);
          }
        }
        if (inputType === "insertParagraph" || inputType === "insertLineBreak") {
          event.preventDefault();
          if (trailingComposition) finishTrailing();
          const selection = currentDOMSelection();
          if (selection) editor.select(selection);
          trace("command", { command: "insert-break", reason: "beforeinput" });
          const result = insertBreak(editor);
          return result.ok ? COMMITTED : failure(result.code, result.reason ?? result.code);
        }
        if (inputType.startsWith("format")) {
          event.preventDefault();
          return failure("text_format_unsupported", "source text has no native formatting state");
        }
        if (inputType === "historyUndo" || inputType === "historyRedo") {
          event.preventDefault();
          trace("command", { command: inputType, reason: "beforeinput" });
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
      if (activeLease?.phase === "composing") {
        const input = event as InputEvent;
        // A non-cancelable native break can complete before compositionend.
        // Its DOM result will be committed with the composition, so do not
        // append the break requested by the same Enter a second time.
        if (input.inputType === "insertParagraph" || input.inputType === "insertLineBreak") {
          activeLease.lineBreakAfterComposition = "native";
        }
        return NO_CHANGE;
      }
      if (activeLease !== null) return commitObservation();
      renderLatest(undefined, true);
      return failure(
        "missing_text_lease",
        "native input arrived without a contenteditable lease",
      );
    }

    return NO_CHANGE;
  };

  const handleRecorded = (event: Event): ContentEditableBindingResult => {
    const previous = diagnosticEvent;
    diagnosticEvent = event;
    trace("before-event", { type: event.type });
    try {
      const result = handleInternal(event);
      trace("after-event", { type: event.type, result: { ok: result.ok, code: "code" in result ? result.code : undefined }, defaultPrevented: event.defaultPrevented });
      return result;
    } finally { diagnosticEvent = previous; }
  };

  const boundHandle = (event: Event): void => {
    if (!isWebEditingHostTarget(root, event.target)) return;
    if (event.defaultPrevented) return;
    handleRecorded(event);
  };

  const onDocumentChange = (): void => {
    trace("editor-change");
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
    dom.resetNavigation?.(root);
    if (!bound) return;
    bound = false;
    for (const type of ROOT_EVENTS) {
      root.removeEventListener(type, boundHandle, true);
    }
    unsubscribeDocument?.();
    unsubscribeDocument = null;
    unregisterDiagnosticSource?.();
    unregisterDiagnosticSource = null;
    unsubscribeDiagnosticDocument?.();
    unsubscribeDiagnosticDocument = null;
    root.ownerDocument.removeEventListener("selectionchange", onSelectionChange);
    for (const type of ["copy", "cut", "paste"]) root.removeEventListener(type, onClipboard as EventListener);
    clearActiveLease();
    clearTrailing();
    compositionEnter = null;
  };

  return Object.freeze({
    bind(): () => void {
      if (bound) return () => {};
      bound = true;
      unregisterDiagnosticSource = registerWebInteractionSource(root, "contenteditable", diagnosticState);
      unsubscribeDiagnosticDocument = document.subscribe(change => {
        traceWebInteraction(root, "contenteditable.document-commit", () => ({
          ...diagnosticState(), applied: change.applied.filter(operation => operation.path === pointer),
          metadata: change.metadata,
        }), diagnosticEvent);
      });
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
      return handleRecorded(event);
    },
    cancel(): ContentEditableBindingResult {
      return cancelInternal();
    },
    reset(): void {
      compositionEnter = null;
      clearActiveLease();
      clearTrailing();
      renderLatest(undefined, true);
    },
  });
}

function isEnterKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter";
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
  "pointerdown",
  "beforeinput",
  "compositionstart",
  "compositionend",
  "input",
  "blur",
  "keydown",
  "keyup",
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
