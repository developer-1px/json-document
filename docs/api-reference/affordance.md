# @interactive-os/json-document-affordance API

**Owner:** Affordance

입력 문법과 interaction session의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-affordance/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `activateAffordance`

```ts
activateAffordance(input: WebPressInteraction | Extract<AffordanceHand, { readonly type: "press"; }> | null): AffordancePreview
```
## `AffordanceCommit`

```ts
type AffordanceCommit<H extends AffordanceHand = AffordanceHand> = {
  readonly hand: H;
  readonly cursor?: string;
  readonly commit: true;
};
```
## `AffordanceCommitActions`

```ts
type AffordanceCommitActions<H extends AffordanceHand = AffordanceHand> =
  & AffordancePreviewActions<H>
  & {
    readonly commit?: (hand: H) => void;
  };
```
## `AffordanceHand`

```ts
type AffordanceHand =
  | {
    readonly type: "select";
    readonly operation: SelectOperation;
    readonly rect?: AffordanceRect;
    readonly objectIds?: ReadonlyArray<string>;
  }
  | { readonly type: "move"; readonly direction: AffordanceMoveDirection; readonly operation: "replace" | "extend" }
  | { readonly type: "boundary"; readonly edge: "start" | "end"; readonly operation: "replace" | "extend" }
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "expand" }
  | { readonly type: "collapse" }
  | { readonly type: "translate"; readonly dx: number; readonly dy: number }
  | { readonly type: "nudge"; readonly dx: number; readonly dy: number }
  | {
    readonly type: "resize";
    readonly dx: number;
    readonly dy: number;
    readonly dw: number;
    readonly dh: number;
    readonly edge: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
  }
  | { readonly type: "zoom"; readonly factor: number }
  | { readonly type: "select-all" }
  | { readonly type: "clear" }
  | { readonly type: "typeahead"; readonly buffer: string; readonly name: string | null }
  | { readonly type: "click"; readonly count: number }
  | { readonly type: "caret"; readonly action: "place" | "range"; readonly operation: "replace" | "extend" }
  | {
    readonly type: "caret-move";
    readonly direction?: AffordanceMoveDirection;
    readonly edge?: "start" | "end";
    readonly operation: "replace" | "extend";
  }
  | { readonly type: "rename"; readonly action: "begin" | "commit" | "cancel" }
  | { readonly type: "activate" }
  | {
    readonly type: "press";
    readonly phase: "start" | "end" | "cancel";
    readonly source: "pointer";
  }
  | {
    readonly type: "press";
    readonly phase: "start" | "end" | "cancel";
    readonly source: "keyboard";
    readonly key: "Enter" | "Space";
  }
  | { readonly type: "cancel" }
  | { readonly type: "tab"; readonly direction: "next" | "prev" }
  | { readonly type: "hover"; readonly phase: "hint" | "tooltip" | "highlight" }
  | { readonly type: "copy" }
  | { readonly type: "move-drop"; readonly keepSelection: true }
  | { readonly type: "menu"; readonly action: "open" | "cancel" }
  | {
    readonly type: "history";
    readonly undo: { readonly name: "undo"; readonly disabled: boolean };
    readonly redo: { readonly name: "redo"; readonly disabled: boolean };
  };
```
## `AffordanceMoveDirection`

```ts
type AffordanceMoveDirection = "previous" | "next" | "up" | "down" | "left" | "right";
```
## `AffordancePreview`

```ts
type AffordancePreview<H extends AffordanceHand = AffordanceHand> = {
  readonly hand: H | null;
  readonly cursor?: string;
};
```
## `AffordancePreviewActions`

```ts
type AffordancePreviewActions<H extends AffordanceHand = AffordanceHand> = {
  readonly cursor?: (cursor: string) => void;
  readonly hand?: (hand: H) => void;
};
```
## `AffordanceRect`

```ts
type AffordanceRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};
```
## `AffordanceResult`

```ts
type AffordanceResult<H extends AffordanceHand = AffordanceHand> =
  | AffordancePreview<H>
  | AffordanceCommit<H>;
```
## `applyAffordance`

```ts
applyAffordance<H extends AffordanceHand>(result: AffordanceCommit<H>, actions: AffordanceCommitActions<H>): void
applyAffordance<H extends AffordanceHand>(result: AffordancePreview<H>, actions: AffordancePreviewActions<H>): void
```
## `BoardDragCancelReason`

```ts
type BoardDragCancelReason = "cancel" | "drop-rejected" | "superseded";
```
## `BoardDragSession`

```ts
interface BoardDragSession<Item, Target> {
  getSnapshot(): BoardDragSnapshot<Item, Target>;
  begin(item: Item): BoardDragSnapshot<Item, Target>;
  preview(target: Target | null): BoardDragSnapshot<Item, Target>;
  commit(): BoardDrop<Item, Target> | null;
  cancel(reason?: BoardDragCancelReason): Item | null;
}
```
## `BoardDragSessionOptions`

```ts
interface BoardDragSessionOptions<Item, Target> {
  readonly onBegin?: (item: Item) => void;
  readonly onPreview?: (item: Item, target: Target | null) => void;
  readonly onCommit?: (drop: BoardDrop<Item, Target>) => void;
  readonly onCancel?: (item: Item, reason: BoardDragCancelReason) => void;
}
```
## `BoardDragSnapshot`

```ts
type BoardDragSnapshot<Item, Target> =
  | { readonly status: "idle"; readonly item: null; readonly target: null }
  | { readonly status: "dragging"; readonly item: Item; readonly target: Target | null };
```
## `BoardDrop`

```ts
interface BoardDrop<Item, Target> {
  readonly item: Item;
  readonly target: Target;
}
```
## `CanvasGestureCancelReason`

```ts
type CanvasGestureCancelReason = GestureCancelReason;
```
## `CanvasGestureSession`

```ts
type CanvasGestureSession<Gesture extends CanvasGestureState> = GestureSession<Gesture>;
```
## `CanvasGestureSessionOptions`

```ts
type CanvasGestureSessionOptions<Gesture extends CanvasGestureState> = GestureSessionOptions<Gesture>;
```
## `CanvasGestureState`

```ts
interface CanvasGestureState {
  readonly type: CanvasGestureType;
}
```
## `CanvasGestureType`

```ts
type CanvasGestureType = "drag" | "marquee" | "pan" | "resize";
```
## `caretAffordance`

```ts
caretAffordance(input: { readonly type: "pointer"; readonly dragging?: boolean; } | Pick<WebKeyboardStroke, "key" | "shiftKey">): AffordancePreview
```
## `caretCursor`

```ts
caretCursor(direction: "horizontal" | "vertical"): "text" | "vertical-text"
```
## `clickCountAffordance`

```ts
clickCountAffordance(detail: number): AffordancePreview
```
## `commitAffordance`

```ts
commitAffordance<H extends AffordanceHand>(result: AffordancePreview<H>): AffordanceCommit<H> | null
```
## `contextMenuAffordance`

```ts
contextMenuAffordance(input: { readonly type?: string; readonly button?: number; readonly key?: string; readonly shiftKey?: boolean; }): AffordancePreview
```
## `createBoardDragSession`

```ts
createBoardDragSession<Item, Target>(options?: BoardDragSessionOptions<Item, Target>): BoardDragSession<Item, Target>
```
## `createCanvasGestureSession`

```ts
createCanvasGestureSession<Gesture extends CanvasGestureState>(options?: CanvasGestureSessionOptions<Gesture>): CanvasGestureSession<Gesture>
```
## `createGestureSession`

```ts
createGestureSession<Gesture extends GestureState>(options?: GestureSessionOptions<Gesture>): GestureSession<Gesture>
```
## `createLineFocusSession`

```ts
createLineFocusSession<Key extends string>(options: { readonly initialKey?: Key | null; readonly onFocus: (key: Key | null) => void; readonly wrap?: boolean; }): LineFocusSession<Key>
```
## `createRenameSession`

```ts
createRenameSession<Key>(options: { readonly onCommit: (key: Key, draft: string) => void; readonly onFinish?: (key: Key) => void; readonly onSnapshot?: (snapshot: RenameSessionSnapshot<Key> | null) => void; }): RenameSession<Key>
```
## `createTypeaheadSession`

```ts
createTypeaheadSession<Key>(options: { readonly onMatch: (key: Key) => void; readonly onSnapshot?: (snapshot: TypeaheadSessionSnapshot) => void; }): TypeaheadSession<Key>
```
## `createViewportPositionSession`

```ts
createViewportPositionSession<Key>(options: ViewportPositionOptions<Key>): ViewportPositionSession<Key>
```
## `deleteAffordance`

```ts
deleteAffordance(input: { readonly key?: string; }): AffordancePreview
```
## `disclosureAffordance`

```ts
disclosureAffordance(input: { readonly key: string; readonly expanded: boolean; }): AffordancePreview
```
## `dragAffordance`

```ts
dragAffordance(origin: Point, point: Point, modifiers?: { readonly shiftKey?: boolean; readonly altKey?: boolean; }): AffordancePreview
```
## `dragOperation`

```ts
dragOperation(modifiers: WebModifierState & { readonly altKey?: boolean; }): AffordancePreview
```
## `dropAffordance`

```ts
dropAffordance(input: { readonly canDrop: boolean; readonly operation?: "move" | "copy"; }): AffordancePreview
```
## `editingCommandFromWebKeyboardStroke`

```ts
editingCommandFromWebKeyboardStroke(stroke: WebKeyboardStroke): WebKeyboardCommand | null
```
## `escapeAffordance`

```ts
escapeAffordance(input: { readonly key?: string; readonly type?: string; readonly grabbing?: boolean; readonly selected?: boolean; }): AffordancePreview
```
## `focusAffordance`

```ts
focusAffordance(stroke: Pick<WebKeyboardStroke, "key" | "shiftKey">): AffordancePreview
```
## `forbiddenCursor`

```ts
forbiddenCursor(input: { readonly allowed: boolean; readonly dropping?: boolean; }): AffordancePreview
```
## `GestureCancelReason`

```ts
type GestureCancelReason = "cancel" | "pointer-cancel" | "lost-capture" | "superseded";
```
## `GestureSession`

```ts
interface GestureSession<Gesture extends GestureState> {
  getActive(): Gesture | null;
  begin(gesture: Gesture): Gesture;
  preview(update: Gesture | ((gesture: Gesture) => Gesture)): Gesture | null;
  commit(): Gesture | null;
  cancel(reason?: GestureCancelReason): Gesture | null;
}
```
## `GestureSessionOptions`

```ts
interface GestureSessionOptions<Gesture extends GestureState> {
  readonly onBegin?: (gesture: Gesture) => void;
  readonly onPreview?: (gesture: Gesture) => void;
  readonly onCommit?: (gesture: Gesture) => void;
  readonly onCancel?: (gesture: Gesture, reason: GestureCancelReason) => void;
}
```
## `GestureState`

```ts
interface GestureState {
  readonly type: string;
}
```
## `historyAffordance`

```ts
historyAffordance(snapshot: { readonly canUndo: boolean; readonly canRedo: boolean; }): HistoryAffordanceResult
```
## `HistoryAffordance`

```ts
type HistoryAffordance<Name extends HistoryAffordanceName = HistoryAffordanceName> = {
  readonly name: Name;
  readonly disabled: boolean;
};
```
## `HistoryAffordanceMap`

```ts
type HistoryAffordanceMap = {
  readonly undo: HistoryAffordance<"undo">;
  readonly redo: HistoryAffordance<"redo">;
};
```
## `HistoryAffordanceName`

```ts
type HistoryAffordanceName = "undo" | "redo";
```
## `HistoryAffordanceResult`

```ts
type HistoryAffordanceResult = AffordancePreview<HistoryAffordanceHand> & {
  readonly hand: HistoryAffordanceHand;
};
```
## `hoverAffordance`

```ts
hoverAffordance(input: { readonly elapsedMs: number; readonly inside: boolean; readonly delayMs?: number; readonly highlight?: boolean; }): AffordancePreview
```
## `LineFocusSession`

```ts
interface LineFocusSession<Key extends string> {
  getFocusKey(): Key | null;
  setFocus(key: Key | null): void;
  handle(input: { readonly key: string; readonly shiftKey: boolean }, keys: ReadonlyArray<Key>): boolean;
}
```
## `marqueeAffordance`

```ts
marqueeAffordance(origin: Point, point: Point, modifiers?: { readonly shiftKey?: boolean; readonly nested?: boolean; }): AffordancePreview
```
## `marqueeHitsAffordance`

```ts
marqueeHitsAffordance(input: { readonly rect: Rect; readonly items: ReadonlyArray<{ readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; }>; readonly contain?: "intersect" | "inside"; }): AffordancePreview
```
## `nudgeAffordance`

```ts
nudgeAffordance(stroke: { readonly key: string; readonly shiftKey: boolean; }): AffordancePreview
```
## `panAffordance`

```ts
panAffordance(input: { readonly spaceKey?: boolean; readonly buttons?: number; readonly origin?: Point; readonly point?: Point; readonly key?: string; readonly selected?: boolean; }): AffordancePreview
```
## `planeHitAffordance`

```ts
planeHitAffordance(input: { readonly hitId: string; readonly selectedIds: ReadonlyArray<string>; readonly shiftKey?: boolean; readonly metaKey?: boolean; readonly ctrlKey?: boolean; readonly nestedId?: string; readonly locked?: boolean; }): AffordancePreview
```
## `Point`

```ts
type Point = {
  readonly x: number;
  readonly y: number;
};
```
## `pointerSelect`

```ts
pointerSelect(modifiers: { readonly shiftKey?: boolean; readonly metaKey?: boolean; readonly ctrlKey?: boolean; }): AffordancePreview
```
## `pressAffordance`

```ts
pressAffordance(interaction: WebPressInteraction | null, state: PressAffordanceState, options?: { readonly disabled?: boolean; }): PressAffordanceResult
```
## `PressAffordanceResult`

```ts
type PressAffordanceResult = AffordancePreview & {
  readonly state: PressAffordanceState;
};
```
## `PressAffordanceState`

```ts
type PressAffordanceState =
  | { readonly status: "idle" }
  | { readonly status: "active"; readonly source: "pointer" }
  | { readonly status: "active"; readonly source: "keyboard"; readonly key: "Enter" | "Space" };
```
## `Rect`

```ts
type Rect = AffordanceRect;
```
## `renameAffordance`

```ts
renameAffordance(input: Pick<WebKeyboardStroke, "key"> | { readonly type: "pointer"; readonly detail: number; readonly intervalMs: number; readonly slowMs?: number; }): AffordancePreview
```
## `RenameSession`

```ts
interface RenameSession<Key> {
  getSnapshot(): RenameSessionSnapshot<Key> | null;
  begin(key: Key, label: string): void;
  update(draft: string): void;
  handleKey(key: string): boolean;
  handlePointer(key: Key, label: string, detail: number, timeStamp: number): boolean;
  commit(): void;
  cancel(): void;
}
```
## `RenameSessionSnapshot`

```ts
interface RenameSessionSnapshot<Key> {
  readonly key: Key;
  readonly draft: string;
}
```
## `resizeAffordance`

```ts
resizeAffordance(origin: Point, point: Point, edge: ResizeEdge, modifiers?: { readonly shiftKey?: boolean; readonly altKey?: boolean; }): AffordancePreview
```
## `ResizeEdge`

```ts
type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
```
## `resolveAffordanceKey`

```ts
resolveAffordanceKey(stroke: WebKeyboardStroke): AffordancePreview
```
## `selectAllAffordance`

```ts
selectAllAffordance(stroke: Pick<WebKeyboardStroke, "key" | "metaKey" | "ctrlKey">, state: { readonly allSelected: boolean; }): AffordancePreview
```
## `SelectOperation`

```ts
type SelectOperation = "replace" | "extend" | "toggle";
```
## `snapAffordance`

```ts
snapAffordance(point: Point, options: { readonly grid: number; readonly disable?: boolean; }): AffordancePreview
```
## `treeAffordance`

```ts
treeAffordance(command: { readonly type: "move"; readonly direction: TreeMoveDirection; }, node: TreeFoldNode): AffordancePreview
```
## `TreeAffordance`

```ts
type TreeAffordance =
  | { readonly type: "expand" }
  | { readonly type: "collapse" }
  | { readonly type: "move"; readonly direction: TreeMoveDirection };
```
## `TreeFoldNode`

```ts
type TreeFoldNode = {
  readonly expanded: boolean;
  readonly hasChildren: boolean;
};
```
## `TreeMoveDirection`

```ts
type TreeMoveDirection = "up" | "down" | "left" | "right" | "previous" | "next";
```
## `typeaheadAffordance`

```ts
typeaheadAffordance(input: { readonly buffer: string; readonly key: string; readonly metaKey?: boolean; readonly ctrlKey?: boolean; readonly altKey?: boolean; readonly elapsedMs: number; readonly names: ReadonlyArray<string>; readonly from: string | null; readonly windowMs?: number; }): AffordancePreview
```
## `TypeaheadSession`

```ts
interface TypeaheadSession<Key> {
  getSnapshot(): TypeaheadSessionSnapshot;
  handle(input: TypeaheadSessionInput<Key>): boolean;
  reset(): void;
}
```
## `TypeaheadSessionInput`

```ts
interface TypeaheadSessionInput<Key> {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly timeStamp: number;
  readonly items: ReadonlyArray<{ readonly key: Key; readonly name: string }>;
  readonly fromKey: Key | null;
}
```
## `TypeaheadSessionSnapshot`

```ts
interface TypeaheadSessionSnapshot {
  readonly buffer: string;
  readonly at: number;
}
```
## `ViewportPositionCancelReason`

```ts
type ViewportPositionCancelReason = "cancel" | "missing-target" | "target-left-viewport";
```
## `ViewportPositionGeometry`

```ts
interface ViewportPositionGeometry {
  readonly targetOffset: number;
  readonly tailReserveOffset: number;
  readonly viewportHeight: number;
}
```
## `ViewportPositionOptions`

```ts
interface ViewportPositionOptions<Key> extends ViewportPositionPorts<Key> {
  readonly onCancel?: (reason: ViewportPositionCancelReason) => void;
  readonly onChange?: (snapshot: ViewportPositionSnapshot<Key>) => void;
}
```
## `ViewportPositionPorts`

```ts
interface ViewportPositionPorts<Key> {
  readonly measure: (key: Key) => ViewportPositionGeometry | null;
  readonly setTailReserve: (key: Key, height: number) => boolean;
  readonly scrollTo: (top: number, behavior: "smooth" | "instant") => void;
  readonly scheduleFrame: (callback: () => void) => () => void;
}
```
## `ViewportPositionSession`

```ts
interface ViewportPositionSession<Key> {
  getSnapshot(): ViewportPositionSnapshot<Key>;
  position(targetKey: Key, viewportOffset: number): void;
  layoutChanged(): void;
  targetVisibilityChanged(visible: boolean): void;
  complete(): void;
  cancel(reason?: ViewportPositionCancelReason): void;
}
```
## `ViewportPositionSnapshot`

```ts
interface ViewportPositionSnapshot<Key> {
  readonly active: boolean;
  readonly applyingScroll: boolean;
  readonly owned: boolean;
  readonly tailReserve: number;
  readonly targetKey: Key | null;
  readonly viewportOffset: number | null;
}
```
## `wheelAffordance`

```ts
wheelAffordance(input: { readonly deltaX?: number; readonly deltaY?: number; readonly metaKey?: boolean; readonly ctrlKey?: boolean; }): AffordancePreview
```
## `zoomAffordance`

```ts
zoomAffordance(input: { readonly key?: string; }): AffordancePreview
```
