import {
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
import { createEditingId, createEditingIdAllocator } from "./identity.js";
import type { EditingHistoryOptions } from "./history.js";
import { cutEditingClipboard, isClipboardRecord } from "./clipboard.js";
import {
  assertObjectDocument, planObjectOperation, transformObject,
  type DocumentObject, type ObjectDocument, type ObjectDraft, type ObjectOperation,
} from "@interactive-os/json-document-object-document";
export type { DocumentObject, ObjectDocument } from "@interactive-os/json-document-object-document";

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

export const objectClipboardFormat = {
  mimeType: "application/vnd.interactive-os.objects+json" as const,
  parse(value: unknown): ObjectClipboard | null {
    if (!isClipboardRecord(value) || value.type !== this.mimeType || typeof value.text !== "string") return null;
    if (!Array.isArray(value.objects) || value.objects.some((object) => !isClipboardRecord(object) || typeof object.color !== "string")) return null;
    try { assertObjectDocument(value); return value as ObjectClipboard; } catch { return null; }
  },
};

export interface ObjectPastePlacement {
  readonly type: "offset";
  readonly dx: number;
  readonly dy: number;
}

export type ObjectIntent =
  | { readonly type: "object.create"; readonly object: ObjectDraft }
  | { readonly type: "object.text"; readonly objectId: string; readonly text: string }
  | { readonly type: "document.replace"; readonly document: ObjectDocument }
  | {
      readonly type: "selection.set";
      readonly objectIds: ReadonlyArray<string>;
      readonly mode?: ObjectSelectionMode;
      readonly primaryKey?: string;
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
  options: EditingHistoryOptions & { readonly createId?: () => string } = {},
): ObjectEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as ObjectDocument;
  assertObjectDocument(initial);
  const createId = options.createId ?? (() => createEditingId("object"));
  const selectionFamily = createKeySelectionFamily<string>();
  const first = initial.objects[0];
  const session = createEditingSession({
    ...options,
    document,
    selection: first ? selectionFor([first.id]) : selectionFor([]),
    reconcileSelection(selection, value) {
      const context: KeySelectionContext<string> = {
        keys: (value as ObjectDocument).objects.map((object) => object.id),
        universe: "objects",
        universeMismatch: "clear",
      };
      const next = selectionFamily.reconcile(selection, context).state;
      return selectionFor(selectionFamily.targets(next, context), next.primaryKey);
    },
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
    if (intent.type === "object.create") {
      const allocate = createEditingIdAllocator(value().objects.map((object) => object.id), createId, "object");
      let id: string;
      try { id = allocate(); } catch (error) { return { ok: false, code: "object.identity-unavailable", reason: error instanceof Error ? error.message : String(error) }; }
      const object = { ...intent.object, id };
      return apply({ type: "insert", objects: [object] }, selectionFor([object.id]), intent.type);
    }
    if (intent.type === "object.text") {
      return apply({ type: "text", objectId: intent.objectId, text: intent.text }, selectionForTargets([intent.objectId]), intent.type);
    }
    if (intent.type === "document.replace") {
      // A profile-specific session cannot silently become another document type.
      if (value().profile !== intent.document?.profile) return failure("object.profile-mismatch");
      return apply({ type: "replace", document: intent.document }, selectionFor([]), intent.type);
    }
    if (intent.type === "selection.set") {
      const available = new Set(value().objects.map((object) => object.id));
      if (intent.objectIds.some((id) => !available.has(id))) {
        return failure("selection.object-not-found");
      }
      const command: KeySelectionCommand<string> = {
        type: intent.mode === "extend" ? "add" : intent.mode ?? "replace",
        keys: intent.objectIds,
      };
      const context = selectionContext();
      let selection = selectionFamily.transition(
        session.snapshot.selection,
        command,
        context,
      ).state;
      if (intent.primaryKey !== undefined) {
        if (!selectionFamily.targets(selection, context).includes(intent.primaryKey)) return failure("selection.primary-not-selected");
        selection = selectionFamily.transition(selection, { type: "set-primary", key: intent.primaryKey }, context).state;
      }
      return success(session.select(selectionFor(
        selectionFamily.targets(selection, context),
        selection.primaryKey,
      )));
    }

    if (intent.type === "object.translate") {
      return apply({ type: "transform", objectIds: intent.objectIds, transform: { dx: intent.dx, dy: intent.dy } }, selectionForTargets(intent.objectIds), intent.type);
    }

    if (intent.type === "object.resize") {
      return apply({ type: "transform", objectIds: intent.objectIds, transform: { dx: intent.dx, dy: intent.dy, dw: intent.dw, dh: intent.dh } }, selectionForTargets(intent.objectIds), intent.type);
    }

    if (intent.type === "clipboard.paste") {
      const objects = value().objects;
      if (!objectClipboardFormat.parse(intent.clipboard)) return failure("clipboard.invalid");
      const dx = intent.placement?.dx ?? 0, dy = intent.placement?.dy ?? 0;
      if (![dx, dy].every(Number.isFinite)) return failure("object.invalid");
      const pasted = cloneObjectsWithUniqueIds(intent.clipboard.objects, objects, createId)
        .map((object) => transformObject(object, { dx, dy }));
      if (pasted.length === 0) return failure("clipboard.empty");
      return apply({ type: "insert", objects: pasted }, selectionFor(pasted.map((object) => object.id)), intent.type);
    }

    const selected = selectedObjects();
    if (selected.length === 0) return failure("selection.empty");
    if (intent.type === "selection.fill") {
      return apply({ type: "fill", objectIds: selected.map((object) => object.id), color: intent.color }, session.snapshot.selection, intent.type);
    }

    return intent.type === "selection.remove" ? removeSelected(selected.map((object) => object.id)) : failure("object.unsupported-intent");
  }

  function selectionForTargets(ids: readonly string[]): ObjectSelection {
    const selection = session.snapshot.selection;
    const selected = new Set(selection.keys);
    return ids.length > 0 && ids.every((id) => selected.has(id)) ? selection : selectionFor(ids);
  }

  function apply(operation: ObjectOperation, selectionAfter: ObjectSelection, origin: string): EditingResult<ObjectSelection> {
    const plan = planObjectOperation(value(), operation);
    return plan.ok ? session.apply({ operations: plan.operations, selectionAfter, origin }) : plan;
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
    return apply({ type: "remove", objectIds: ids }, selectionFor(next ? [next.id] : []), "selection.remove");
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedObjects() { return selectedObjects(); },
    dispatch,
    copy,
    cut: () => cutEditingClipboard(copy, () => removeSelected(selectedObjects().map((object) => object.id))),
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function cloneObjectsWithUniqueIds(
  source: ReadonlyArray<DocumentObject>,
  existing: ReadonlyArray<DocumentObject>,
  createId: () => string,
): DocumentObject[] {
  const allocateId = createEditingIdAllocator(existing.map((object) => object.id), createId, "object");
  return source.map((object) => ({ ...object, id: allocateId() }));
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
