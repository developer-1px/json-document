import {
  createJSONDocument,
  jsonEqual,
  parentPointer,
  type JSONAppliedChange,
  type JSONDocument,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import type { SelectionHistoryEntry } from "@interactive-os/json-document-selection";

export interface EditingPlan<Selection extends JSONValue> {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter: Selection;
  readonly origin: string;
  readonly history?: "record" | "ignore";
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

export function createEditingSession<Selection extends JSONValue>(options: {
  readonly document: JSONDocument;
  readonly selection: Selection;
  /** Reconcile domain selection when an external value invalidates local history. */
  readonly reconcileSelection?: (selection: Selection, value: JSONValue) => Selection;
}): EditingSession<Selection> {
  const document = options.document;
  let selection = ownSelection(options.selection);
  let revision = 0;
  let undoStack: HistoryEntry<Selection>[] = [];
  let redoStack: HistoryEntry<Selection>[] = [];
  let activeHistoryGroup: string | undefined;
  let isCommitting = false;
  let observedValue = document.value;
  let unsubscribeDocument: (() => void) | null = null;
  const listeners = new Set<(snapshot: EditingSnapshot<Selection>) => void>();
  const notifications: Array<{ snapshot: EditingSnapshot<Selection>; listeners: Array<(snapshot: EditingSnapshot<Selection>) => void> }> = [];
  let isNotifying = false;

  function ownSelection(value: Selection): Selection {
    // JSON Document owns detachment and immutable JSON values, including selection.
    return createJSONDocument(clone(value)).value as Selection;
  }

  function currentSnapshot(): EditingSnapshot<Selection> {
    return Object.freeze({
      value: document.value,
      selection,
      revision,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
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

  function synchronizeExternalChange(): boolean {
    const latest = document.value;
    if (jsonEqual(observedValue, latest)) return false;
    observedValue = latest;
    if (options.reconcileSelection) selection = ownSelection(options.reconcileSelection(selection, latest));
    undoStack = [];
    redoStack = [];
    activeHistoryGroup = undefined;
    revision += 1;
    return true;
  }

  function commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata: Readonly<Record<string, JSONValue>>,
  ) {
    isCommitting = true;
    try {
      return document.commit(operations, { metadata });
    } finally {
      isCommitting = false;
      observedValue = document.value;
    }
  }

  function observeDocument(): void {
    if (isCommitting) return;
    if (synchronizeExternalChange()) publish();
  }

  function apply(plan: EditingPlan<Selection>): EditingResult<Selection> {
    synchronizeExternalChange();
    const beforeSelection = selection;
    const selectionAfter = ownSelection(plan.selectionAfter);
    if (plan.operations.length === 0) {
      selection = selectionAfter;
      revision += 1;
      return { ok: true, snapshot: publish() };
    }

    const inverse = invertOperations(document, plan.operations);
    const beforeValue = inverse === null ? clone(document.value) : null;
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
    if (plan.history !== "ignore" && result.change.applied.length > 0) {
      const entry: HistoryEntry<Selection> = {
        forward: clonePatchOperations(plan.operations),
        inverse: inverse ?? [{ op: "replace", path: "", value: beforeValue! }],
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
    return { ok: true, snapshot: publish(), change: result.change };
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

  return {
    get snapshot() {
      synchronizeExternalChange();
      return currentSnapshot();
    },
    apply,
    select(nextSelection) {
      synchronizeExternalChange();
      selection = ownSelection(nextSelection);
      revision += 1;
      activeHistoryGroup = undefined;
      return publish();
    },
    reconcile(reconciler) {
      synchronizeExternalChange();
      const nextSelection = reconciler(clone(selection), document.value);
      if (jsonEqual(selection, nextSelection)) return currentSnapshot();
      selection = ownSelection(nextSelection);
      revision += 1;
      activeHistoryGroup = undefined;
      return publish();
    },
    undo() {
      synchronizeExternalChange();
      const entry = undoStack.at(-1);
      if (!entry) return { ok: false, code: "history.empty" };
      const result = restore(entry, "undo");
      if (result.ok) {
        undoStack = undoStack.slice(0, -1);
        redoStack = [...redoStack, entry];
        return { ...result, snapshot: publish() };
      }
      return result;
    },
    redo() {
      synchronizeExternalChange();
      const entry = redoStack.at(-1);
      if (!entry) return { ok: false, code: "history.empty" };
      const result = restore(entry, "redo");
      if (result.ok) {
        redoStack = redoStack.slice(0, -1);
        undoStack = [...undoStack, entry];
        return { ...result, snapshot: publish() };
      }
      return result;
    },
    subscribe(listener) {
      synchronizeExternalChange();
      listeners.add(listener);
      unsubscribeDocument ??= document.subscribe(observeDocument);
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        unsubscribeDocument?.();
        unsubscribeDocument = null;
      };
    },
  };
}

function invertOperations(
  document: JSONDocument,
  operations: ReadonlyArray<JSONPatchOperation>,
): ReadonlyArray<JSONPatchOperation> | null {
  // Every inverse reads the state immediately before its forward operation.
  // Keep single-operation edits on the original read port; a batch needs an
  // isolated working document to resolve shifted indexes and overwritten values.
  const working = operations.length > 1 ? createJSONDocument(document.value) : document;
  const inverse: JSONPatchOperation[] = [];
  for (const operation of operations) {
    if (operation.op === "replace") {
      const located = working.at(operation.path);
      if (!located.ok) return null;
      inverse.push({ op: "replace", path: operation.path, value: clone(located.value) });
    } else if (operation.op === "remove") {
      const located = working.at(operation.path);
      if (!located.ok) return null;
      inverse.push({ op: "add", path: operation.path, value: clone(located.value) });
    } else if (operation.op === "add") {
      const path = appendedIndexPath(working, operation.path);
      if (path === null) return null;
      const parent = parentPointer(path);
      const container = parent === null ? null : working.at(parent);
      const previous = working.at(path);
      inverse.push(previous.ok && (parent === null || (container?.ok && !Array.isArray(container.value)))
        ? { op: "replace", path, value: clone(previous.value) }
        : { op: "remove", path });
    } else if (operation.op === "test") {
      // A successful precondition changes no value and needs no inverse.
    } else {
      return null;
    }
    if (working !== document && !working.commit([operation]).ok) return null;
  }
  return inverse.reverse();
}

function appendedIndexPath(document: JSONDocument, path: string): string | null {
  if (!path.endsWith("/-")) return path;
  const parent = path.slice(0, -2);
  const located = document.at(parent);
  if (!located.ok || !Array.isArray(located.value)) return null;
  return `${parent}/${located.value.length}`;
}

function clonePatchOperations(
  operations: ReadonlyArray<JSONPatchOperation>,
): ReadonlyArray<JSONPatchOperation> {
  return JSON.parse(JSON.stringify(operations)) as ReadonlyArray<JSONPatchOperation>;
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
