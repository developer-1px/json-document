export type GestureCancelReason = "cancel" | "pointer-cancel" | "lost-capture" | "superseded";

export interface GestureState {
  readonly type: string;
}

export interface GestureSessionOptions<Gesture extends GestureState> {
  readonly onBegin?: (gesture: Gesture) => void;
  readonly onPreview?: (gesture: Gesture) => void;
  readonly onCommit?: (gesture: Gesture) => void;
  readonly onCancel?: (gesture: Gesture, reason: GestureCancelReason) => void;
}

export interface GestureSession<Gesture extends GestureState> {
  getActive(): Gesture | null;
  begin(gesture: Gesture): Gesture;
  preview(update: Gesture | ((gesture: Gesture) => Gesture)): Gesture | null;
  commit(): Gesture | null;
  cancel(reason?: GestureCancelReason): Gesture | null;
}

/** Owns one input-independent semantic gesture lifecycle. */
export function createGestureSession<Gesture extends GestureState>(
  options: GestureSessionOptions<Gesture> = {},
): GestureSession<Gesture> {
  let active: Gesture | null = null;
  return {
    getActive: () => active,
    begin(gesture) {
      if (active !== null) options.onCancel?.(active, "superseded");
      active = gesture;
      options.onBegin?.(gesture);
      return gesture;
    },
    preview(update) {
      if (active === null) return null;
      active = typeof update === "function" ? update(active) : update;
      options.onPreview?.(active);
      return active;
    },
    commit() {
      if (active === null) return null;
      const committed = active;
      active = null;
      options.onCommit?.(committed);
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
