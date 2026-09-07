import {
  applyPatch,
  createJSONDocument,
  jsonEqual,
  type JSONAppliedChange,
  type JSONDocument,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import type { SelectionHistoryEntry } from "@interactive-os/json-document-selection";
import { invertEditingPatch } from "./invert-patch.js";
import type { EditingHistoryOptions, EditingHistoryResult, EditingHistoryStatus } from "./history.js";

export interface EditingDocumentChange {
  readonly before: JSONValue;
  readonly after: JSONValue;
  /** Null when catching up without an observed, matching applied change. */
  readonly change: JSONAppliedChange | null;
}

export interface EditingSessionOptions<Selection extends JSONValue> extends EditingHistoryOptions {
  readonly document: JSONDocument;
  readonly selection: Selection;
  readonly mapSelection?: (selection: Selection, change: EditingDocumentChange) => Selection;
  readonly reconcileSelection?: (selection: Selection, value: JSONValue) => Selection;
}

export interface EditingPlan<Selection extends JSONValue> {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter: Selection;
  readonly origin: string;
  readonly history?: "record" | "ignore";
  /** Groups local inverse history. An external history owner defines its own steps. */
  readonly historyGroup?: string;
}

export interface EditingSnapshot<Selection extends JSONValue> {
  readonly value: JSONValue;
  readonly selection: Selection;
  readonly revision: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export type EditingResult<Selection extends JSONValue> =
  | { readonly ok: true; readonly snapshot: EditingSnapshot<Selection>; readonly change?: JSONAppliedChange }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

export interface EditingSession<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  apply(plan: EditingPlan<Selection>): EditingResult<Selection>;
  select(selection: Selection): EditingSnapshot<Selection>;
  reconcile(reconciler: (selection: Selection, value: JSONValue) => Selection): EditingSnapshot<Selection>;
  undo(): EditingResult<Selection>;
  redo(): EditingResult<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}

interface HistoryEntry<Selection extends JSONValue>
  extends SelectionHistoryEntry<Selection, JSONPatchOperation> {
  readonly group?: string;
}

export function createEditingSession<Selection extends JSONValue>(options: EditingSessionOptions<Selection>): EditingSession<Selection> {
  const document = options.document;
  let selection = ownSelection(options.selection);
  let revision = 0;
  let undoStack: HistoryEntry<Selection>[] = [];
  let redoStack: HistoryEntry<Selection>[] = [];
  let activeHistoryGroup: string | undefined;
  let isCommitting = false;
  let observedValue = document.value;
  let unsubscribeDocument: (() => void) | null = null;
  let unsubscribeHistory: (() => void) | null = null;
  let observedHistory = options.history?.status();
  let pendingHistoryRestore: {
    readonly value: JSONValue;
    readonly status: EditingHistoryStatus;
    readonly reference: { readonly value: JSONValue; readonly selection: Selection };
  } | null = null;
  const historySelections = new Map<string, {
    readonly before: { readonly value: JSONValue; readonly selection: Selection };
    readonly after: { readonly value: JSONValue; readonly selection: Selection };
  }>();
  const listeners = new Set<(snapshot: EditingSnapshot<Selection>) => void>();
  const notifications: Array<{ snapshot: EditingSnapshot<Selection>; listeners: Array<(snapshot: EditingSnapshot<Selection>) => void> }> = [];
  let isNotifying = false;

  function ownSelection(value: Selection): Selection {
    // JSON Document owns detachment and immutable JSON values, including selection.
    return createJSONDocument(clone(value)).value as Selection;
  }

  function currentSnapshot(): EditingSnapshot<Selection> {
    return Object.freeze({
      value: observedValue,
      selection,
      revision,
      canUndo: observedHistory?.canUndo ?? undoStack.length > 0,
      canRedo: observedHistory?.canRedo ?? redoStack.length > 0,
    });
  }

  function publish(): EditingSnapshot<Selection> {
    const current = currentSnapshot();
    notifications.push({ snapshot: current, listeners: [...listeners] });
    if (isNotifying) return current;
    isNotifying = true;
    try {
      for (let index = 0; index < notifications.length; index += 1) {
        const notification = notifications[index]!;
        for (const listener of notification.listeners) {
          if (!listeners.has(listener)) continue;
          try { listener(notification.snapshot); } catch { /* Observers cannot reject a completed edit. */ }
        }
      }
    } finally {
      notifications.length = 0;
      isNotifying = false;
    }
    return current;
  }

  function mappedSelection(
    reference: { readonly value: JSONValue; readonly selection: Selection },
    after: JSONValue,
    change: JSONAppliedChange | null,
  ): Selection {
    let next = reference.selection;
    if (options.mapSelection) next = ownSelection(options.mapSelection(next, { before: reference.value, after, change }));
    if (options.reconcileSelection) next = ownSelection(options.reconcileSelection(next, after));
    return next;
  }

  function synchronizeExternalChange(change?: JSONAppliedChange): void {
    if (isCommitting) return;
    if (pendingHistoryRestore) completeHistoryRestore();
    const nextHistory = options.history?.status();
    const historyChanged = nextHistory?.revision !== observedHistory?.revision;
    const latest = document.value;
    if (jsonEqual(observedValue, latest)) {
      if (historyChanged) {
        observedHistory = nextHistory;
        revision += 1;
        publish();
      }
      return;
    }
    const before = observedValue;
    const replay = options.mapSelection && change !== undefined ? applyPatch(before, change.applied) : null;
    // A failed callback leaves the entire observed transition retryable.
    const nextSelection = mappedSelection({ value: before, selection }, latest,
      replay?.ok && jsonEqual(replay.value, latest) ? change! : null);
    observedValue = latest;
    observedHistory = nextHistory;
    selection = nextSelection;
    undoStack = [];
    redoStack = [];
    activeHistoryGroup = undefined;
    revision += 1;
    // Reads and commands must not consume a revision without its notification.
    publish();
  }

  function commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata: Readonly<Record<string, JSONValue>>,
  ) {
    const before = observedValue;
    let notifications = 0;
    const release = document.subscribe(() => { notifications++; });
    isCommitting = true;
    try {
      const result = document.commit(operations, { metadata });
      if (!result.ok) return result;
      // Normally the current document is exactly this commit's result. Only a
      // reentrant document write needs a replay to recover the earlier value.
      const replay = notifications > 1 ? applyPatch(before, result.change.applied) : null;
      observedValue = replay?.ok ? replay.value : document.value;
      return result;
    } finally {
      release();
      isCommitting = false;
    }
  }

  function observeDocument(change: JSONAppliedChange): void {
    synchronizeExternalChange(change);
  }

  function publishCommit(): EditingSnapshot<Selection> {
    const own = publish();
    catchUpAfterCommit();
    return own;
  }

  function catchUpAfterCommit(): void {
    try { synchronizeExternalChange(); } catch {
      // A later external callback failure cannot reject this completed edit.
      // The next read or command retries synchronization and surfaces the error.
    }
  }

  function apply(plan: EditingPlan<Selection>): EditingResult<Selection> {
    if (isCommitting) return { ok: false, code: "editing.reentrancy" };
    synchronizeExternalChange();
    if (options.history && plan.history === "ignore" && plan.operations.length > 0) {
      return { ok: false, code: "history.ignore-unsupported", reason: "The external history owner records document commits." };
    }
    const beforeValue = observedValue;
    const beforeSelection = selection;
    const selectionAfter = ownSelection(plan.selectionAfter);
    if (plan.operations.length === 0) {
      selection = selectionAfter;
      revision += 1;
      return { ok: true, snapshot: publish() };
    }

    const inverse = options.history ? [] : invertEditingPatch(document, plan.operations);
    if (inverse === null) {
      const validation = document.validatePatch(plan.operations);
      return validation.ok ? { ok: false, code: "history.inverse-unavailable" } : validation;
    }
    const result = commit(plan.operations, {
      editing: {
        origin: plan.origin,
        selectionBefore: clone(beforeSelection),
        selectionAfter: clone(selectionAfter),
      },
    });
    if (!result.ok) return result;

    selection = selectionAfter;
    revision += 1;
    const historyStatus = options.history?.status();
    observedHistory = historyStatus;
    if (historyStatus?.undoTarget && result.change.applied.length > 0 && jsonEqual(observedValue, document.value)) {
      historySelections.set(historyStatus.undoTarget, {
        before: { value: beforeValue, selection: beforeSelection },
        after: { value: observedValue, selection },
      });
    }
    if (!options.history && plan.history !== "ignore" && result.change.applied.length > 0) {
      const entry: HistoryEntry<Selection> = {
        forward: result.change.applied,
        inverse,
        selectionBefore: beforeSelection,
        selectionAfter: selection,
        ...(plan.historyGroup === undefined ? {} : { group: plan.historyGroup }),
      };
      const previous = undoStack.at(-1);
      if (previous && plan.historyGroup !== undefined && activeHistoryGroup === plan.historyGroup && previous.group === plan.historyGroup) {
        undoStack = [...undoStack.slice(0, -1), {
          ...entry,
          forward: [...previous.forward, ...entry.forward],
          inverse: [...entry.inverse, ...previous.inverse],
          selectionBefore: previous.selectionBefore,
        }];
      } else {
        undoStack = [...undoStack, entry];
      }
      activeHistoryGroup = plan.historyGroup;
      redoStack = [];
    }
    return { ok: true, snapshot: publishCommit(), change: result.change };
  }

  function restore(entry: HistoryEntry<Selection>, direction: "undo" | "redo"): EditingResult<Selection> {
    const operations = direction === "undo" ? entry.inverse : entry.forward;
    const nextSelection = direction === "undo" ? entry.selectionBefore : entry.selectionAfter;
    const result = commit(operations, {
      editing: { origin: direction, selectionAfter: clone(nextSelection) },
    });
    if (!result.ok) return result;
    selection = nextSelection;
    revision += 1;
    activeHistoryGroup = undefined;
    return { ok: true, snapshot: currentSnapshot(), change: result.change };
  }

  function restoreExternal(direction: "undo" | "redo"): EditingResult<Selection> {
    const history = options.history!;
    const before = observedValue;
    let result: EditingHistoryResult;
    isCommitting = true;
    try {
      result = history[direction]();
    } finally {
      isCommitting = false;
    }
    if (!result.ok) return result;
    const replay = result.change === null ? { ok: true as const, value: before } : applyPatch(before, result.change.applied);
    if (!replay.ok) throw new TypeError("EditingHistory returned a change that cannot apply to its pre-state.");
    const retained = historySelections.get(result.target);
    pendingHistoryRestore = {
      value: replay.value,
      status: result.status,
      reference: retained?.[direction === "undo" ? "before" : "after"] ?? { value: before, selection },
    };
    const snapshot = completeHistoryRestore();
    catchUpAfterCommit();
    return { ok: true, snapshot, ...(result.change === null ? {} : { change: result.change }) };
  }

  function completeHistoryRestore(): EditingSnapshot<Selection> {
    const pending = pendingHistoryRestore!;
    const nextSelection = mappedSelection(pending.reference, pending.value, null);
    observedValue = pending.value;
    observedHistory = pending.status;
    selection = nextSelection;
    pendingHistoryRestore = null;
    revision += 1;
    return publish();
  }

  return {
    get snapshot() {
      synchronizeExternalChange();
      return currentSnapshot();
    },
    apply,
    select(nextSelection) {
      if (isCommitting) return currentSnapshot();
      synchronizeExternalChange();
      selection = ownSelection(nextSelection);
      revision += 1;
      activeHistoryGroup = undefined;
      return publish();
    },
    reconcile(reconciler) {
      if (isCommitting) return currentSnapshot();
      synchronizeExternalChange();
      const nextSelection = reconciler(clone(selection), document.value);
      if (jsonEqual(selection, nextSelection)) return currentSnapshot();
      selection = ownSelection(nextSelection);
      revision += 1;
      activeHistoryGroup = undefined;
      return publish();
    },
    undo() {
      if (isCommitting) return { ok: false, code: "editing.reentrancy" };
      synchronizeExternalChange();
      if (options.history) return restoreExternal("undo");
      const entry = undoStack.at(-1);
      if (!entry) return { ok: false, code: "history.empty" };
      const result = restore(entry, "undo");
      if (result.ok) {
        undoStack = undoStack.slice(0, -1);
        redoStack = [...redoStack, entry];
        return { ...result, snapshot: publishCommit() };
      }
      return result;
    },
    redo() {
      if (isCommitting) return { ok: false, code: "editing.reentrancy" };
      synchronizeExternalChange();
      if (options.history) return restoreExternal("redo");
      const entry = redoStack.at(-1);
      if (!entry) return { ok: false, code: "history.empty" };
      const result = restore(entry, "redo");
      if (result.ok) {
        redoStack = redoStack.slice(0, -1);
        undoStack = [...undoStack, entry];
        return { ...result, snapshot: publishCommit() };
      }
      return result;
    },
    subscribe(listener) {
      synchronizeExternalChange();
      listeners.add(listener);
      unsubscribeDocument ??= document.subscribe(observeDocument);
      unsubscribeHistory ??= options.history?.subscribe(() => {
        synchronizeExternalChange();
      }) ?? null;
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
        if (listeners.size > 0) return;
        unsubscribeDocument?.();
        unsubscribeDocument = null;
        unsubscribeHistory?.();
        unsubscribeHistory = null;
      };
    },
  };
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
