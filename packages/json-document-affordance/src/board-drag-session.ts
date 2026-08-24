export type BoardDragCancelReason = "cancel" | "drop-rejected" | "superseded";

export type BoardDragSnapshot<Item, Target> =
  | { readonly status: "idle"; readonly item: null; readonly target: null }
  | { readonly status: "dragging"; readonly item: Item; readonly target: Target | null };

export interface BoardDrop<Item, Target> {
  readonly item: Item;
  readonly target: Target;
}

export interface BoardDragSessionOptions<Item, Target> {
  readonly onBegin?: (item: Item) => void;
  readonly onPreview?: (item: Item, target: Target | null) => void;
  readonly onCommit?: (drop: BoardDrop<Item, Target>) => void;
  readonly onCancel?: (item: Item, reason: BoardDragCancelReason) => void;
}

export interface BoardDragSession<Item, Target> {
  getSnapshot(): BoardDragSnapshot<Item, Target>;
  begin(item: Item): BoardDragSnapshot<Item, Target>;
  preview(target: Target | null): BoardDragSnapshot<Item, Target>;
  commit(): BoardDrop<Item, Target> | null;
  cancel(reason?: BoardDragCancelReason): Item | null;
}

/** Owns input-agnostic Board item/target preview, commit, and cancel state. */
export function createBoardDragSession<Item, Target>(
  options: BoardDragSessionOptions<Item, Target> = {},
): BoardDragSession<Item, Target> {
  let snapshot: BoardDragSnapshot<Item, Target> = idle();

  return {
    getSnapshot: () => snapshot,
    begin(item) {
      if (snapshot.status === "dragging") options.onCancel?.(snapshot.item, "superseded");
      snapshot = { status: "dragging", item, target: null };
      options.onBegin?.(item);
      return snapshot;
    },
    preview(target) {
      if (snapshot.status === "idle") return snapshot;
      snapshot = { ...snapshot, target };
      options.onPreview?.(snapshot.item, target);
      return snapshot;
    },
    commit() {
      if (snapshot.status === "idle" || snapshot.target === null) return null;
      const drop = { item: snapshot.item, target: snapshot.target };
      snapshot = idle();
      options.onCommit?.(drop);
      return drop;
    },
    cancel(reason = "cancel") {
      if (snapshot.status === "idle") return null;
      const item = snapshot.item;
      snapshot = idle();
      options.onCancel?.(item, reason);
      return item;
    },
  };
}

function idle(): BoardDragSnapshot<never, never> {
  return { status: "idle", item: null, target: null };
}
