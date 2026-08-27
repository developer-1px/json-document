export type ViewportPositionCancelReason = "cancel" | "missing-target" | "target-left-viewport";

export interface ViewportPositionGeometry {
  readonly targetOffset: number;
  readonly tailReserveOffset: number;
  readonly viewportHeight: number;
}

export interface ViewportPositionPorts<Key> {
  readonly measure: (key: Key) => ViewportPositionGeometry | null;
  readonly setTailReserve: (key: Key, height: number) => boolean;
  readonly scrollTo: (top: number, behavior: "smooth" | "instant") => void;
  readonly scheduleFrame: (callback: () => void) => () => void;
}

export interface ViewportPositionOptions<Key> extends ViewportPositionPorts<Key> {
  readonly onCancel?: (reason: ViewportPositionCancelReason) => void;
  readonly onChange?: (snapshot: ViewportPositionSnapshot<Key>) => void;
}

export interface ViewportPositionSnapshot<Key> {
  readonly active: boolean;
  readonly applyingScroll: boolean;
  readonly owned: boolean;
  readonly tailReserve: number;
  readonly targetKey: Key | null;
  readonly viewportOffset: number | null;
}

export interface ViewportPositionSession<Key> {
  getSnapshot(): ViewportPositionSnapshot<Key>;
  position(targetKey: Key, viewportOffset: number): void;
  layoutChanged(): void;
  targetVisibilityChanged(visible: boolean): void;
  complete(): void;
  cancel(reason?: ViewportPositionCancelReason): void;
}

/** Positions a logical target at a requested viewport offset using temporary trailing scroll range. */
export function createViewportPositionSession<Key>(
  options: ViewportPositionOptions<Key>,
): ViewportPositionSession<Key> {
  let active = false;
  let applyingScroll = false;
  let owned = false;
  let tailReserve = 0;
  let targetKey: Key | null = null;
  let viewportOffset: number | null = null;
  let initialScrollApplied = false;
  let cancelFrame: (() => void) | null = null;

  function snapshot(): ViewportPositionSnapshot<Key> {
    return { active, applyingScroll, owned, tailReserve, targetKey, viewportOffset };
  }

  function publish() {
    options.onChange?.(snapshot());
  }

  function clearFrame() {
    cancelFrame?.();
    cancelFrame = null;
  }

  function scheduleReconcile() {
    clearFrame();
    cancelFrame = options.scheduleFrame(() => {
      cancelFrame = null;
      reconcile();
    });
  }

  function reconcile() {
    if (!owned || targetKey === null || viewportOffset === null) return;
    const geometry = options.measure(targetKey);
    if (geometry === null) {
      cancel("missing-target");
      return;
    }
    const targetScrollTop = Math.max(0, geometry.targetOffset - Math.max(0, viewportOffset));
    const nextTailReserve = Math.max(
      0,
      Math.ceil(targetScrollTop + geometry.viewportHeight - geometry.tailReserveOffset),
    );
    const reserveChanged = options.setTailReserve(targetKey, nextTailReserve);
    tailReserve = nextTailReserve;
    publish();
    if (reserveChanged) {
      scheduleReconcile();
      return;
    }
    if (!initialScrollApplied || !active) {
      applyingScroll = true;
      publish();
      try {
        options.scrollTo(targetScrollTop, initialScrollApplied ? "instant" : "smooth");
      } finally {
        applyingScroll = false;
      }
      initialScrollApplied = true;
      publish();
    }
  }

  function releaseTailReserve() {
    if (targetKey !== null && tailReserve !== 0) options.setTailReserve(targetKey, 0);
    tailReserve = 0;
  }

  function cancel(reason: ViewportPositionCancelReason = "cancel") {
    if (targetKey === null && !owned) return;
    clearFrame();
    releaseTailReserve();
    active = false;
    owned = false;
    targetKey = null;
    viewportOffset = null;
    initialScrollApplied = false;
    publish();
    options.onCancel?.(reason);
  }

  return {
    getSnapshot: snapshot,
    position(key, offset) {
      clearFrame();
      if (targetKey !== null && targetKey !== key) releaseTailReserve();
      targetKey = key;
      viewportOffset = Math.max(0, offset);
      active = true;
      owned = true;
      initialScrollApplied = false;
      reconcile();
    },
    layoutChanged() {
      if (owned) scheduleReconcile();
    },
    targetVisibilityChanged(visible) {
      if (owned && initialScrollApplied && !visible) cancel("target-left-viewport");
    },
    complete() {
      if (!owned) return;
      active = false;
      scheduleReconcile();
    },
    cancel,
  };
}
