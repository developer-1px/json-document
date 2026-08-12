export interface OrderedTopology<Point, Target> {
  equals(a: Point, b: Point): boolean;
  interval(anchor: Point, focus: Point): readonly Target[];
  reconcilePoint(point: Point): Point | null;
}

export interface SpatialIndex<Key, Point, Region> {
  hitPoint(point: Point, mode: "topmost" | "deepest"): Key | null;
  hitRegion(region: Region, mode: "intersects" | "contains"): readonly Key[];
}

export interface RegionBuilder<Point, Region> {
  fromPoints(start: Point, current: Point): Region;
}
