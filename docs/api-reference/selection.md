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
## `createRangeSelectionFamily`

```ts
createRangeSelectionFamily<Point, Target = Point>(): SelectionFamily<RangeSelection<Point>, RangeSelectionCommand<Point>, RangeSelectionContext<Point, Target>, RangeSelectionMapping<Point>, Target, SelectionChange>
```
## `EditingMode`

```ts
type EditingMode<Lease extends string = string> =
  | { readonly kind: "navigate" }
  | { readonly kind: "edit"; readonly lease: Lease };
```
## `emptyKeySelection`

```ts
emptyKeySelection<Key extends string = string>(): KeySelection<Key>
```
## `emptyRangeSelection`

```ts
emptyRangeSelection<Point>(): RangeSelection<Point>
```
## `idlePointerInteraction`

```ts
idlePointerInteraction<Point>(): PointerInteractionState<Point>
```
## `InteractionResult`

```ts
interface InteractionResult<State, Preview, Commit> {
  readonly state: State;
  readonly changed: boolean;
  readonly preview: Preview | null;
  readonly commit: Commit | null;
  readonly canceled: boolean;
}
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
## `MarqueeContext`

```ts
interface MarqueeContext<Key, Point, Region> {
  readonly regions: RegionBuilder<Point, Region>;
  readonly spatialIndex: SpatialIndex<Key, Point, Region>;
  readonly hitMode: "intersects" | "contains";
}
```
## `MarqueeSelection`

```ts
interface MarqueeSelection<Key, Region> {
  readonly region: Region;
  readonly keys: readonly Key[];
  readonly operation: SelectionOperation;
}
```
## `MaskAlgebra`

```ts
interface MaskAlgebra<Representation, Region> {
  empty(): Representation;
  replace(region: Region): Representation;
  union(mask: Representation, region: Region): Representation;
  subtract(mask: Representation, region: Region): Representation;
  intersect(mask: Representation, region: Region): Representation;
  xor(mask: Representation, region: Region): Representation;
  isEmpty(mask: Representation): boolean;
}
```
## `MaskSelection`

```ts
interface MaskSelection<Representation> {
  readonly kind: "mask";
  readonly representation: Representation;
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
## `NavigationContext`

```ts
interface NavigationContext<Point, SelectionCommand, Activation = unknown> {
  move(
    current: Point | null,
    direction: Extract<NavigationCommand, { readonly type: "move" }>["direction"],
  ): Point | null;
  boundary(edge: "start" | "end"): Point | null;
  select(point: Point, operation: "replace" | "extend"): SelectionCommand;
  activate(point: Point): Activation;
}
```
## `NavigationResult`

```ts
interface NavigationResult<Point, SelectionCommand, Activation> {
  readonly navigation: NavigationState<Point>;
  readonly selectionCommand: SelectionCommand | null;
  readonly activation: Activation | null;
  readonly canceled: boolean;
  readonly changed: boolean;
}
```
## `NavigationState`

```ts
interface NavigationState<Point> {
  readonly current: Point | null;
}
```
## `normalizeKeySelection`

```ts
normalizeKeySelection<Key extends string>(state: KeySelection<Key>, context: KeySelectionContext<Key>): KeySelection<Key>
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
## `PointerInteractionState`

```ts
type PointerInteractionState<Point> =
  | { readonly kind: "idle" }
  | {
      readonly kind: "active";
      readonly pointerId: string;
      readonly start: Point;
      readonly current: Point;
      readonly operation: SelectionOperation;
    };
```
## `PointerSample`

```ts
type PointerSample<Point> =
  | {
      readonly phase: "start";
      readonly pointerId: string;
      readonly point: Point;
      readonly operation: SelectionOperation;
    }
  | { readonly phase: "move"; readonly pointerId: string; readonly point: Point }
  | { readonly phase: "end"; readonly pointerId: string; readonly point: Point }
  | { readonly phase: "cancel"; readonly pointerId: string };
```
## `PressSelection`

```ts
interface PressSelection<Point> {
  readonly point: Point;
  readonly operation: SelectionOperation;
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
## `reduceMarqueeInteraction`

```ts
reduceMarqueeInteraction<Key, Point, Region>(state: PointerInteractionState<Point>, sample: PointerSample<Point>, context: MarqueeContext<Key, Point, Region>): InteractionResult<PointerInteractionState<Point>, MarqueeSelection<Key, Region>, MarqueeSelection<Key, Region>>
```
## `reduceNavigation`

```ts
reduceNavigation<Point, SelectionCommand, Activation = unknown>(state: NavigationState<Point>, command: NavigationCommand, context: NavigationContext<Point, SelectionCommand, Activation>): NavigationResult<Point, SelectionCommand, Activation>
```
## `reducePressInteraction`

```ts
reducePressInteraction<Point>(state: PointerInteractionState<Point>, sample: PointerSample<Point>): InteractionResult<PointerInteractionState<Point>, PressSelection<Point>, PressSelection<Point>>
```
## `RegionBuilder`

```ts
interface RegionBuilder<Point, Region> {
  fromPoints(start: Point, current: Point): Region;
}
```
## `ScopedSelection`

```ts
interface ScopedSelection<Scope extends string, Selection> {
  readonly scope: Scope;
  readonly selection: Selection;
}
```
## `SelectionChange`

```ts
interface SelectionChange {
  readonly lifecycle: SelectionLifecycle;
}
```
## `SelectionEditIntent`

```ts
interface SelectionEditIntent<Selection, Intent> {
  readonly selection: Selection;
  readonly intent: Intent;
}
```
## `SelectionEditResult`

```ts
interface SelectionEditResult<Selection, Patch> {
  readonly forward: readonly Patch[];
  readonly inverse: readonly Patch[];
  readonly selectionAfter: Selection;
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
## `SelectionSession`

```ts
interface SelectionSession<Selection, Point, Lease extends string = string> {
  readonly selection: Selection;
  readonly navigation: NavigationState<Point>;
  readonly editing: EditingMode<Lease>;
}
```
## `SpatialIndex`

```ts
interface SpatialIndex<Key, Point, Region> {
  hitPoint(point: Point, mode: "topmost" | "deepest"): Key | null;
  hitRegion(region: Region, mode: "intersects" | "contains"): readonly Key[];
}
```
