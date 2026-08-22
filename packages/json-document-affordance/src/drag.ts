import {
  type WebModifierState,
} from "@interactive-os/json-document-web";
import type {
  AffordancePreview,
  AffordanceRect,
} from "./result.js";

export type Point = {
  readonly x: number;
  readonly y: number;
};

export type DragOffset = {
  readonly dx: number;
  readonly dy: number;
};

export type Rect = AffordanceRect;

function dragOffset(origin: Point, point: Point): DragOffset {
  return {
    dx: point.x - origin.x,
    dy: point.y - origin.y,
  };
}

export function dragAffordance(
  origin: Point,
  point: Point,
  modifiers?: { readonly shiftKey?: boolean; readonly altKey?: boolean },
): AffordancePreview {
  let offset = dragOffset(origin, point);
  if (modifiers?.shiftKey) {
    offset = Math.abs(offset.dx) >= Math.abs(offset.dy)
      ? { dx: offset.dx, dy: 0 }
      : { dx: 0, dy: offset.dy };
  }
  return {
    hand: { type: "translate", dx: offset.dx, dy: offset.dy },
    cursor: modifiers?.altKey ? "copy" : "grabbing",
  };
}

export function dragOperation(modifiers: WebModifierState & { readonly altKey?: boolean }): AffordancePreview {
  if (modifiers.altKey) return { hand: { type: "copy" }, cursor: "copy" };
  return { hand: { type: "move-drop", keepSelection: true }, cursor: "move" };
}

function marqueeRect(origin: Point, point: Point): Rect {
  return {
    x: Math.min(origin.x, point.x),
    y: Math.min(origin.y, point.y),
    width: Math.abs(point.x - origin.x),
    height: Math.abs(point.y - origin.y),
  };
}

export function marqueeAffordance(
  origin: Point,
  point: Point,
  modifiers?: {
    readonly shiftKey?: boolean;
    readonly nested?: boolean;
  },
): AffordancePreview {
  const rect = marqueeRect(origin, point);
  if (rect.width === 0 && rect.height === 0) {
    return { hand: { type: "clear" } };
  }
  const operation = modifiers?.shiftKey ? "extend" : "replace";
  return {
    hand: { type: "select", operation, rect },
    cursor: "crosshair",
  };
}

export function marqueeHitsAffordance(input: {
  readonly rect: Rect;
  readonly items: ReadonlyArray<{
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
  readonly contain?: "intersect" | "inside";
}): AffordancePreview {
  const contain = input.contain ?? "intersect";
  const objectIds = input.items
    .filter((item) => contain === "inside" ? contains(input.rect, item) : intersects(input.rect, item))
    .map((item) => item.id);
  return { hand: { type: "select", operation: "replace", objectIds } };
}

function intersects(rect: Rect, item: Rect): boolean {
  return rect.x < item.x + item.width
    && rect.x + rect.width > item.x
    && rect.y < item.y + item.height
    && rect.y + rect.height > item.y;
}

function contains(rect: Rect, item: Rect): boolean {
  return item.x >= rect.x
    && item.y >= rect.y
    && item.x + item.width <= rect.x + rect.width
    && item.y + item.height <= rect.y + rect.height;
}

export function panAffordance(input: {
  readonly spaceKey?: boolean;
  readonly buttons?: number;
  readonly origin?: Point;
  readonly point?: Point;
  readonly key?: string;
  readonly selected?: boolean;
}): AffordancePreview {
  if (input.selected === false) {
    const step = 16;
    if (input.key === "ArrowRight") return { hand: { type: "translate", dx: step, dy: 0 }, cursor: "grabbing" };
    if (input.key === "ArrowLeft") return { hand: { type: "translate", dx: -step, dy: 0 }, cursor: "grabbing" };
    if (input.key === "ArrowDown") return { hand: { type: "translate", dx: 0, dy: step }, cursor: "grabbing" };
    if (input.key === "ArrowUp") return { hand: { type: "translate", dx: 0, dy: -step }, cursor: "grabbing" };
  }
  const spaceKey = input.spaceKey ?? false;
  const buttons = input.buttons ?? 0;
  if (!spaceKey && buttons !== 4) return { hand: null };
  if (buttons === 0) return { hand: null, cursor: "grab" };
  if (input.origin && input.point) {
    return {
      hand: {
        type: "translate",
        dx: input.point.x - input.origin.x,
        dy: input.point.y - input.origin.y,
      },
      cursor: "grabbing",
    };
  }
  return { hand: { type: "translate", dx: 0, dy: 0 }, cursor: "grabbing" };
}

export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const resizeCursors: Record<ResizeEdge, string> = {
  n: "n-resize",
  ne: "ne-resize",
  e: "e-resize",
  se: "se-resize",
  s: "s-resize",
  sw: "sw-resize",
  w: "w-resize",
  nw: "nw-resize",
};

export function resizeAffordance(
  origin: Point,
  point: Point,
  edge: ResizeEdge,
  modifiers?: { readonly shiftKey?: boolean; readonly altKey?: boolean },
): AffordancePreview {
  let dx = point.x - origin.x;
  let dy = point.y - origin.y;
  const corner = edge.length === 2;
  if (modifiers?.shiftKey && corner) {
    const mag = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx === 0 ? 1 : Math.sign(dx)) * mag;
    dy = (dy === 0 ? 1 : Math.sign(dy)) * mag;
  }
  let left = 0;
  let top = 0;
  let right = 0;
  let bottom = 0;
  if (edge.includes("e")) right = dx;
  if (edge.includes("w")) left = dx;
  if (edge.includes("s")) bottom = dy;
  if (edge.includes("n")) top = dy;
  if (modifiers?.altKey) {
    if (edge.includes("e")) left = -dx;
    if (edge.includes("w")) right = -dx;
    if (edge.includes("s")) top = -dy;
    if (edge.includes("n")) bottom = -dy;
  }
  return {
    hand: {
      type: "resize",
      dx: left,
      dy: top,
      dw: right - left,
      dh: bottom - top,
      edge,
    },
    cursor: resizeCursors[edge],
  };
}

export function wheelAffordance(input: {
  readonly deltaX?: number;
  readonly deltaY?: number;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
}): AffordancePreview {
  const deltaX = input.deltaX ?? 0;
  const deltaY = input.deltaY ?? 0;
  if (input.metaKey || input.ctrlKey) {
    const inward = deltaY < 0;
    return {
      hand: { type: "zoom", factor: inward ? 1.1 : 1 / 1.1 },
      cursor: inward ? "zoom-in" : "zoom-out",
    };
  }
  return { hand: { type: "translate", dx: -deltaX, dy: -deltaY } };
}

export function zoomAffordance(input: { readonly key?: string }): AffordancePreview {
  if (input.key === "+" || input.key === "=") {
    return { hand: { type: "zoom", factor: 1.1 }, cursor: "zoom-in" };
  }
  if (input.key === "-" || input.key === "_") {
    return { hand: { type: "zoom", factor: 1 / 1.1 }, cursor: "zoom-out" };
  }
  return { hand: null };
}

export function snapAffordance(
  point: Point,
  options: { readonly grid: number; readonly disable?: boolean },
): AffordancePreview {
  if (options.disable || options.grid <= 0) {
    return { hand: { type: "translate", dx: point.x, dy: point.y } };
  }
  const grid = options.grid;
  return {
    hand: {
      type: "translate",
      dx: Math.round(point.x / grid) * grid,
      dy: Math.round(point.y / grid) * grid,
    },
  };
}

export function nudgeAffordance(stroke: {
  readonly key: string;
  readonly shiftKey: boolean;
}): AffordancePreview {
  const step = stroke.shiftKey ? 10 : 1;
  if (stroke.key === "ArrowRight") return { hand: { type: "nudge", dx: step, dy: 0 } };
  if (stroke.key === "ArrowLeft") return { hand: { type: "nudge", dx: -step, dy: 0 } };
  if (stroke.key === "ArrowDown") return { hand: { type: "nudge", dx: 0, dy: step } };
  if (stroke.key === "ArrowUp") return { hand: { type: "nudge", dx: 0, dy: -step } };
  return { hand: null };
}

export function dropAffordance(input: {
  readonly canDrop: boolean;
  readonly operation?: "move" | "copy";
}): AffordancePreview {
  if (!input.canDrop) return { hand: null, cursor: "no-drop" };
  if (input.operation === "copy") return { hand: { type: "copy" }, cursor: "copy" };
  return { hand: { type: "move-drop", keepSelection: true }, cursor: "move" };
}

export function forbiddenCursor(input: {
  readonly allowed: boolean;
  readonly dropping?: boolean;
}): AffordancePreview {
  if (input.allowed) {
    return { hand: null, cursor: input.dropping ? "move" : "default" };
  }
  return { hand: null, cursor: input.dropping ? "no-drop" : "not-allowed" };
}

export function hoverAffordance(input: {
  readonly elapsedMs: number;
  readonly inside: boolean;
  readonly delayMs?: number;
  readonly highlight?: boolean;
}): AffordancePreview {
  if (!input.inside) return { hand: null };
  if (input.highlight) return { hand: { type: "hover", phase: "highlight" } };
  const delayMs = input.delayMs ?? 400;
  if (input.elapsedMs >= delayMs) return { hand: { type: "hover", phase: "tooltip" } };
  return { hand: { type: "hover", phase: "hint" }, cursor: "help" };
}
