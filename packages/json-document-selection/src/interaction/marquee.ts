import type { RegionBuilder, SpatialIndex } from "../ports/index.js";
import {
  idlePointerInteraction,
  type InteractionResult,
  type PointerInteractionState,
  type PointerSample,
  type SelectionOperation,
} from "./pointer.js";

export interface MarqueeSelection<Key, Region> {
  readonly region: Region;
  readonly keys: readonly Key[];
  readonly operation: SelectionOperation;
}

export interface MarqueeContext<Key, Point, Region> {
  readonly regions: RegionBuilder<Point, Region>;
  readonly spatialIndex: SpatialIndex<Key, Point, Region>;
  readonly hitMode: "intersects" | "contains";
}

export function reduceMarqueeInteraction<Key, Point, Region>(
  state: PointerInteractionState<Point>,
  sample: PointerSample<Point>,
  context: MarqueeContext<Key, Point, Region>,
): InteractionResult<
  PointerInteractionState<Point>,
  MarqueeSelection<Key, Region>,
  MarqueeSelection<Key, Region>
> {
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
      preview: selection(next, context),
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
  const next = { ...state, current: sample.point };
  if (sample.phase === "move") {
    return {
      state: next,
      changed: true,
      preview: selection(next, context),
      commit: null,
      canceled: false,
    };
  }
  return {
    state: idlePointerInteraction(),
    changed: true,
    preview: null,
    commit: selection(next, context),
    canceled: false,
  };
}

function selection<Key, Point, Region>(
  state: Extract<PointerInteractionState<Point>, { readonly kind: "active" }>,
  context: MarqueeContext<Key, Point, Region>,
): MarqueeSelection<Key, Region> {
  const region = context.regions.fromPoints(state.start, state.current);
  return {
    region,
    keys: context.spatialIndex.hitRegion(region, context.hitMode),
    operation: state.operation,
  };
}

function unchanged<Key, Point, Region>(state: PointerInteractionState<Point>): InteractionResult<
  PointerInteractionState<Point>,
  MarqueeSelection<Key, Region>,
  MarqueeSelection<Key, Region>
> {
  return { state, changed: false, preview: null, commit: null, canceled: false };
}
