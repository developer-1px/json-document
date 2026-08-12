import {
  buildPointer,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createEditingSession,
  type EditingResult,
  type EditingSession,
  type EditingSnapshot,
} from "./session.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import { createOrderedAxis } from "./ordered-axis.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  primaryRange,
  selectRangePoint,
  type RangeSelectionState,
  type SelectionRange,
} from "./range-selection.js";

export type DatabasePropertyType = "title" | "text" | "number" | "select" | "checkbox";

export interface DatabaseSelectOption extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
}

export interface DatabaseProperty extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly type: DatabasePropertyType;
  readonly options: ReadonlyArray<DatabaseSelectOption>;
}

export interface DatabaseRecord extends Record<string, JSONValue> {
  readonly id: string;
  readonly values: Readonly<Record<string, JSONValue>>;
}

export interface DatabaseSort extends Record<string, JSONValue> {
  readonly propertyId: string;
  readonly direction: "ascending" | "descending";
}

export interface DatabaseFilter extends Record<string, JSONValue> {
  readonly propertyId: string;
  readonly operator: "equals";
  readonly value: JSONValue;
}

export interface DatabaseTableView extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly type: "table";
  readonly propertyOrder: ReadonlyArray<string>;
  readonly propertyVisibility: Readonly<Record<string, boolean>>;
  readonly sort: DatabaseSort | null;
  readonly filter: DatabaseFilter | null;
}

export interface DatabaseDocument extends Record<string, JSONValue> {
  readonly schema: {
    readonly properties: ReadonlyArray<DatabaseProperty>;
  };
  readonly records: ReadonlyArray<DatabaseRecord>;
  readonly views: ReadonlyArray<DatabaseTableView>;
}

export interface DatabasePoint extends Record<string, JSONValue> {
  readonly recordId: string;
  readonly propertyId: string;
}

export interface DatabaseRange extends Record<string, JSONValue> {
  readonly anchor: DatabasePoint;
  readonly focus: DatabasePoint;
}

export interface DatabaseSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly anchor: DatabasePoint | null;
  readonly focus: DatabasePoint | null;
  readonly ranges: ReadonlyArray<DatabaseRange>;
  readonly primaryIndex: number | null;
}

export interface DatabaseTopology {
  readonly recordIds: ReadonlyArray<string>;
  readonly propertyIds: ReadonlyArray<string>;
}

export interface DatabaseCell extends DatabasePoint {
  readonly value: JSONValue;
}

export type DatabaseIntent =
  | {
      readonly type: "selection.set";
      readonly recordId: string;
      readonly propertyId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | {
      readonly type: "cell.commit";
      readonly recordId: string;
      readonly propertyId: string;
      readonly value: JSONValue;
    }
  | {
      readonly type: "record.add";
      readonly recordId: string;
    }
  | {
      readonly type: "record.delete";
      readonly recordId: string;
    }
  | {
      readonly type: "view.configure";
      readonly viewId: string;
      readonly propertyOrder?: ReadonlyArray<string>;
      readonly propertyVisibility?: Readonly<Record<string, boolean>>;
      readonly sort?: DatabaseSort | null;
      readonly filter?: DatabaseFilter | null;
    };

export interface DatabaseEditor {
  readonly snapshot: EditingSnapshot<DatabaseSelection>;
  dispatch(intent: DatabaseIntent): EditingResult<DatabaseSelection>;
  tableTopology(viewId: string): DatabaseTopology;
  selectedCellsIn(topology: DatabaseTopology): ReadonlyArray<DatabaseCell>;
  undo(): EditingResult<DatabaseSelection>;
  redo(): EditingResult<DatabaseSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<DatabaseSelection>) => void): () => void;
}

export function createDatabaseEditor(source: EditingDocumentSource<DatabaseDocument>): DatabaseEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as DatabaseDocument;
  assertDatabaseDocument(initial);
  const firstRecord = initial.records[0];
  const firstProperty = initial.schema.properties[0];
  const session = createEditingSession({
    document,
    selection: firstRecord && firstProperty
      ? collapsed(firstRecord.id, firstProperty.id)
      : emptySelection(),
  });

  function value(): DatabaseDocument {
    return session.snapshot.value as DatabaseDocument;
  }

  function dispatch(intent: DatabaseIntent): EditingResult<DatabaseSelection> {
    if (intent.type === "selection.set") {
      if (resolveCell(value(), intent.recordId, intent.propertyId) === null) {
        return failure("selection.cell-not-found");
      }
      const selection = selectRangePoint(
        session.snapshot.selection,
        { recordId: intent.recordId, propertyId: intent.propertyId },
        intent.mode ?? "replace",
        samePoint,
      );
      return success(session.select(withPrimaryAliases(selection)));
    }

    if (intent.type === "cell.commit") {
      const document = value();
      const resolved = resolveCell(document, intent.recordId, intent.propertyId);
      if (resolved === null) return failure("cell.not-found");
      if (!acceptsValue(resolved.property, intent.value)) return failure("cell.invalid-value");
      if (Object.is(resolved.record.values[intent.propertyId], intent.value)) {
        return success(session.snapshot);
      }
      return session.apply({
        operations: [{
          op: "replace",
          path: buildPointer(["records", resolved.recordIndex, "values", intent.propertyId]),
          value: intent.value,
        }],
        selectionAfter: collapsed(intent.recordId, intent.propertyId),
        origin: intent.type,
        historyGroup: `database-cell:${intent.recordId}:${intent.propertyId}`,
      });
    }

    if (intent.type === "record.add") {
      const document = value();
      if (document.records.some((record) => record.id === intent.recordId)) {
        return failure("record.duplicate-id");
      }
      const record: DatabaseRecord = {
        id: intent.recordId,
        values: Object.fromEntries(document.schema.properties.map((property) => [
          property.id,
          defaultValue(property),
        ])),
      };
      const firstProperty = document.schema.properties[0];
      return session.apply({
        operations: [{ op: "add", path: "/records/-", value: record }],
        selectionAfter: firstProperty ? collapsed(record.id, firstProperty.id) : emptySelection(),
        origin: intent.type,
      });
    }

    if (intent.type === "record.delete") {
      const document = value();
      const recordIndex = document.records.findIndex((record) => record.id === intent.recordId);
      if (recordIndex < 0) return failure("record.not-found");
      const remaining = document.records.filter((record) => record.id !== intent.recordId);
      const nextRecord = remaining[Math.min(recordIndex, remaining.length - 1)];
      const currentPropertyId = session.snapshot.selection.focus?.propertyId;
      const nextProperty = document.schema.properties.find((property) => property.id === currentPropertyId)
        ?? document.schema.properties[0];
      return session.apply({
        operations: [{ op: "remove", path: buildPointer(["records", recordIndex]) }],
        selectionAfter: nextRecord && nextProperty
          ? collapsed(nextRecord.id, nextProperty.id)
          : emptySelection(),
        origin: intent.type,
      });
    }

    return configureView(session, value(), intent);
  }

  return {
    get snapshot() { return session.snapshot; },
    dispatch,
    tableTopology(viewId) {
      return projectTable(value(), viewId);
    },
    selectedCellsIn(topology) {
      return selectedCells(value(), session.snapshot.selection, topology);
    },
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function configureView(
  session: EditingSession<DatabaseSelection>,
  document: DatabaseDocument,
  intent: Extract<DatabaseIntent, { readonly type: "view.configure" }>,
): EditingResult<DatabaseSelection> {
  const viewIndex = document.views.findIndex((view) => view.id === intent.viewId);
  if (viewIndex < 0) return failure("view.not-found");
  const current = document.views[viewIndex]!;
  const next: DatabaseTableView = {
    ...current,
    ...(intent.propertyOrder === undefined ? {} : { propertyOrder: [...intent.propertyOrder] }),
    ...(intent.propertyVisibility === undefined ? {} : { propertyVisibility: { ...intent.propertyVisibility } }),
    ...(intent.sort === undefined ? {} : { sort: intent.sort }),
    ...(intent.filter === undefined ? {} : { filter: intent.filter }),
  };
  assertView(next, document.schema.properties);
  return session.apply({
    operations: [{ op: "replace", path: buildPointer(["views", viewIndex]), value: next }],
    selectionAfter: session.snapshot.selection,
    origin: intent.type,
  });
}

function projectTable(document: DatabaseDocument, viewId: string): DatabaseTopology {
  const view = document.views.find((candidate) => candidate.id === viewId);
  if (!view) throw new Error(`Database view was not found: ${JSON.stringify(viewId)}.`);
  const propertyIds = view.propertyOrder.filter((propertyId) => view.propertyVisibility[propertyId] !== false);
  const records = document.records
    .filter((record) => view.filter === null || jsonEqual(record.values[view.filter.propertyId], view.filter.value))
    .map((record, index) => ({ record, index }));
  if (view.sort !== null) {
    records.sort((left, right) => {
      const compared = compareValues(left.record.values[view.sort!.propertyId], right.record.values[view.sort!.propertyId]);
      const stable = compared === 0 ? left.index - right.index : compared;
      return view.sort!.direction === "ascending" ? stable : -stable;
    });
  }
  return {
    recordIds: records.map(({ record }) => record.id),
    propertyIds,
  };
}

function selectedCells(
  document: DatabaseDocument,
  selection: DatabaseSelection,
  topology: DatabaseTopology,
): DatabaseCell[] {
  const recordAxis = createOrderedAxis(topology.recordIds);
  const propertyAxis = createOrderedAxis(topology.propertyIds);
  const selectedKeys = new Set<string>();
  for (const range of selection.ranges) {
    const bounds = rangeBounds(recordAxis, propertyAxis, range);
    if (!bounds) continue;
    for (let recordIndex = bounds.recordStart; recordIndex <= bounds.recordEnd; recordIndex += 1) {
      for (let propertyIndex = bounds.propertyStart; propertyIndex <= bounds.propertyEnd; propertyIndex += 1) {
        selectedKeys.add(cellKey(topology.recordIds[recordIndex]!, topology.propertyIds[propertyIndex]!));
      }
    }
  }
  return topology.recordIds.flatMap((recordId) => {
    const record = document.records.find((candidate) => candidate.id === recordId)!;
    return topology.propertyIds
      .filter((propertyId) => selectedKeys.has(cellKey(recordId, propertyId)))
      .map((propertyId) => ({ recordId, propertyId, value: record.values[propertyId]! }));
  });
}

function rangeBounds(
  recordAxis: ReturnType<typeof createOrderedAxis>,
  propertyAxis: ReturnType<typeof createOrderedAxis>,
  range: SelectionRange<DatabasePoint>,
) {
  const anchorRecord = recordAxis.indexOf(range.anchor.recordId);
  const focusRecord = recordAxis.indexOf(range.focus.recordId);
  const anchorProperty = propertyAxis.indexOf(range.anchor.propertyId);
  const focusProperty = propertyAxis.indexOf(range.focus.propertyId);
  if (anchorRecord === null || focusRecord === null || anchorProperty === null || focusProperty === null) return null;
  return {
    recordStart: Math.min(anchorRecord, focusRecord),
    recordEnd: Math.max(anchorRecord, focusRecord),
    propertyStart: Math.min(anchorProperty, focusProperty),
    propertyEnd: Math.max(anchorProperty, focusProperty),
  };
}

function resolveCell(document: DatabaseDocument, recordId: string, propertyId: string) {
  const recordIndex = document.records.findIndex((record) => record.id === recordId);
  const property = document.schema.properties.find((candidate) => candidate.id === propertyId);
  if (recordIndex < 0 || !property) return null;
  return { recordIndex, record: document.records[recordIndex]!, property };
}

function assertDatabaseDocument(document: DatabaseDocument): void {
  assertUnique(document.schema.properties.map((property) => property.id), "property");
  assertUnique(document.records.map((record) => record.id), "record");
  assertUnique(document.views.map((view) => view.id), "view");
  for (const property of document.schema.properties) {
    if (property.type === "select") assertUnique(property.options.map((option) => option.id), "select option");
  }
  for (const record of document.records) {
    for (const property of document.schema.properties) {
      if (!Object.prototype.hasOwnProperty.call(record.values, property.id)) {
        throw new Error(`Database record ${JSON.stringify(record.id)} is missing property ${JSON.stringify(property.id)}.`);
      }
      if (!acceptsValue(property, record.values[property.id]!)) {
        throw new Error(`Database record ${JSON.stringify(record.id)} has an invalid ${property.type} value.`);
      }
    }
  }
  for (const view of document.views) assertView(view, document.schema.properties);
}

function assertView(view: DatabaseTableView, properties: ReadonlyArray<DatabaseProperty>): void {
  const available = new Set(properties.map((property) => property.id));
  assertUnique(view.propertyOrder, "view property");
  if (view.propertyOrder.length !== properties.length || view.propertyOrder.some((id) => !available.has(id))) {
    throw new Error(`Database view ${JSON.stringify(view.id)} must order every property exactly once.`);
  }
  for (const propertyId of Object.keys(view.propertyVisibility)) {
    if (!available.has(propertyId)) throw new Error(`Database view references unknown property ${JSON.stringify(propertyId)}.`);
  }
  if (view.sort && !available.has(view.sort.propertyId)) throw new Error("Database sort property was not found.");
  if (view.filter && !available.has(view.filter.propertyId)) throw new Error("Database filter property was not found.");
}

function acceptsValue(property: DatabaseProperty, value: JSONValue): boolean {
  if (property.type === "title" || property.type === "text") return typeof value === "string";
  if (property.type === "number") return typeof value === "number";
  if (property.type === "checkbox") return typeof value === "boolean";
  return typeof value === "string" && property.options.some((option) => option.id === value);
}

function defaultValue(property: DatabaseProperty): JSONValue {
  if (property.type === "number") return 0;
  if (property.type === "checkbox") return false;
  if (property.type === "select") return property.options[0]?.id ?? "";
  return "";
}

function compareValues(left: JSONValue | undefined, right: JSONValue | undefined): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  return String(left ?? "").localeCompare(String(right ?? ""));
}

function collapsed(recordId: string, propertyId: string): DatabaseSelection {
  return withPrimaryAliases(collapsedRangeSelection({ recordId, propertyId }));
}

function emptySelection(): DatabaseSelection {
  return withPrimaryAliases(emptyRangeSelection());
}

function withPrimaryAliases(selection: RangeSelectionState<DatabasePoint>): DatabaseSelection {
  const primary = primaryRange(selection);
  return {
    kind: "range",
    anchor: primary?.anchor ?? null,
    focus: primary?.focus ?? null,
    ranges: selection.ranges.map((range) => ({ anchor: { ...range.anchor }, focus: { ...range.focus } })),
    primaryIndex: selection.primaryIndex,
  };
}

function samePoint(left: DatabasePoint, right: DatabasePoint): boolean {
  return left.recordId === right.recordId && left.propertyId === right.propertyId;
}

function assertUnique(ids: ReadonlyArray<string>, label: string): void {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id.length === 0 || unique.has(id)) throw new Error(`Database ${label} ids must be non-empty and unique.`);
    unique.add(id);
  }
}

function cellKey(recordId: string, propertyId: string): string {
  return `${recordId}\u0000${propertyId}`;
}

function jsonEqual(left: JSONValue | undefined, right: JSONValue | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function success(snapshot: EditingSnapshot<DatabaseSelection>): EditingResult<DatabaseSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<DatabaseSelection> {
  return { ok: false, code };
}
