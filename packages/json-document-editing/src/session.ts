import type {
  JSONAppliedChange,
  JSONDocument,
  JSONPatchOperation,
  JSONValue,
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
}): EditingSession<Selection> {
  const document = options.document;
  let selection = clone(options.selection);
  let revision = 0;
  let undoStack: HistoryEntry<Selection>[] = [];
  let redoStack: HistoryEntry<Selection>[] = [];
  let activeHistoryGroup: string | undefined;
  let isCommitting = false;
  let observedValue = document.value;
  let unsubscribeDocument: (() => void) | null = null;
  const listeners = new Set<(snapshot: EditingSnapshot<Selection>) => void>();

  function currentSnapshot(): EditingSnapshot<Selection> {
    return {
      value: document.value,
      selection,
      revision,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    };
  }

  function publish(): EditingSnapshot<Selection> {
    const current = currentSnapshot();
    for (const listener of listeners) listener(current);
    return current;
  }

  function synchronizeExternalChange(): boolean {
    if (observedValue === document.value) return false;
    observedValue = document.value;
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
    if (plan.operations.length === 0) {
      selection = clone(plan.selectionAfter);
      revision += 1;
      return { ok: true, snapshot: publish() };
    }

    const inverse = invertOperations(document, plan.operations);
    const beforeValue = inverse === null ? clone(document.value) : null;
    const result = commit(plan.operations, {
      editing: {
        origin: plan.origin,
        selectionBefore: clone(beforeSelection),
        selectionAfter: clone(plan.selectionAfter),
      },
    });
    if (!result.ok) return result;

    selection = clone(plan.selectionAfter);
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
          inverse: previous.inverse,
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
    selection = clone(nextSelection);
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
      selection = clone(nextSelection);
      revision += 1;
      activeHistoryGroup = undefined;
      return publish();
    },
    reconcile(reconciler) {
      synchronizeExternalChange();
      const nextSelection = clone(reconciler(clone(selection), document.value));
      if (jsonEqual(selection, nextSelection)) return currentSnapshot();
      selection = nextSelection;
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
  const inverse: JSONPatchOperation[] = [];
  for (let index = operations.length - 1; index >= 0; index -= 1) {
    const operation = operations[index];
    if (operation === undefined) return null;
    if (operation.op === "replace") {
      const located = document.at(operation.path);
      if (!located.ok) return null;
      inverse.push({ op: "replace", path: operation.path, value: clone(located.value) });
    } else if (operation.op === "remove") {
      const located = document.at(operation.path);
      if (!located.ok) return null;
      inverse.push({ op: "add", path: operation.path, value: clone(located.value) });
    } else if (operation.op === "add") {
      const path = appendedIndexPath(document, operation.path);
      if (path === null) return null;
      inverse.push({ op: "remove", path });
    } else {
      return null;
    }
  }
  return inverse;
}

function appendedIndexPath(document: JSONDocument, path: string): string | null {
  if (!path.endsWith("/-")) return path;
  const parent = path.slice(0, -2);
  const located = document.at(parent);
  if (!located.ok || !Array.isArray(located.value)) return null;
  return `${parent}/${located.value.length}`;
}

function jsonEqual(left: JSONValue, right: JSONValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clonePatchOperations(
  operations: ReadonlyArray<JSONPatchOperation>,
): ReadonlyArray<JSONPatchOperation> {
  return JSON.parse(JSON.stringify(operations)) as ReadonlyArray<JSONPatchOperation>;
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
