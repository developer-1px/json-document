export type CanvasGestureType = "drag" | "marquee" | "pan" | "resize";
export type CanvasGestureCancelReason = "cancel" | "pointer-cancel" | "lost-capture" | "superseded";

export interface CanvasGestureState {
  readonly type: CanvasGestureType;
}

export interface CanvasGestureSessionOptions<Gesture extends CanvasGestureState> {
  readonly onBegin?: (gesture: Gesture) => void;
  readonly onPreview?: (gesture: Gesture) => void;
  readonly onCommit?: (gesture: Gesture) => void;
  readonly onCancel?: (gesture: Gesture, reason: CanvasGestureCancelReason) => void;
}

export interface CanvasGestureSession<Gesture extends CanvasGestureState> {
  getActive(): Gesture | null;
  begin(gesture: Gesture): Gesture;
  preview(update: Gesture | ((gesture: Gesture) => Gesture)): Gesture | null;
  commit(): Gesture | null;
  cancel(reason?: CanvasGestureCancelReason): Gesture | null;
}

/** Owns one semantic Canvas gesture across Web pointer and keyboard cancellation. */
export function createCanvasGestureSession<Gesture extends CanvasGestureState>(
  options: CanvasGestureSessionOptions<Gesture> = {},
): CanvasGestureSession<Gesture> {
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
