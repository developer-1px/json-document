import {
  buildPointer,
  createJSONDocument,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createKeySelectionFamily,
  type KeySelectionCommand,
  type KeySelectionContext,
} from "@interactive-os/json-document-selection";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";

export interface DocumentObject extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

export interface ObjectDocument extends Record<string, JSONValue> {
  readonly objects: ReadonlyArray<DocumentObject>;
}

export interface ObjectSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}

export type ObjectSelectionMode = "replace" | "add" | "subtract" | "toggle";

export type ObjectIntent =
  | {
      readonly type: "selection.set";
      readonly objectIds: ReadonlyArray<string>;
      readonly mode?: ObjectSelectionMode;
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.fill"; readonly color: string };

export interface ObjectEditor {
  readonly snapshot: EditingSnapshot<ObjectSelection>;
  readonly selectedObjects: ReadonlyArray<DocumentObject>;
  dispatch(intent: ObjectIntent): EditingResult<ObjectSelection>;
  undo(): EditingResult<ObjectSelection>;
  redo(): EditingResult<ObjectSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<ObjectSelection>) => void): () => void;
}

export function createObjectEditor(initial: ObjectDocument): ObjectEditor {
  assertObjectDocument(initial);
  const selectionFamily = createKeySelectionFamily<string>();
  const first = initial.objects[0];
  const session = createEditingSession({
    document: createJSONDocument(initial),
    selection: first ? selectionFor([first.id]) : selectionFor([]),
  });

  function value(): ObjectDocument {
    return session.snapshot.value as ObjectDocument;
  }

  function selectedObjects(): DocumentObject[] {
    const ids = new Set(selectionFamily.targets(session.snapshot.selection, selectionContext()));
    return value().objects.filter((object) => ids.has(object.id));
  }

  function selectionContext(): KeySelectionContext<string> {
    return {
      keys: value().objects.map((object) => object.id),
      universe: "objects",
      universeMismatch: "clear",
    };
  }

  function dispatch(intent: ObjectIntent): EditingResult<ObjectSelection> {
    if (intent.type === "selection.set") {
      const available = new Set(value().objects.map((object) => object.id));
      if (intent.objectIds.some((id) => !available.has(id))) {
        return failure("selection.object-not-found");
      }
      const command: KeySelectionCommand<string> = {
        type: intent.mode ?? "replace",
        keys: intent.objectIds,
      };
      const selection = selectionFamily.transition(
        session.snapshot.selection,
        command,
        selectionContext(),
      ).state;
      return success(session.select(selectionFor(
        selectionFamily.targets(selection, selectionContext()),
        selection.primaryKey,
      )));
    }

    const selected = selectedObjects();
    if (selected.length === 0) return failure("selection.empty");
    if (intent.type === "selection.fill") {
      const objects = value().objects;
      const operations: JSONPatchOperation[] = selected.map((object) => ({
        op: "replace",
        path: buildPointer(["objects", objects.findIndex((candidate) => candidate.id === object.id), "color"]),
        value: intent.color,
      }));
      return session.apply({
        operations,
        selectionAfter: session.snapshot.selection,
        origin: intent.type,
      });
    }

    const objects = value().objects;
    const selectedIds = new Set(selected.map((object) => object.id));
    const indices = objects
      .map((object, index) => selectedIds.has(object.id) ? index : -1)
      .filter((index) => index >= 0)
      .sort((left, right) => right - left);
    const remaining = objects.filter((object) => !selectedIds.has(object.id));
    const firstRemoved = Math.min(...indices);
    const next = remaining[Math.min(firstRemoved, remaining.length - 1)];
    return session.apply({
      operations: indices.map((index) => ({ op: "remove", path: buildPointer(["objects", index]) })),
      selectionAfter: selectionFor(next ? [next.id] : []),
      origin: intent.type,
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedObjects() { return selectedObjects(); },
    dispatch,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function selectionFor(
  keys: ReadonlyArray<string>,
  primaryKey: string | null = keys.at(-1) ?? null,
): ObjectSelection {
  return { kind: "explicit", keys: [...keys], primaryKey };
}

function assertObjectDocument(document: ObjectDocument): void {
  const ids = new Set<string>();
  for (const object of document.objects) {
    if (object.id.length === 0) throw new Error("Object ids must not be empty.");
    if (ids.has(object.id)) throw new Error(`Object id must be unique: ${JSON.stringify(object.id)}.`);
    if (![object.x, object.y, object.width, object.height].every(Number.isFinite)) {
      throw new Error(`Object geometry must be finite: ${JSON.stringify(object.id)}.`);
    }
    if (object.width < 0 || object.height < 0) {
      throw new Error(`Object dimensions must not be negative: ${JSON.stringify(object.id)}.`);
    }
    ids.add(object.id);
  }
}

function success(snapshot: EditingSnapshot<ObjectSelection>): EditingResult<ObjectSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<ObjectSelection> {
  return { ok: false, code };
}
