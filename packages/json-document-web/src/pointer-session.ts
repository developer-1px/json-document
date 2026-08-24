export type WebPointerSessionCancelReason = "cancel" | "lost-capture" | "superseded";

export interface WebPointerCaptureTarget {
  setPointerCapture(pointerId: number): void;
  hasPointerCapture(pointerId: number): boolean;
  releasePointerCapture(pointerId: number): void;
}

export type WebPointerSessionSnapshot<State> = Readonly<{
  pointerId: number;
  state: State;
}>;

export interface WebPointerSessionOptions<State> {
  readonly onPreview?: (state: State) => void;
  readonly onCommit?: (state: State) => void;
  readonly onCancel?: (state: State, reason: WebPointerSessionCancelReason) => void;
}

export interface WebPointerSession<State> {
  getSnapshot(): WebPointerSessionSnapshot<State> | null;
  begin(target: WebPointerCaptureTarget, pointerId: number, state: State): void;
  preview(pointerId: number, update: (state: State) => State): State | null;
  commit(pointerId: number): State | null;
  cancel(pointerId: number, reason?: WebPointerSessionCancelReason): State | null;
}

/** Owns one Pointer Events capture lifecycle without knowing product geometry or Intent. */
export function createWebPointerSession<State>(
  options: WebPointerSessionOptions<State> = {},
): WebPointerSession<State> {
  let active: (WebPointerSessionSnapshot<State> & { readonly target: WebPointerCaptureTarget }) | null = null;

  function finish(pointerId: number): typeof active {
    if (active === null || active.pointerId !== pointerId) return null;
    const finished = active;
    active = null;
    if (finished.target.hasPointerCapture(pointerId)) {
      finished.target.releasePointerCapture(pointerId);
    }
    return finished;
  }

  return {
    getSnapshot() {
      return active === null ? null : { pointerId: active.pointerId, state: active.state };
    },
    begin(target, pointerId, state) {
      if (active !== null) {
        const replaced = finish(active.pointerId);
        if (replaced !== null) options.onCancel?.(replaced.state, "superseded");
      }
      target.setPointerCapture(pointerId);
      active = { target, pointerId, state };
    },
    preview(pointerId, update) {
      if (active === null || active.pointerId !== pointerId) return null;
      const state = update(active.state);
      active = { ...active, state };
      options.onPreview?.(state);
      return state;
    },
    commit(pointerId) {
      const committed = finish(pointerId);
      if (committed === null) return null;
      options.onCommit?.(committed.state);
      return committed.state;
    },
    cancel(pointerId, reason = "cancel") {
      const cancelled = finish(pointerId);
      if (cancelled === null) return null;
      options.onCancel?.(cancelled.state, reason);
      return cancelled.state;
    },
  };
}
