export interface OrderedTopology<Point, Target> {
  equals(a: Point, b: Point): boolean;
  interval(anchor: Point, focus: Point): readonly Target[];
  reconcilePoint(point: Point): Point | null;
}
