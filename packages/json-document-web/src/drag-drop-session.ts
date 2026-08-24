export type WebDragDropCancelReason = "cancel" | "drop-rejected" | "superseded";

export interface WebDragDropSessionOptions<Item, Target> {
  readonly onPreview?: (item: Item, target: Target) => void;
  readonly onCommit?: (item: Item, target: Target) => void;
  readonly onCancel?: (item: Item, reason: WebDragDropCancelReason) => void;
}

export interface WebDragDropSession<Item, Target> {
  getActiveItem(): Item | null;
  begin(item: Item): void;
  preview(target: Target): boolean;
  commit(target: Target): Item | null;
  cancel(reason?: WebDragDropCancelReason): Item | null;
}

/** Owns one HTML Drag and Drop lifecycle while the host decides valid targets and writes. */
export function createWebDragDropSession<Item, Target>(
  options: WebDragDropSessionOptions<Item, Target> = {},
): WebDragDropSession<Item, Target> {
  let active: Item | null = null;

  return {
    getActiveItem() {
      return active;
    },
    begin(item) {
      if (active !== null) options.onCancel?.(active, "superseded");
      active = item;
    },
    preview(target) {
      if (active === null) return false;
      options.onPreview?.(active, target);
      return true;
    },
    commit(target) {
      if (active === null) return null;
      const committed = active;
      active = null;
      options.onCommit?.(committed, target);
      return committed;
    },
    cancel(reason = "cancel") {
      if (active === null) return null;
      const cancelled = active;
      active = null;
      options.onCancel?.(cancelled, reason);
      return cancelled;
    },
  };
}
