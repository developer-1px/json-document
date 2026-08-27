export type ViewportInteractionCancelReason = "cancel" | "superseded" | "user-interruption" | "watchdog";

export interface ViewportInteractionPorts<Key> {
  readonly measureAnchor: (key: Key) => number | null;
  readonly scrollBy: (delta: number) => void;
  readonly scrollToFollowTarget: () => void;
  readonly scheduleFrame: (callback: () => void) => () => void;
  readonly scheduleWatchdog: (callback: () => void, delay: number) => () => void;
}

export interface ViewportInteractionOptions<Key> extends ViewportInteractionPorts<Key> {
  readonly settleFrames?: number;
  readonly watchdogMs?: number;
  readonly onCancel?: (reason: ViewportInteractionCancelReason) => void;
  readonly onSettle?: () => void;
}

export interface ViewportLayoutTransaction<Key> {
  readonly anchorKey?: Key;
}

export interface ViewportInteractionSnapshot {
  readonly active: boolean;
  readonly following: boolean;
  readonly applyingScroll: boolean;
}

export interface ViewportInteractionSession<Key> {
  getSnapshot(): ViewportInteractionSnapshot;
  setFollowing(following: boolean): void;
  begin(transaction?: ViewportLayoutTransaction<Key>): void;
  layoutChanged(): void;
  interrupt(): void;
  cancel(reason?: ViewportInteractionCancelReason): void;
}

type ActiveTransaction<Key> = {
  readonly anchorKey: Key | null;
  readonly anchorOffset: number | null;
  revision: number;
};

/** Preserves viewport intent across asynchronous content and layout changes. */
export function createViewportInteractionSession<Key>(
  options: ViewportInteractionOptions<Key>,
): ViewportInteractionSession<Key> {
  const settleFrames = Math.max(1, options.settleFrames ?? 2);
  const watchdogMs = Math.max(0, options.watchdogMs ?? 1_000);
  let active: ActiveTransaction<Key> | null = null;
  let following = false;
  let applyingScroll = false;
  let cancelFrame: (() => void) | null = null;
  let cancelWatchdog: (() => void) | null = null;

  function clearScheduled() {
    cancelFrame?.();
    cancelWatchdog?.();
    cancelFrame = null;
    cancelWatchdog = null;
  }

  function applyScroll(scroll: () => void) {
    applyingScroll = true;
    try {
      scroll();
    } finally {
      applyingScroll = false;
    }
  }

  function finish() {
    const transaction = active;
    if (transaction === null) return;
    clearScheduled();
    active = null;
    if (following) {
      applyScroll(options.scrollToFollowTarget);
    } else if (transaction.anchorKey !== null && transaction.anchorOffset !== null) {
      const nextOffset = options.measureAnchor(transaction.anchorKey);
      if (nextOffset !== null) {
        const delta = nextOffset - transaction.anchorOffset;
        if (delta !== 0) applyScroll(() => options.scrollBy(delta));
      }
    }
    options.onSettle?.();
  }

  function scheduleSettle(revision: number, remaining = settleFrames) {
    cancelFrame?.();
    cancelFrame = options.scheduleFrame(() => {
      cancelFrame = null;
      if (active === null || active.revision !== revision) return;
      if (remaining > 1) scheduleSettle(revision, remaining - 1);
      else finish();
    });
  }

  function cancel(reason: ViewportInteractionCancelReason = "cancel") {
    if (active === null) return;
    clearScheduled();
    active = null;
    options.onCancel?.(reason);
  }

  return {
    getSnapshot: () => ({ active: active !== null, following, applyingScroll }),
    setFollowing(value) {
      following = value;
    },
    begin(transaction = {}) {
      if (active !== null) cancel("superseded");
      const anchorKey = transaction.anchorKey ?? null;
      active = {
        anchorKey,
        anchorOffset: anchorKey === null ? null : options.measureAnchor(anchorKey),
        revision: 0,
      };
      cancelWatchdog = options.scheduleWatchdog(() => {
        cancelWatchdog = null;
        cancel("watchdog");
      }, watchdogMs);
      scheduleSettle(0);
    },
    layoutChanged() {
      if (active === null) return;
      active.revision += 1;
      scheduleSettle(active.revision);
    },
    interrupt() {
      if (applyingScroll) return;
      const wasFollowing = following;
      following = false;
      if (active !== null) cancel("user-interruption");
      else if (wasFollowing) options.onCancel?.("user-interruption");
    },
    cancel,
  };
}
