import type { Point, ResizeEdge } from "./drag.js";

export type InteractionHandleAxis = "x" | "y" | "both";

export type InteractionHandleCursor =
  | "grab"
  | "grabbing"
  | "move"
  | "crosshair"
  | "col-resize"
  | "row-resize"
  | "nwse-resize"
  | "nesw-resize"
  | `${ResizeEdge}-resize`;

export type InteractionHandleCursorPolicy = {
  readonly idle: InteractionHandleCursor;
  readonly active?: InteractionHandleCursor;
};

export type DragHandleDescriptor = {
  readonly kind: "drag";
  readonly axis?: InteractionHandleAxis;
  readonly cursor?: InteractionHandleCursorPolicy;
};

export type ResizeHandleDescriptor = {
  readonly kind: "resize";
  readonly edge: ResizeEdge;
  readonly cursor?: InteractionHandleCursorPolicy;
};

export type ControlHandleDescriptor = {
  readonly kind: "control";
  readonly axis?: InteractionHandleAxis;
  readonly cursor?: InteractionHandleCursorPolicy;
};

export type InteractionHandleDescriptor =
  | DragHandleDescriptor
  | ResizeHandleDescriptor
  | ControlHandleDescriptor;

export type InteractionHandlePhase = "start" | "preview" | "commit" | "cancel";
export type InteractionHandleCancelReason = "cancel" | "lost-capture" | "superseded";

export type InteractionHandleDelta = {
  readonly dx: number;
  readonly dy: number;
};

export type InteractionHandleEvent = {
  readonly descriptor: InteractionHandleDescriptor;
  readonly phase: InteractionHandlePhase;
  readonly origin: Point;
  readonly point: Point;
  readonly delta: InteractionHandleDelta;
  readonly cursor: InteractionHandleCursor;
  readonly reason?: InteractionHandleCancelReason;
};

export type InteractionHandleSnapshot = {
  readonly descriptor: InteractionHandleDescriptor;
  readonly origin: Point;
  readonly point: Point;
};

export interface InteractionHandleSession {
  getSnapshot(): InteractionHandleSnapshot | null;
  start(descriptor: InteractionHandleDescriptor, origin: Point): InteractionHandleEvent;
  preview(point: Point): InteractionHandleEvent | null;
  commit(point: Point): InteractionHandleEvent | null;
  cancel(reason?: InteractionHandleCancelReason): InteractionHandleEvent | null;
}

const resizeCursor: Readonly<Record<ResizeEdge, InteractionHandleCursor>> = Object.freeze({
  n: "n-resize",
  ne: "ne-resize",
  e: "e-resize",
  se: "se-resize",
  s: "s-resize",
  sw: "sw-resize",
  w: "w-resize",
  nw: "nw-resize",
});

export function interactionHandleCursor(
  descriptor: InteractionHandleDescriptor,
  state: "idle" | "active" = "idle",
): InteractionHandleCursor {
  const configured = state === "active"
    ? descriptor.cursor?.active ?? descriptor.cursor?.idle
    : descriptor.cursor?.idle;
  if (configured !== undefined) return configured;
  if (descriptor.kind === "drag") return state === "active" ? "grabbing" : "grab";
  if (descriptor.kind === "resize") return resizeCursor[descriptor.edge];
  return "crosshair";
}

export function interactionHandleDelta(
  descriptor: InteractionHandleDescriptor,
  origin: Point,
  point: Point,
): InteractionHandleDelta {
  const axis = descriptor.kind === "resize"
    ? resizeAxis(descriptor.edge)
    : descriptor.axis ?? "both";
  return {
    dx: axis === "y" ? 0 : point.x - origin.x,
    dy: axis === "x" ? 0 : point.y - origin.y,
  };
}

export function createInteractionHandleSession(): InteractionHandleSession {
  let active: InteractionHandleSnapshot | null = null;

  function event(
    phase: InteractionHandlePhase,
    snapshot: InteractionHandleSnapshot,
    reason?: InteractionHandleCancelReason,
  ): InteractionHandleEvent {
    return {
      descriptor: snapshot.descriptor,
      phase,
      origin: snapshot.origin,
      point: snapshot.point,
      delta: interactionHandleDelta(snapshot.descriptor, snapshot.origin, snapshot.point),
      cursor: interactionHandleCursor(snapshot.descriptor, phase === "cancel" || phase === "commit" ? "idle" : "active"),
      ...(reason === undefined ? {} : { reason }),
    };
  }

  return {
    getSnapshot: () => active,
    start(descriptor, origin) {
      active = { descriptor, origin, point: origin };
      return event("start", active);
    },
    preview(point) {
      if (active === null) return null;
      active = { ...active, point };
      return event("preview", active);
    },
    commit(point) {
      if (active === null) return null;
      const committed = { ...active, point };
      active = null;
      return event("commit", committed);
    },
    cancel(reason = "cancel") {
      if (active === null) return null;
      const cancelled = active;
      active = null;
      return event("cancel", cancelled, reason);
    },
  };
}

function resizeAxis(edge: ResizeEdge): InteractionHandleAxis {
  if (edge === "e" || edge === "w") return "x";
  if (edge === "n" || edge === "s") return "y";
  return "both";
}
