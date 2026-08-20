export type Point = {
  readonly x: number;
  readonly y: number;
};

export type DragOffset = {
  readonly dx: number;
  readonly dy: number;
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
