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
import { assertOrderDocument } from "./order-validation.js";
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

export interface OrderClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.order+json";
  readonly items: ReadonlyArray<OrderItem>;
  readonly text: string;
}

export type OrderIntent =
  | {
      readonly type: "selection.set";
      readonly itemId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "clipboard.paste"; readonly clipboard: OrderClipboard; readonly afterId?: string };

export interface OrderEditor {
  readonly snapshot: EditingSnapshot<OrderSelection>;
  readonly selectedItemIds: ReadonlyArray<string>;
  dispatch(intent: OrderIntent): EditingResult<OrderSelection>;
  copy(): OrderClipboard | null;
  cut(): { readonly clipboard: OrderClipboard; readonly result: EditingResult<OrderSelection> } | null;
  undo(): EditingResult<OrderSelection>;
  redo(): EditingResult<OrderSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<OrderSelection>) => void): () => void;
}

export function createOrderEditor(
  source: EditingDocumentSource<OrderDocument>,
  options: { readonly createId?: () => string } = {},
): OrderEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as OrderDocument;
  assertOrderDocument(initial);
  let sequence = 0;
  const createId = options.createId ?? (() => `item-${++sequence}`);
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

    if (intent.type === "clipboard.paste") {
      const target = intent.afterId ?? selectedItemIds().at(-1);
      const targetIndex = target === undefined ? items.length - 1 : items.findIndex((item) => item.id === target);
      if (target !== undefined && targetIndex < 0) return failure("paste.target-not-found");
      const pasted = cloneItemsWithUniqueIds(intent.clipboard.items, items, createId);
      if (pasted.length === 0) return failure("clipboard.empty");
      return session.apply({
        operations: pasted.map((item, offset) => ({ op: "add", path: `/items/${targetIndex + 1 + offset}`, value: item })),
        selectionAfter: rangesFor(pasted),
        origin: intent.type,
      });
    }

    return removeSelected(selectedItemIds());
  }

  function copy(): OrderClipboard | null {
    const items = value().items.filter((item) => selectedItemIds().includes(item.id));
    if (items.length === 0) return null;
    return {
      type: "application/vnd.interactive-os.order+json",
      items,
      text: items.map((item) => item.label).join("\n"),
    };
  }

  function removeSelected(ids: ReadonlyArray<string>): EditingResult<OrderSelection> {
    const items = value().items;
    if (ids.length === 0) return failure("selection.empty");
    const selected = new Set(ids);
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
      origin: "selection.remove",
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedItemIds() { return selectedItemIds(); },
    dispatch,
    copy,
    cut() {
      const clipboard = copy();
      if (!clipboard) return null;
      return { clipboard, result: removeSelected(selectedItemIds()) };
    },
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

function rangesFor(items: ReadonlyArray<OrderItem>): OrderSelection {
  return {
    kind: "range",
    ranges: items.map((item) => ({ anchor: { itemId: item.id }, focus: { itemId: item.id } })),
    primaryIndex: items.length === 0 ? null : 0,
  };
}

function createUniqueId(items: ReadonlyArray<OrderItem>, createId: () => string): string {
  const existing = new Set(items.map((item) => item.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId();
    if (!existing.has(id)) return id;
  }
  throw new Error("createId did not produce a unique order item id");
}

function cloneItemsWithUniqueIds(
  source: ReadonlyArray<OrderItem>,
  existing: ReadonlyArray<OrderItem>,
  createId: () => string,
): OrderItem[] {
  const occupied = [...existing];
  return source.map((item) => {
    const copy = { ...item, id: createUniqueId(occupied, createId) };
    occupied.push(copy);
    return copy;
  });
}

function success(snapshot: EditingSnapshot<OrderSelection>): EditingResult<OrderSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<OrderSelection> {
  return { ok: false, code };
}
