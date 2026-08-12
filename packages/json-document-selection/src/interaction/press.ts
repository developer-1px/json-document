import {
  idlePointerInteraction,
  type InteractionResult,
  type PointerInteractionState,
  type PointerSample,
  type SelectionOperation,
} from "./pointer.js";

export interface PressSelection<Point> {
  readonly point: Point;
  readonly operation: SelectionOperation;
}

export function reducePressInteraction<Point>(
  state: PointerInteractionState<Point>,
  sample: PointerSample<Point>,
): InteractionResult<PointerInteractionState<Point>, PressSelection<Point>, PressSelection<Point>> {
  if (sample.phase === "start") {
    if (state.kind === "active") return unchanged(state);
    const next: PointerInteractionState<Point> = {
      kind: "active",
      pointerId: sample.pointerId,
      start: sample.point,
      current: sample.point,
      operation: sample.operation,
    };
    return {
      state: next,
      changed: true,
      preview: { point: sample.point, operation: sample.operation },
      commit: null,
      canceled: false,
    };
  }
  if (state.kind === "idle" || state.pointerId !== sample.pointerId) return unchanged(state);
  if (sample.phase === "cancel") {
    return {
      state: idlePointerInteraction(),
      changed: true,
      preview: null,
      commit: null,
      canceled: true,
    };
  }
  if (sample.phase === "move") {
    const next = { ...state, current: sample.point };
    return {
      state: next,
      changed: true,
      preview: { point: sample.point, operation: state.operation },
      commit: null,
      canceled: false,
    };
  }
  return {
    state: idlePointerInteraction(),
    changed: true,
    preview: null,
    commit: { point: sample.point, operation: state.operation },
    canceled: false,
  };
}

function unchanged<Point>(state: PointerInteractionState<Point>): InteractionResult<
  PointerInteractionState<Point>,
  PressSelection<Point>,
  PressSelection<Point>
> {
  return { state, changed: false, preview: null, commit: null, canceled: false };
}
