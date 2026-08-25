import {
  buildPointer,
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
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import { assertObjectDocument } from "./object-validation.js";

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

export type ObjectSelectionMode = "replace" | "extend" | "add" | "subtract" | "toggle";

export interface ObjectClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.objects+json";
  readonly objects: ReadonlyArray<DocumentObject>;
  readonly text: string;
}

export interface ObjectPastePlacement {
  readonly type: "offset";
  readonly dx: number;
  readonly dy: number;
}

export type ObjectIntent =
  | {
      readonly type: "selection.set";
      readonly objectIds: ReadonlyArray<string>;
      readonly mode?: ObjectSelectionMode;
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.fill"; readonly color: string }
  | {
      readonly type: "object.translate";
      readonly objectIds: ReadonlyArray<string>;
      readonly dx: number;
      readonly dy: number;
    }
  | {
      readonly type: "object.resize";
      readonly objectIds: ReadonlyArray<string>;
      readonly dx: number;
      readonly dy: number;
      readonly dw: number;
      readonly dh: number;
    }
  | { readonly type: "clipboard.paste"; readonly clipboard: ObjectClipboard; readonly placement?: ObjectPastePlacement };

export interface ObjectEditor {
  readonly snapshot: EditingSnapshot<ObjectSelection>;
  readonly selectedObjects: ReadonlyArray<DocumentObject>;
  dispatch(intent: ObjectIntent): EditingResult<ObjectSelection>;
  copy(): ObjectClipboard | null;
  cut(): { readonly clipboard: ObjectClipboard; readonly result: EditingResult<ObjectSelection> } | null;
  undo(): EditingResult<ObjectSelection>;
  redo(): EditingResult<ObjectSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<ObjectSelection>) => void): () => void;
}

export function createObjectEditor(
  source: EditingDocumentSource<ObjectDocument>,
  options: { readonly createId?: () => string } = {},
): ObjectEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as ObjectDocument;
  assertObjectDocument(initial);
  let sequence = 0;
  const createId = options.createId ?? (() => `object-${++sequence}`);
  const selectionFamily = createKeySelectionFamily<string>();
  const first = initial.objects[0];
  const session = createEditingSession({
    document,
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
        type: intent.mode === "extend" ? "add" : intent.mode ?? "replace",
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

    if (intent.type === "object.translate") {
      const objects = value().objects;
      const moving = new Set(intent.objectIds);
      if (intent.objectIds.some((id) => !objects.some((object) => object.id === id))) {
        return failure("selection.object-not-found");
      }
      return session.apply({
        operations: objects.flatMap((object, index) => {
          if (!moving.has(object.id)) return [];
          return [
            { op: "replace", path: buildPointer(["objects", index, "x"]), value: object.x + intent.dx },
            { op: "replace", path: buildPointer(["objects", index, "y"]), value: object.y + intent.dy },
          ];
        }),
        selectionAfter: selectionFor(intent.objectIds),
        origin: intent.type,
      });
    }

    if (intent.type === "object.resize") {
      const objects = value().objects;
      const resizing = new Set(intent.objectIds);
      if (intent.objectIds.some((id) => !objects.some((object) => object.id === id))) {
        return failure("selection.object-not-found");
      }
      return session.apply({
        operations: objects.flatMap((object, index) => {
          if (!resizing.has(object.id)) return [];
          const width = Math.max(1, object.width + intent.dw);
          const height = Math.max(1, object.height + intent.dh);
          return [
            { op: "replace", path: buildPointer(["objects", index, "x"]), value: object.x + intent.dx },
            { op: "replace", path: buildPointer(["objects", index, "y"]), value: object.y + intent.dy },
            { op: "replace", path: buildPointer(["objects", index, "width"]), value: width },
            { op: "replace", path: buildPointer(["objects", index, "height"]), value: height },
          ];
        }),
        selectionAfter: selectionFor(intent.objectIds),
        origin: intent.type,
      });
    }

    if (intent.type === "clipboard.paste") {
      const objects = value().objects;
      const pasted = cloneObjectsWithUniqueIds(intent.clipboard.objects, objects, createId).map((object) => ({
        ...object,
        x: object.x + (intent.placement?.dx ?? 0),
        y: object.y + (intent.placement?.dy ?? 0),
      }));
      if (pasted.length === 0) return failure("clipboard.empty");
      return session.apply({
        operations: pasted.map((object, offset) => ({
          op: "add",
          path: `/objects/${objects.length + offset}`,
          value: object,
        })),
        selectionAfter: selectionFor(pasted.map((object) => object.id)),
        origin: intent.type,
      });
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

    return removeSelected(selected.map((object) => object.id));
  }

  function copy(): ObjectClipboard | null {
    const objects = selectedObjects();
    if (objects.length === 0) return null;
    return {
      type: "application/vnd.interactive-os.objects+json",
      objects,
      text: objects.map((object) => object.label).join("\n"),
    };
  }

  function removeSelected(ids: ReadonlyArray<string>): EditingResult<ObjectSelection> {
    const objects = value().objects;
    if (ids.length === 0) return failure("selection.empty");
    const selectedIds = new Set(ids);
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
      origin: "selection.remove",
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedObjects() { return selectedObjects(); },
    dispatch,
    copy,
    cut() {
      const clipboard = copy();
      if (!clipboard) return null;
      return { clipboard, result: removeSelected(selectedObjects().map((object) => object.id)) };
    },
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function createUniqueId(objects: ReadonlyArray<DocumentObject>, createId: () => string): string {
  const existing = new Set(objects.map((object) => object.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId();
    if (!existing.has(id)) return id;
  }
  throw new Error("createId did not produce a unique object id");
}

function cloneObjectsWithUniqueIds(
  source: ReadonlyArray<DocumentObject>,
  existing: ReadonlyArray<DocumentObject>,
  createId: () => string,
): DocumentObject[] {
  const occupied = [...existing];
  return source.map((object) => {
    const copy = { ...object, id: createUniqueId(occupied, createId) };
    occupied.push(copy);
    return copy;
  });
}

function selectionFor(
  keys: ReadonlyArray<string>,
  primaryKey: string | null = keys.at(-1) ?? null,
): ObjectSelection {
  return { kind: "explicit", keys: [...keys], primaryKey };
}

function success(snapshot: EditingSnapshot<ObjectSelection>): EditingResult<ObjectSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<ObjectSelection> {
  return { ok: false, code };
}
