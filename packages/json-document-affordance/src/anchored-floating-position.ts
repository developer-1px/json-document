export type FloatingSide = "top" | "right" | "bottom" | "left";
export type FloatingAlignment = "start" | "center" | "end";
export type FloatingPlacement = FloatingSide | `${FloatingSide}-${Exclude<FloatingAlignment, "center">}`;

export interface FloatingRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FloatingSize {
  readonly width: number;
  readonly height: number;
}

export type FloatingPlacementPolicy =
  | {
      readonly type: "preferred";
      readonly placement: FloatingPlacement;
      readonly fallbacks?: ReadonlyArray<FloatingPlacement>;
    }
  | {
      readonly type: "locked";
      readonly placement: FloatingPlacement;
    };

export interface AnchoredFloatingPositionInput {
  readonly anchor: FloatingRect;
  readonly floating: FloatingSize;
  readonly boundary: FloatingRect;
  readonly policy: FloatingPlacementPolicy;
  readonly offset?: number;
  readonly boundaryPadding?: number;
}

export interface FloatingOverflow {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface AnchoredFloatingPosition {
  readonly x: number;
  readonly y: number;
  readonly placement: FloatingPlacement;
  readonly availableWidth: number;
  readonly availableHeight: number;
  readonly overflow: FloatingOverflow;
  readonly fits: boolean;
}

type Candidate = {
  readonly x: number;
  readonly y: number;
  readonly placement: FloatingPlacement;
  readonly overflow: FloatingOverflow;
  readonly score: number;
};

/** Resolves an anchored floating rectangle without knowing about DOM elements or UI semantics. */
export function computeAnchoredFloatingPosition(
  input: AnchoredFloatingPositionInput,
): AnchoredFloatingPosition {
  const offset = Math.max(0, input.offset ?? 0);
  const padding = Math.max(0, input.boundaryPadding ?? 0);
  const boundary = insetRect(input.boundary, padding);
  const placements = input.policy.type === "locked"
    ? [input.policy.placement]
    : preferredPlacements(input.policy.placement, input.policy.fallbacks);
  const candidates = placements.map((placement) => {
    const raw = candidate(input.anchor, input.floating, boundary, placement, offset);
    const side = placementParts(placement).side;
    const shifted = shiftCrossAxis(raw, input.anchor, input.floating, boundary, side);
    const overflow = measureOverflow(shifted.x, shifted.y, input.floating, boundary);
    return { ...raw, ...shifted, overflow, score: overflowScore(overflow) };
  });
  const chosen = candidates.find((item) => item.score === 0)
    ?? candidates.reduce((best, item) => item.score < best.score ? item : best);
  const side = placementParts(chosen.placement).side;
  const shifted = shiftCrossAxis(chosen, input.anchor, input.floating, boundary, side);
  const overflow = measureOverflow(shifted.x, shifted.y, input.floating, boundary);
  const available = availableSize(input.anchor, boundary, side, offset);
  return {
    x: shifted.x,
    y: shifted.y,
    placement: chosen.placement,
    availableWidth: available.width,
    availableHeight: available.height,
    overflow,
    fits: overflowScore(overflow) === 0,
  };
}

function preferredPlacements(
  placement: FloatingPlacement,
  fallbacks: ReadonlyArray<FloatingPlacement> | undefined,
): ReadonlyArray<FloatingPlacement> {
  if (fallbacks !== undefined) return unique([placement, ...fallbacks]);
  const { side, alignment } = placementParts(placement);
  const opposite: Record<FloatingSide, FloatingSide> = {
    top: "bottom", right: "left", bottom: "top", left: "right",
  };
  const perpendicular: Record<FloatingSide, ReadonlyArray<FloatingSide>> = {
    top: ["right", "left"], right: ["bottom", "top"], bottom: ["right", "left"], left: ["bottom", "top"],
  };
  return unique([
    placement,
    formatPlacement(opposite[side], alignment),
    ...perpendicular[side].map((candidateSide) => formatPlacement(candidateSide, alignment)),
  ]);
}

function unique(placements: ReadonlyArray<FloatingPlacement>): ReadonlyArray<FloatingPlacement> {
  return [...new Set(placements)];
}

function candidate(
  anchor: FloatingRect,
  floating: FloatingSize,
  boundary: FloatingRect,
  placement: FloatingPlacement,
  offset: number,
): Candidate {
  const { side, alignment } = placementParts(placement);
  const horizontal = alignedCoordinate(anchor.x, anchor.width, floating.width, alignment);
  const vertical = alignedCoordinate(anchor.y, anchor.height, floating.height, alignment);
  const x = side === "left"
    ? anchor.x - floating.width - offset
    : side === "right"
      ? anchor.x + anchor.width + offset
      : horizontal;
  const y = side === "top"
    ? anchor.y - floating.height - offset
    : side === "bottom"
      ? anchor.y + anchor.height + offset
      : vertical;
  const overflow = measureOverflow(x, y, floating, boundary);
  return { x, y, placement, overflow, score: overflowScore(overflow) };
}

function alignedCoordinate(origin: number, anchorSize: number, floatingSize: number, alignment: FloatingAlignment): number {
  if (alignment === "start") return origin;
  if (alignment === "end") return origin + anchorSize - floatingSize;
  return origin + (anchorSize - floatingSize) / 2;
}

function shiftCrossAxis(
  candidateValue: Candidate,
  anchor: FloatingRect,
  floating: FloatingSize,
  boundary: FloatingRect,
  side: FloatingSide,
): { x: number; y: number } {
  if (side === "top" || side === "bottom") {
    const minimum = Math.max(boundary.x, anchor.x - floating.width);
    const maximum = Math.min(boundary.x + boundary.width - floating.width, anchor.x + anchor.width);
    return { x: clamp(candidateValue.x, minimum, maximum), y: candidateValue.y };
  }
  const minimum = Math.max(boundary.y, anchor.y - floating.height);
  const maximum = Math.min(boundary.y + boundary.height - floating.height, anchor.y + anchor.height);
  return { x: candidateValue.x, y: clamp(candidateValue.y, minimum, maximum) };
}

function availableSize(anchor: FloatingRect, boundary: FloatingRect, side: FloatingSide, offset: number): FloatingSize {
  const right = boundary.x + boundary.width;
  const bottom = boundary.y + boundary.height;
  if (side === "top") return { width: boundary.width, height: Math.max(0, anchor.y - offset - boundary.y) };
  if (side === "bottom") return { width: boundary.width, height: Math.max(0, bottom - anchor.y - anchor.height - offset) };
  if (side === "left") return { width: Math.max(0, anchor.x - offset - boundary.x), height: boundary.height };
  return { width: Math.max(0, right - anchor.x - anchor.width - offset), height: boundary.height };
}

function measureOverflow(x: number, y: number, floating: FloatingSize, boundary: FloatingRect): FloatingOverflow {
  return {
    top: Math.max(0, boundary.y - y),
    right: Math.max(0, x + floating.width - boundary.x - boundary.width),
    bottom: Math.max(0, y + floating.height - boundary.y - boundary.height),
    left: Math.max(0, boundary.x - x),
  };
}

function overflowScore(overflow: FloatingOverflow): number {
  return overflow.top + overflow.right + overflow.bottom + overflow.left;
}

function insetRect(rect: FloatingRect, padding: number): FloatingRect {
  return {
    x: rect.x + padding,
    y: rect.y + padding,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2),
  };
}

function placementParts(placement: FloatingPlacement): { side: FloatingSide; alignment: FloatingAlignment } {
  const [side, alignment] = placement.split("-") as [FloatingSide, Exclude<FloatingAlignment, "center"> | undefined];
  return { side, alignment: alignment ?? "center" };
}

function formatPlacement(side: FloatingSide, alignment: FloatingAlignment): FloatingPlacement {
  return alignment === "center" ? side : `${side}-${alignment}`;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
