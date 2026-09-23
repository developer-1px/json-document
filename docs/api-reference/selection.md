# @interactive-os/json-document-selection API

**Owner:** Editing

구조적 selection과 topology 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-selection/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `collapsedRangeSelection`

```ts
collapsedRangeSelection<Point>(point: Point): RangeSelection<Point>
```
## `createKeySelectionFamily`

```ts
createKeySelectionFamily<Key extends string = string>(): SelectionFamily<KeySelection<Key>, KeySelectionCommand<Key>, KeySelectionContext<Key>, KeySelectionMapping<Key>, Key, SelectionChange>
```
## `createMaterializedRangeSelectionFamily`

```ts
createMaterializedRangeSelectionFamily<Point>(): SelectionFamily<MaterializedRangeSelection<Point>, MaterializedRangeSelectionCommand<Point>, MaterializedRangeSelectionContext<Point>, MaterializedRangeSelectionMapping<Point>, Point, SelectionChange>
```
## `createRangeSelectionFamily`

```ts
createRangeSelectionFamily<Point, Target = Point>(): SelectionFamily<RangeSelection<Point>, RangeSelectionCommand<Point>, RangeSelectionContext<Point, Target>, RangeSelectionMapping<Point>, Target, SelectionChange>
```
## `emptyKeySelection`

```ts
emptyKeySelection<Key extends string = string>(): KeySelection<Key>
```
## `emptyMaterializedRangeSelection`

```ts
emptyMaterializedRangeSelection<Point>(): MaterializedRangeSelection<Point>
```
## `emptyRangeSelection`

```ts
emptyRangeSelection<Point>(): RangeSelection<Point>
```
## `KeySelection`

```ts
type KeySelection<Key extends string = string> =
  | {
      readonly kind: "explicit";
      readonly keys: readonly Key[];
      readonly primaryKey: Key | null;
    }
  | {
      readonly kind: "all";
      readonly universe: string;
      readonly excludedKeys: readonly Key[];
      readonly primaryKey: Key | null;
    };
```
## `KeySelectionCommand`

```ts
type KeySelectionCommand<Key extends string = string> =
  | { readonly type: "replace"; readonly keys: readonly Key[]; readonly primaryKey?: Key }
  | { readonly type: "add"; readonly keys: readonly Key[]; readonly primaryKey?: Key }
  | { readonly type: "subtract"; readonly keys: readonly Key[] }
  | { readonly type: "toggle"; readonly keys: readonly Key[]; readonly primaryKey?: Key }
  | { readonly type: "select-all"; readonly universe: string }
  | { readonly type: "set-primary"; readonly key: Key | null }
  | { readonly type: "clear" };
```
## `KeySelectionContext`

```ts
interface KeySelectionContext<Key extends string = string> {
  readonly keys: readonly Key[];
  readonly universe: string;
  readonly universeMismatch: "clear" | "retarget";
}
```
## `KeySelectionMapping`

```ts
interface KeySelectionMapping<Key extends string = string> {
  mapKey(key: Key): Key | null;
  mapUniverse?(universe: string): string | null;
}
```
## `MaterializedRangeSelection`

```ts
interface MaterializedRangeSelection<Point> extends RangeSelection<Point> {
  readonly ranges: readonly MaterializedSelectionRange<Point>[];
}
```
## `MaterializedRangeSelectionCommand`

```ts
type MaterializedRangeSelectionCommand<Point> =
  | { readonly type: "collapse"; readonly point: Point }
  | { readonly type: "extend-primary"; readonly point: Point }
  | { readonly type: "toggle-point"; readonly point: Point }
  | { readonly type: "clear" };
```
## `MaterializedRangeSelectionContext`

```ts
interface MaterializedRangeSelectionContext<Point> {
  readonly topology: OrderedTopology<Point, Point>;
}
```
## `MaterializedRangeSelectionMapping`

```ts
interface MaterializedRangeSelectionMapping<Point> {
  mapPoint(point: Point): Point | null;
}
```
## `MaterializedSelectionDragSource`

```ts
interface MaterializedSelectionDragSource<Point> {
  readonly selection: MaterializedRangeSelection<Point>;
  readonly anchor: Point;
  readonly points: readonly Point[];
  readonly selectionChanged: boolean;
}
```
## `MaterializedSelectionRange`

```ts
interface MaterializedSelectionRange<Point> extends SelectionRange<Point> {
  readonly points: readonly Point[];
}
```
## `NavigationCommand`

```ts
type NavigationCommand =
  | {
      readonly type: "move";
      readonly direction: "previous" | "next" | "up" | "down" | "left" | "right";
      readonly operation: "replace" | "extend";
    }
  | {
      readonly type: "boundary";
      readonly edge: "start" | "end";
      readonly operation: "replace" | "extend";
    }
  | { readonly type: "activate" }
  | { readonly type: "cancel" };
```
## `normalizeKeySelection`

```ts
normalizeKeySelection<Key extends string>(state: KeySelection<Key>, context: KeySelectionContext<Key>): KeySelection<Key>
```
## `normalizeMaterializedRangeSelection`

```ts
normalizeMaterializedRangeSelection<Point>(state: MaterializedRangeSelection<Point>, topology: OrderedTopology<Point, Point>): MaterializedRangeSelection<Point>
```
## `normalizeRangeSelection`

```ts
normalizeRangeSelection<Point, Target>(state: RangeSelection<Point>, topology: OrderedTopology<Point, Target>): RangeSelection<Point>
```
## `OrderedTopology`

```ts
interface OrderedTopology<Point, Target> {
  equals(a: Point, b: Point): boolean;
  interval(anchor: Point, focus: Point): readonly Target[];
  reconcilePoint(point: Point): Point | null;
}
```
## `primaryRange`

```ts
primaryRange<Point>(selection: RangeSelection<Point>): SelectionRange<Point> | null
```
## `RangeSelection`

```ts
interface RangeSelection<Point> {
  readonly kind: "range";
  readonly ranges: readonly SelectionRange<Point>[];
  readonly primaryIndex: number | null;
}
```
## `RangeSelectionCommand`

```ts
type RangeSelectionCommand<Point> =
  | { readonly type: "collapse"; readonly point: Point }
  | { readonly type: "extend-primary"; readonly point: Point }
  | { readonly type: "add-collapsed"; readonly point: Point }
  | { readonly type: "toggle-point"; readonly point: Point }
  | { readonly type: "replace-range"; readonly range: SelectionRange<Point> }
  | { readonly type: "clear" };
```
## `RangeSelectionContext`

```ts
interface RangeSelectionContext<Point, Target> {
  readonly topology: OrderedTopology<Point, Target>;
}
```
## `RangeSelectionMapping`

```ts
interface RangeSelectionMapping<Point> {
  mapPoint(point: Point): Point | null;
}
```
## `resolveMaterializedSelectionDragSource`

```ts
resolveMaterializedSelectionDragSource<Point>(state: MaterializedRangeSelection<Point>, point: Point, context: MaterializedRangeSelectionContext<Point>): MaterializedSelectionDragSource<Point> | null
```
## `SelectionChange`

```ts
interface SelectionChange {
  readonly lifecycle: SelectionLifecycle;
}
```
## `SelectionFamily`

```ts
interface SelectionFamily<
  State,
  Command,
  Context,
  Mapping,
  Target,
  Change = unknown,
> {
  transition(
    state: State,
    command: Command,
    context: Context,
  ): SelectionResult<State, Change>;
  reconcile(state: State, context: Context): SelectionResult<State, Change>;
  map(
    state: State,
    mapping: Mapping,
    context: Context,
  ): SelectionResult<State, Change>;
  targets(state: State, context: Context): readonly Target[];
}
```
## `SelectionHistoryEntry`

```ts
interface SelectionHistoryEntry<Selection, Patch> {
  readonly forward: readonly Patch[];
  readonly inverse: readonly Patch[];
  readonly selectionBefore: Selection;
  readonly selectionAfter: Selection;
}
```
## `SelectionLifecycle`

```ts
type SelectionLifecycle = "transition" | "reconcile" | "map";
```
## `SelectionOperation`

```ts
type SelectionOperation = "replace" | "extend" | "toggle" | "add" | "subtract";
```
## `SelectionRange`

```ts
interface SelectionRange<Point> {
  readonly anchor: Point;
  readonly focus: Point;
}
```
## `selectionResult`

```ts
selectionResult<State>(previous: State, state: State, lifecycle: SelectionLifecycle, equal: (left: State, right: State) => boolean): SelectionResult<State, SelectionChange>
```
## `SelectionResult`

```ts
interface SelectionResult<State, Change = unknown> {
  readonly state: State;
  readonly changed: boolean;
  readonly change?: Change;
}
```
