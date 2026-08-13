import { plainTextDOMAdapter } from "./dom/plain-text.js";
import type {
  ContentEditableBinding,
  ContentEditableBindingOptions,
  ContentEditableBindingResult,
  TextSelection,
} from "./types.js";

interface ActiveLease {
  phase: "native" | "composing";
  nativeFallback: ReturnType<typeof setTimeout> | null;
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
}: ContentEditableBindingOptions): ContentEditableBinding {
  let activeLease: ActiveLease | null = null;
  let trailingComposition = false;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let renderedDocument: RenderedDocument | null = null;
  let bound = false;
  let unsubscribeDocument: (() => void) | null = null;

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
    dom.render(root, next.value);
    renderedDocument = next;
    if (selection !== null && next.available) {
      dom.restoreSelection(root, selection);
    }
    return RENDERED;
  };

  const clearTrailing = (): void => {
    if (trailingTimer !== null) clearTimeout(trailingTimer);
    trailingTimer = null;
    trailingComposition = false;
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
    if (observation.value !== current.value) {
      const committed = document.commit([{
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
    activeLease = { phase, nativeFallback: null };
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
    if (event.type === "blur") return cancelInternal();

    if (event.type === "beforeinput") {
      if (trailingComposition) {
        if (isCompositionInput(event)) return NO_CHANGE;
        clearTrailing();
      }
      if (activeLease !== null) return NO_CHANGE;
      return begin("native", event);
    }

    if (event.type === "compositionstart") {
      if (trailingComposition) clearTrailing();
      return begin("composing", event);
    }

    if (event.type === "compositionend") {
      if (trailingComposition || activeLease === null) return NO_CHANGE;
      activeLease.phase = "composing";
      const result = commitObservation();
      trailingComposition = true;
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        trailingComposition = false;
      }, 0);
      return result;
    }

    if (event.type === "input") {
      if (trailingComposition) {
        clearTrailing();
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
    if (!eventBelongsToRoot(event, root)) return;
    handleInternal(event);
  };

  const onDocumentChange = (): void => {
    if (activeLease !== null || trailingComposition) return;
    renderLatest(undefined, false);
  };

  const unbind = (): void => {
    if (!bound) return;
    bound = false;
    for (const type of ROOT_EVENTS) {
      root.removeEventListener(type, boundHandle, true);
    }
    unsubscribeDocument?.();
    unsubscribeDocument = null;
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
      unsubscribeDocument = document.subscribe(onDocumentChange);
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

function eventBelongsToRoot(event: Event, root: HTMLElement): boolean {
  const target = event.target;
  const view = root.ownerDocument.defaultView;
  if (view === null || !(target instanceof view.Node)) return false;
  if (target === root) return true;
  if (!root.contains(target)) return false;

  let element = target instanceof view.Element
    ? target
    : target.parentElement;
  while (element !== null && element !== root) {
    const tag = element.tagName.toLowerCase();
    if (
      tag === "input"
      || tag === "textarea"
      || tag === "select"
      || tag === "option"
    ) {
      return false;
    }
    const editable = element.getAttribute("contenteditable");
    const editableProperty = "contentEditable" in element
      && typeof element.contentEditable === "string"
      ? element.contentEditable.toLowerCase()
      : "";
    if (
      (editable !== null || editableProperty !== "")
      && (
        editable === ""
        || editable?.toLowerCase() === "true"
        || editable?.toLowerCase() === "plaintext-only"
        || editable?.toLowerCase() === "false"
        || editableProperty === "true"
        || editableProperty === "plaintext-only"
        || editableProperty === "false"
      )
    ) {
      return false;
    }
    element = element.parentElement;
  }
  return true;
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
  "beforeinput",
  "compositionstart",
  "compositionend",
  "input",
  "blur",
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
