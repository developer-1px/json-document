import type {
  JSONAppliedChange,
  JSONDocument,
  JSONPatchOperation,
  JSONValue,
} from "@interactive-os/json-document";

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
  undo(): EditingResult<Selection>;
  redo(): EditingResult<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}

interface HistoryEntry<Selection extends JSONValue> {
  readonly beforeValue: JSONValue;
  readonly beforeSelection: Selection;
  readonly afterValue: JSONValue;
  readonly afterSelection: Selection;
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
  const listeners = new Set<(snapshot: EditingSnapshot<Selection>) => void>();

  function snapshot(): EditingSnapshot<Selection> {
    return {
      value: document.value,
      selection,
      revision,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    };
  }

  function publish(): EditingSnapshot<Selection> {
    const current = snapshot();
    for (const listener of listeners) listener(current);
    return current;
  }

  function apply(plan: EditingPlan<Selection>): EditingResult<Selection> {
    const beforeValue = document.value;
    const beforeSelection = selection;
    if (plan.operations.length === 0) {
      selection = clone(plan.selectionAfter);
      revision += 1;
      return { ok: true, snapshot: publish() };
    }

    const result = document.commit(plan.operations, {
      metadata: {
        editing: {
          origin: plan.origin,
          selectionBefore: clone(beforeSelection),
          selectionAfter: clone(plan.selectionAfter),
        },
      },
    });
    if (!result.ok) return result;

    selection = clone(plan.selectionAfter);
    revision += 1;
    if (plan.history !== "ignore") {
      const entry: HistoryEntry<Selection> = {
        beforeValue,
        beforeSelection,
        afterValue: document.value,
        afterSelection: selection,
        ...(plan.historyGroup === undefined ? {} : { group: plan.historyGroup }),
      };
      const previous = undoStack.at(-1);
      if (previous && plan.historyGroup !== undefined && activeHistoryGroup === plan.historyGroup && previous.group === plan.historyGroup) {
        undoStack = [...undoStack.slice(0, -1), { ...entry, beforeValue: previous.beforeValue, beforeSelection: previous.beforeSelection }];
      } else {
        undoStack = [...undoStack, entry];
      }
      activeHistoryGroup = plan.historyGroup;
      redoStack = [];
    }
    return { ok: true, snapshot: publish(), change: result.change };
  }

  function restore(entry: HistoryEntry<Selection>, direction: "undo" | "redo"): EditingResult<Selection> {
    const value = direction === "undo" ? entry.beforeValue : entry.afterValue;
    const nextSelection = direction === "undo" ? entry.beforeSelection : entry.afterSelection;
    const result = document.commit([{ op: "replace", path: "", value }], {
      metadata: { editing: { origin: direction, selectionAfter: clone(nextSelection) } },
    });
    if (!result.ok) return result;
    selection = clone(nextSelection);
    revision += 1;
    activeHistoryGroup = undefined;
    return { ok: true, snapshot: snapshot(), change: result.change };
  }

  return {
    get snapshot() { return snapshot(); },
    apply,
    select(nextSelection) {
      selection = clone(nextSelection);
      revision += 1;
      activeHistoryGroup = undefined;
      return publish();
    },
    undo() {
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
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
