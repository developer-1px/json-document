export type CanvasGestureType = "drag" | "marquee" | "pan" | "resize";
import {
  createGestureSession,
  type GestureCancelReason,
  type GestureSession,
  type GestureSessionOptions,
} from "./gesture-session.js";

export type CanvasGestureCancelReason = GestureCancelReason;

export interface CanvasGestureState {
  readonly type: CanvasGestureType;
}

export type CanvasGestureSessionOptions<Gesture extends CanvasGestureState> = GestureSessionOptions<Gesture>;
export type CanvasGestureSession<Gesture extends CanvasGestureState> = GestureSession<Gesture>;

/** Owns one semantic Canvas gesture across Web pointer and keyboard cancellation. */
export function createCanvasGestureSession<Gesture extends CanvasGestureState>(
  options: CanvasGestureSessionOptions<Gesture> = {},
): CanvasGestureSession<Gesture> {
  return createGestureSession(options);
}
