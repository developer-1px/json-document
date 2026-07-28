import type {
  CollaborationTextCapture,
  CollaborationTextSelection,
} from "@interactive-os/json-document-collaboration/text";
import { plainTextCollaborationDOM } from "./dom/plainText.js";
import type {
  CollaborationContentEditableAdapter,
  CollaborationContentEditableOptions,
  CollaborationContentEditableResult,
} from "./types.js";

interface ActiveLease {
  readonly capture: CollaborationTextCapture;
  phase: "native" | "composing";
  nativeFallback: ReturnType<typeof setTimeout> | null;
}

interface TailPublication {
  readonly token: number;
  readonly basis: TailSelectionBasis | null;
  readonly selection: CollaborationTextSelection | null;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface TailSelectionBasis {
  readonly capture: CollaborationTextCapture;
  readonly selection: CollaborationTextSelection;
}

interface PublishedProjection {
  readonly available: boolean;
  readonly value: string;
}

/**
 * Binds one contenteditable root to one collaborative string pointer.
 *
 * Collaboration ingestion is never paused. While native input owns the root,
 * only DOM publication is leased; release always renders the latest model.
 */
export function createCollaborationContentEditableAdapter({
  dom = plainTextCollaborationDOM,
  onResult,
  pointer,
  root,
  runtime,
}: CollaborationContentEditableOptions): CollaborationContentEditableAdapter {
  let activeLease: ActiveLease | null = null;
  let tail: TailPublication | null = null;
  let tailSequence = 0;
  let published: PublishedProjection | null = null;
  let bound = false;
  let unsubscribeDocument: (() => void) | null = null;

  const report = (
    result: CollaborationContentEditableResult,
  ): CollaborationContentEditableResult => {
    onResult?.(result);
    return result;
  };

  const currentDOMSelection = (): CollaborationTextSelection | null =>
    dom.observe(root).selection;

  const publishLatest = (
    requestedSelection: CollaborationTextSelection | null | undefined,
    force: boolean,
  ): CollaborationContentEditableResult => {
    const read = runtime.document.at(pointer);
    const available = read.ok && typeof read.value === "string";
    const value = available ? read.value as string : "";
    const unchanged = (
      published !== null
      && published.available === available
      && published.value === value
    );
    if (!force && unchanged) {
      return NO_CHANGE;
    }

    const selection = requestedSelection === undefined
      ? currentDOMSelection()
      : requestedSelection;
    dom.render(root, value);
    published = { available, value };
    if (selection !== null && available) {
      dom.restoreSelection(root, selection);
    }
    return RENDERED;
  };

  const clearTail = (): void => {
    if (tail === null) return;
    clearTimeout(tail.timer);
    tail = null;
  };

  const clearActiveLease = (): void => {
    const fallback = activeLease?.nativeFallback;
    if (fallback !== null && fallback !== undefined) clearTimeout(fallback);
    activeLease = null;
  };

  const finishTail = (
    expectedToken?: number,
  ): CollaborationContentEditableResult => {
    if (
      tail === null
      || (
        expectedToken !== undefined
        && tail.token !== expectedToken
      )
    ) {
      return NO_CHANGE;
    }
    const basis = tail.basis;
    const selection = tail.selection;
    clearTail();
    if (basis === null) return publishLatest(selection, true);

    const planned = runtime.text.plan(basis.capture, {
      value: basis.capture.value,
      selection: basis.selection,
    });
    if (!planned.ok) {
      publishLatest(basis.selection, true);
      return failure(planned.code, planned.reason);
    }
    const committed = runtime.text.commit(planned.plan);
    if (!committed.ok) {
      publishLatest(basis.selection, true);
      return failure(committed.code, committed.reason);
    }
    return publishLatest(committed.selection, true);
  };

  const enterTail = (
    basis: TailSelectionBasis | null,
    selection: CollaborationTextSelection | null,
  ): void => {
    clearTail();
    const token = tailSequence + 1;
    tailSequence = token;
    const timer = setTimeout(() => {
      const result = finishTail(token);
      if (!result.ok) report(result);
    }, 0);
    tail = { token, basis, selection, timer };
  };

  const recover = (
    failure: Extract<
      CollaborationContentEditableResult,
      { readonly ok: false }
    >,
    selection: CollaborationTextSelection | null,
    composition: boolean,
  ): CollaborationContentEditableResult => {
    clearActiveLease();
    if (composition) {
      enterTail(null, selection);
    } else {
      publishLatest(selection, true);
    }
    return failure;
  };

  const begin = (
    phase: ActiveLease["phase"],
    event: Event,
  ): CollaborationContentEditableResult => {
    if (tail !== null) finishTail();
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
    const captured = runtime.text.capture(pointer);
    if (!captured.ok) {
      if (event.cancelable) event.preventDefault();
      publishLatest(undefined, true);
      return failure(captured.code, captured.reason);
    }
    activeLease = {
      capture: captured.capture,
      phase,
      nativeFallback: null,
    };
    if (phase === "native") {
      const lease = activeLease;
      lease.nativeFallback = setTimeout(() => {
        if (activeLease !== lease || lease.phase !== "native") return;
        clearActiveLease();
        publishLatest(undefined, true);
        report(CANCELLED);
      }, 0);
    }
    return LEASE_STARTED;
  };

  const finalize = (
    composition: boolean,
  ): CollaborationContentEditableResult => {
    const lease = activeLease;
    if (lease === null) return NO_CHANGE;
    if (lease.nativeFallback !== null) {
      clearTimeout(lease.nativeFallback);
      lease.nativeFallback = null;
    }
    const observation = dom.observe(root);
    const planned = runtime.text.plan(lease.capture, {
      value: observation.value,
      ...(observation.selection === null
        ? {}
        : { selection: observation.selection }),
    });
    if (!planned.ok) {
      return recover(
        failure(planned.code, planned.reason),
        observation.selection,
        composition,
      );
    }
    const committed = runtime.text.commit(planned.plan);
    if (!committed.ok) {
      return recover(
        failure(committed.code, committed.reason),
        observation.selection,
        composition,
      );
    }

    clearActiveLease();
    if (composition) {
      const captured = runtime.text.capture(pointer);
      enterTail(
        captured.ok && committed.selection !== null
          ? {
              capture: captured.capture,
              selection: committed.selection,
            }
          : null,
        committed.selection,
      );
    } else {
      publishLatest(committed.selection, true);
    }
    return Object.freeze({
      ok: true,
      kind: "committed",
      changeId: committed.changeId,
      projectionChanged: committed.projectionChanged,
      selection: committed.selection,
    });
  };

  const cancelInternal = (): CollaborationContentEditableResult => {
    const changed = activeLease !== null || tail !== null;
    if (!changed) return NO_CHANGE;
    clearActiveLease();
    clearTail();
    publishLatest(undefined, true);
    return CANCELLED;
  };

  const handleInternal = (
    event: Event,
  ): CollaborationContentEditableResult => {
    if (event.type === "blur") return cancelInternal();

    if (event.type === "beforeinput") {
      if (tail !== null) {
        if (isCompositionInput(event)) return NO_CHANGE;
        finishTail();
      }
      if (activeLease !== null) return NO_CHANGE;
      return begin("native", event);
    }

    if (event.type === "compositionstart") {
      if (tail !== null) finishTail();
      return begin("composing", event);
    }

    if (event.type === "compositionend") {
      if (tail !== null || activeLease === null) return NO_CHANGE;
      activeLease.phase = "composing";
      return finalize(true);
    }

    if (event.type === "input") {
      if (tail !== null) return finishTail();
      if (activeLease?.phase === "composing") return NO_CHANGE;
      if (activeLease !== null) return finalize(false);
      const result = failure(
        "missing_text_capture",
        "native input arrived without a capture-time text basis",
      );
      publishLatest(undefined, true);
      return result;
    }

    return NO_CHANGE;
  };

  const boundHandle = (event: Event): void => {
    if (!eventBelongsToRoot(event, root)) return;
    report(handleInternal(event));
  };

  const onDocumentChange = (): void => {
    if (activeLease !== null || tail !== null) {
      return;
    }
    publishLatest(undefined, false);
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
    clearTail();
  };

  return Object.freeze({
    bind(): () => void {
      if (bound) return () => {};
      bound = true;
      for (const type of ROOT_EVENTS) {
        root.addEventListener(type, boundHandle, true);
      }
      unsubscribeDocument = runtime.document.subscribe(onDocumentChange);
      const initial = publishLatest(undefined, true);
      if (!initial.ok) report(initial);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unbind();
      };
    },
    handle(event: Event): CollaborationContentEditableResult {
      return report(handleInternal(event));
    },
    cancel(): CollaborationContentEditableResult {
      return report(cancelInternal());
    },
    reset(): void {
      clearActiveLease();
      clearTail();
      publishLatest(undefined, true);
    },
  });
}

function eventBelongsToRoot(event: Event, root: HTMLElement): boolean {
  const target = event.target;
  if (!(target instanceof root.ownerDocument.defaultView!.Node)) return false;
  if (target === root) return true;
  if (!root.contains(target)) return false;

  let element = target instanceof root.ownerDocument.defaultView!.Element
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
): Extract<
  CollaborationContentEditableResult,
  { readonly ok: false }
> {
  return Object.freeze({ ok: false, code, reason });
}

const ROOT_EVENTS = Object.freeze([
  "beforeinput",
  "compositionstart",
  "compositionend",
  "input",
  "blur",
] as const);

const NO_CHANGE: CollaborationContentEditableResult = Object.freeze({
  ok: true,
  kind: "no-change",
});

const LEASE_STARTED: CollaborationContentEditableResult = Object.freeze({
  ok: true,
  kind: "lease-started",
});

const RENDERED: CollaborationContentEditableResult = Object.freeze({
  ok: true,
  kind: "rendered",
});

const CANCELLED: CollaborationContentEditableResult = Object.freeze({
  ok: true,
  kind: "cancelled",
});
