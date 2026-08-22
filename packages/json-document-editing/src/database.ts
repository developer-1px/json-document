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
import { gridCellsInRange, gridPointIndex, gridRangeBounds } from "./topology.js";
import { acceptsDatabaseValue, assertDatabaseDocument, assertDatabaseView } from "./database-validation.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  primaryRange,
  selectRangePoint,
  type RangeSelectionState,
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
  readonly propertyWidths: Readonly<Record<string, number>>;
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

export interface DatabaseClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.database+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
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
      readonly propertyWidths?: Readonly<Record<string, number>>;
      readonly sort?: DatabaseSort | null;
      readonly filter?: DatabaseFilter | null;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: DatabaseClipboard;
      readonly topology?: DatabaseTopology;
    };

export interface DatabaseEditor {
  readonly snapshot: EditingSnapshot<DatabaseSelection>;
  dispatch(intent: DatabaseIntent): EditingResult<DatabaseSelection>;
  tableTopology(viewId: string): DatabaseTopology;
  selectedCellsIn(topology: DatabaseTopology): ReadonlyArray<DatabaseCell>;
  copy(topology?: DatabaseTopology): DatabaseClipboard | null;
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
  let indexedDocument: DatabaseDocument | undefined = initial;
  let indexedDatabase: DatabaseIndex | undefined = createDatabaseIndex(initial);

  function index(document = value()): DatabaseIndex {
    if (document !== indexedDocument) {
      indexedDocument = document;
      indexedDatabase = createDatabaseIndex(document);
    }
    return indexedDatabase as DatabaseIndex;
  }

  function value(): DatabaseDocument {
    return session.snapshot.value as DatabaseDocument;
  }

  function dispatch(intent: DatabaseIntent): EditingResult<DatabaseSelection> {
    if (intent.type === "selection.set") {
      if (resolveCell(value(), intent.recordId, intent.propertyId, index()) === null) {
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
      const resolved = resolveCell(document, intent.recordId, intent.propertyId, index(document));
      if (resolved === null) return failure("cell.not-found");
      if (!acceptsDatabaseValue(resolved.property, intent.value)) return failure("cell.invalid-value");
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
      if (index(document).recordById.has(intent.recordId)) {
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
      const recordIndex = index(document).recordIndexById.get(intent.recordId);
      if (recordIndex === undefined) return failure("record.not-found");
      const remaining = document.records.filter((record) => record.id !== intent.recordId);
      const nextRecord = remaining[Math.min(recordIndex, remaining.length - 1)];
      const currentPropertyId = session.snapshot.selection.focus?.propertyId;
      const nextProperty = (currentPropertyId === undefined ? undefined : index(document).propertyById.get(currentPropertyId))
        ?? document.schema.properties[0];
      return session.apply({
        operations: [{ op: "remove", path: buildPointer(["records", recordIndex]) }],
        selectionAfter: nextRecord && nextProperty
          ? collapsed(nextRecord.id, nextProperty.id)
          : emptySelection(),
        origin: intent.type,
      });
    }

    if (intent.type === "view.configure") {
      return configureView(session, value(), intent);
    }

    return paste(session, value(), intent.clipboard, intent.topology, index());
  }

  function copy(topology?: DatabaseTopology): DatabaseClipboard | null {
    const document = value();
    const databaseIndex = index(document);
    const axes = resolveTopology(document, topology, databaseIndex);
    const range = primaryRange(session.snapshot.selection);
    if (range === null) return null;
    const bounds = gridRangeBounds(databaseGrid(axes), {
      anchor: { rowId: range.anchor.recordId, columnId: range.anchor.propertyId },
      focus: { rowId: range.focus.recordId, columnId: range.focus.propertyId },
    });
    if (bounds === null) return null;
    const cells = axes.recordIds
      .slice(bounds.rowStart, bounds.rowEnd + 1)
      .map((recordId) => {
        const record = databaseIndex.recordById.get(recordId) as DatabaseRecord;
        return axes.propertyIds
          .slice(bounds.columnStart, bounds.columnEnd + 1)
          .map((propertyId) => clone(record.values[propertyId]!));
      });
    return {
      type: "application/vnd.interactive-os.database+json",
      cells,
      text: cells.map((row) => row.map(cellText).join("\t")).join("\n"),
    };
  }

  return {
    get snapshot() { return session.snapshot; },
    dispatch,
    tableTopology(viewId) {
      return tableTopology(index(), viewId);
    },
    selectedCellsIn(topology) {
      return selectedCells(value(), session.snapshot.selection, topology, index());
    },
    copy,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function paste(
  session: EditingSession<DatabaseSelection>,
  document: DatabaseDocument,
  clipboard: DatabaseClipboard,
  topology?: DatabaseTopology,
  index?: DatabaseIndex,
): EditingResult<DatabaseSelection> {
  const focus = session.snapshot.selection.focus;
  if (focus === null) return failure("selection.empty");
  if (clipboard.cells.length === 0 || clipboard.cells.some((row) => row.length === 0)) {
    return failure("clipboard.empty");
  }
  const width = clipboard.cells[0]!.length;
  if (clipboard.cells.some((row) => row.length !== width)) {
    return failure("clipboard.not-rectangular");
  }
  const axes = resolveTopology(document, topology, index);
  const start = gridPointIndex(databaseGrid(axes), {
    rowId: focus.recordId,
    columnId: focus.propertyId,
  });
  if (start === null) return failure("selection.cell-not-found");
  if (start.rowIndex + clipboard.cells.length > axes.recordIds.length || start.columnIndex + width > axes.propertyIds.length) {
    return failure("paste.out-of-bounds");
  }

  const operations: JSONPatchOperation[] = [];
  for (let rowOffset = 0; rowOffset < clipboard.cells.length; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < width; columnOffset += 1) {
      const recordId = axes.recordIds[start.rowIndex + rowOffset]!;
      const propertyId = axes.propertyIds[start.columnIndex + columnOffset]!;
      const resolved = resolveCell(document, recordId, propertyId, index);
      if (resolved === null) return failure("cell.not-found");
      const nextValue = clipboard.cells[rowOffset]![columnOffset]!;
      if (!acceptsDatabaseValue(resolved.property, nextValue)) return failure("cell.invalid-value");
      operations.push({
        op: "replace",
        path: buildPointer(["records", resolved.recordIndex, "values", propertyId]),
        value: nextValue,
      });
    }
  }

  const endRecordId = axes.recordIds[start.rowIndex + clipboard.cells.length - 1]!;
  const endPropertyId = axes.propertyIds[start.columnIndex + width - 1]!;
  return session.apply({
    operations,
    selectionAfter: withPrimaryAliases({
      kind: "range",
      ranges: [{
        anchor: { recordId: focus.recordId, propertyId: focus.propertyId },
        focus: { recordId: endRecordId, propertyId: endPropertyId },
      }],
      primaryIndex: 0,
    }),
    origin: "clipboard.paste",
  });
}

interface DatabaseIndex {
  readonly recordById: ReadonlyMap<string, DatabaseRecord>;
  readonly recordIndexById: ReadonlyMap<string, number>;
  readonly propertyById: ReadonlyMap<string, DatabaseProperty>;
  readonly topologyByViewId: Map<string, DatabaseTopology>;
  readonly validatedTopologies: WeakSet<DatabaseTopology>;
  readonly document: DatabaseDocument;
}

function createDatabaseIndex(document: DatabaseDocument): DatabaseIndex {
  return {
    recordById: new Map(document.records.map((record) => [record.id, record])),
    recordIndexById: new Map(document.records.map((record, position) => [record.id, position])),
    propertyById: new Map(document.schema.properties.map((property) => [property.id, property])),
    topologyByViewId: new Map(),
    validatedTopologies: new WeakSet(),
    document,
  };
}

function resolveTopology(document: DatabaseDocument, topology?: DatabaseTopology, index = createDatabaseIndex(document)): DatabaseTopology {
  const resolved = topology ?? {
    recordIds: document.records.map((record) => record.id),
    propertyIds: document.schema.properties.map((property) => property.id),
  };
  if (index.validatedTopologies.has(resolved)) return resolved;
  for (const id of resolved.recordIds) {
    if (!index.recordById.has(id)) throw new Error(`Database topology record was not found: ${JSON.stringify(id)}.`);
  }
  for (const id of resolved.propertyIds) {
    if (!index.propertyById.has(id)) throw new Error(`Database topology property was not found: ${JSON.stringify(id)}.`);
  }
  index.validatedTopologies.add(resolved);
  return resolved;
}

function cellText(value: JSONValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
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
    ...(intent.propertyWidths === undefined ? {} : { propertyWidths: { ...intent.propertyWidths } }),
    ...(intent.sort === undefined ? {} : { sort: intent.sort }),
    ...(intent.filter === undefined ? {} : { filter: intent.filter }),
  };
  assertDatabaseView(next, document.schema.properties);
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

function tableTopology(index: DatabaseIndex, viewId: string): DatabaseTopology {
  const cached = index.topologyByViewId.get(viewId);
  if (cached !== undefined) return cached;
  const topology = projectTable(index.document, viewId);
  index.validatedTopologies.add(topology);
  index.topologyByViewId.set(viewId, topology);
  return topology;
}

function selectedCells(
  document: DatabaseDocument,
  selection: DatabaseSelection,
  topology: DatabaseTopology,
  index = createDatabaseIndex(document),
): DatabaseCell[] {
  const selectedKeys = new Set<string>();
  const grid = databaseGrid(topology);
  for (const range of selection.ranges) {
    for (const cell of gridCellsInRange(grid, {
      anchor: { rowId: range.anchor.recordId, columnId: range.anchor.propertyId },
      focus: { rowId: range.focus.recordId, columnId: range.focus.propertyId },
    })) {
      selectedKeys.add(cellKey(cell.rowId, cell.columnId));
    }
  }
  return topology.recordIds.flatMap((recordId) => {
    const record = index.recordById.get(recordId) as DatabaseRecord;
    return topology.propertyIds
      .filter((propertyId) => selectedKeys.has(cellKey(recordId, propertyId)))
      .map((propertyId) => ({ recordId, propertyId, value: record.values[propertyId]! }));
  });
}

function databaseGrid(topology: DatabaseTopology) {
  return { rowIds: topology.recordIds, columnIds: topology.propertyIds };
}

function resolveCell(document: DatabaseDocument, recordId: string, propertyId: string, index = createDatabaseIndex(document)) {
  const recordIndex = index.recordIndexById.get(recordId);
  const property = index.propertyById.get(propertyId);
  if (recordIndex === undefined || property === undefined) return null;
  return { recordIndex, record: document.records[recordIndex]!, property };
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
