import type { WebModifierState } from "@interactive-os/json-document-web";
import type { AffordanceResult } from "./result.js";

export type Point = {
  readonly x: number;
  readonly y: number;
};

export type DragOffset = {
  readonly dx: number;
  readonly dy: number;
};

export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function dragOffset(origin: Point, point: Point): DragOffset {
  return {
    dx: point.x - origin.x,
    dy: point.y - origin.y,
  };
}

export function dragShouldCommit(offset: DragOffset): boolean {
  return offset.dx !== 0 || offset.dy !== 0;
}

export function dragAffordance(origin: Point, point: Point): AffordanceResult {
  const offset = dragOffset(origin, point);
  return {
    hand: { type: "translate", dx: offset.dx, dy: offset.dy },
    cursor: "grabbing",
    commit: dragShouldCommit(offset),
  };
}

export function dragOperation(modifiers: WebModifierState & { readonly altKey?: boolean }): AffordanceResult {
  if (modifiers.altKey) return { hand: { type: "copy" }, cursor: "copy" };
  return { hand: { type: "move-drop" }, cursor: "move" };
}

export function marqueeRect(origin: Point, point: Point): Rect {
  return {
    x: Math.min(origin.x, point.x),
    y: Math.min(origin.y, point.y),
    width: Math.abs(point.x - origin.x),
    height: Math.abs(point.y - origin.y),
  };
}

export function marqueeAffordance(origin: Point, point: Point): AffordanceResult {
  const rect = marqueeRect(origin, point);
  return {
    hand: { type: "select", operation: "replace" },
    cursor: "crosshair",
    commit: rect.width > 0 || rect.height > 0,
  };
}

export function panAffordance(input: {
  readonly spaceKey: boolean;
  readonly buttons: number;
}): AffordanceResult {
  if (!input.spaceKey && input.buttons !== 4) return { hand: null };
  if (input.buttons === 0) return { hand: null, cursor: "grab" };
  return { hand: { type: "translate", dx: 0, dy: 0 }, cursor: "grabbing" };
}

export function snapAffordance(
  point: Point,
  options: { readonly grid: number; readonly disable?: boolean },
): AffordanceResult {
  if (options.disable || options.grid <= 0) {
    return { hand: { type: "translate", dx: point.x, dy: point.y }, commit: true };
  }
  const grid = options.grid;
  return {
    hand: {
      type: "translate",
      dx: Math.round(point.x / grid) * grid,
      dy: Math.round(point.y / grid) * grid,
    },
    commit: true,
  };
}

export function nudgeAffordance(stroke: {
  readonly key: string;
  readonly shiftKey: boolean;
}): AffordanceResult {
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
}): AffordanceResult {
  if (!input.canDrop) return { hand: null, cursor: "no-drop", commit: false };
  if (input.operation === "copy") return { hand: { type: "copy" }, cursor: "copy", commit: true };
  return { hand: { type: "move-drop" }, cursor: "move", commit: true };
}

export function forbiddenCursor(input: {
  readonly allowed: boolean;
  readonly dropping?: boolean;
}): AffordanceResult {
  if (input.allowed) {
    return { hand: null, cursor: input.dropping ? "move" : "default" };
  }
  return { hand: null, cursor: input.dropping ? "no-drop" : "not-allowed", commit: false };
}

export function hoverAffordance(input: {
  readonly elapsedMs: number;
  readonly inside: boolean;
  readonly delayMs?: number;
}): AffordanceResult {
  if (!input.inside) return { hand: null };
  const delayMs = input.delayMs ?? 400;
  if (input.elapsedMs >= delayMs) return { hand: { type: "hover", phase: "tooltip" } };
  return { hand: { type: "hover", phase: "hint" }, cursor: "help" };
}
