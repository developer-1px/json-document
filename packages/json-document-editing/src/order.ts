import {
  buildPointer,
  type JSONValue,
} from "@interactive-os/json-document";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  selectRangePoint,
  type RangeSelectionState,
} from "./range-selection.js";
import { lineInterval, lineTopology } from "./topology.js";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";

export interface OrderItem extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
}

export interface OrderDocument extends Record<string, JSONValue> {
  readonly items: ReadonlyArray<OrderItem>;
}

export interface OrderPoint extends Record<string, JSONValue> {
  readonly itemId: string;
}

export interface OrderRange extends Record<string, JSONValue> {
  readonly anchor: OrderPoint;
  readonly focus: OrderPoint;
}

export interface OrderSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<OrderRange>;
  readonly primaryIndex: number | null;
}

export type OrderIntent =
  | {
      readonly type: "selection.set";
      readonly itemId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove" };

export interface OrderEditor {
  readonly snapshot: EditingSnapshot<OrderSelection>;
  readonly selectedItemIds: ReadonlyArray<string>;
  dispatch(intent: OrderIntent): EditingResult<OrderSelection>;
  undo(): EditingResult<OrderSelection>;
  redo(): EditingResult<OrderSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<OrderSelection>) => void): () => void;
}

export function createOrderEditor(source: EditingDocumentSource<OrderDocument>): OrderEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as OrderDocument;
  assertOrderDocument(initial);
  const first = initial.items[0];
  const session = createEditingSession({
    document,
    selection: first ? collapsed(first.id) : emptySelection(),
  });

  function value(): OrderDocument {
    return session.snapshot.value as OrderDocument;
  }

  function selectedItemIds(): string[] {
    const items = value().items;
    const visible = lineTopology(items.map((item) => item.id));
    const selected = new Set<string>();
    for (const range of session.snapshot.selection.ranges) {
      for (const id of lineInterval(visible, range.anchor.itemId, range.focus.itemId)) selected.add(id);
    }
    return items.map((item) => item.id).filter((id) => selected.has(id));
  }

  function dispatch(intent: OrderIntent): EditingResult<OrderSelection> {
    const items = value().items;
    if (intent.type === "selection.set") {
      if (!items.some((item) => item.id === intent.itemId)) return failure("selection.item-not-found");
      const point: OrderPoint = { itemId: intent.itemId };
      const selection = selectRangePoint(
        session.snapshot.selection,
        point,
        intent.mode ?? "replace",
        (left, right) => left.itemId === right.itemId,
      );
      return success(session.select(asOrderSelection(selection)));
    }

    const selected = new Set(selectedItemIds());
    if (selected.size === 0) return failure("selection.empty");
    const indices = items
      .map((item, index) => selected.has(item.id) ? index : -1)
      .filter((index) => index >= 0)
      .sort((left, right) => right - left);
    const remaining = items.filter((item) => !selected.has(item.id));
    const firstRemoved = Math.min(...indices);
    const next = remaining[Math.min(firstRemoved, remaining.length - 1)];
    return session.apply({
      operations: indices.map((index) => ({ op: "remove", path: buildPointer(["items", index]) })),
      selectionAfter: next ? collapsed(next.id) : emptySelection(),
      origin: intent.type,
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedItemIds() { return selectedItemIds(); },
    dispatch,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function collapsed(itemId: string): OrderSelection {
  return asOrderSelection(collapsedRangeSelection<OrderPoint>({ itemId }));
}

function emptySelection(): OrderSelection {
  return asOrderSelection(emptyRangeSelection<OrderPoint>());
}

function asOrderSelection(selection: RangeSelectionState<OrderPoint>): OrderSelection {
  return {
    kind: "range",
    ranges: selection.ranges.map((range) => ({
      anchor: { ...range.anchor },
      focus: { ...range.focus },
    })),
    primaryIndex: selection.primaryIndex,
  };
}

function assertOrderDocument(document: OrderDocument): void {
  const ids = new Set<string>();
  for (const item of document.items) {
    if (item.id.length === 0) throw new Error("Order item ids must not be empty.");
    if (ids.has(item.id)) throw new Error(`Order item id must be unique: ${JSON.stringify(item.id)}.`);
    ids.add(item.id);
  }
}

function success(snapshot: EditingSnapshot<OrderSelection>): EditingResult<OrderSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<OrderSelection> {
  return { ok: false, code };
}
