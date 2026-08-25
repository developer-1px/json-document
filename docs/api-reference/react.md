# @interactive-os/json-document-react API

**Owner:** Connector

React lifecycle connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `DocumentTextControl`

```ts
DocumentTextControl({ text, offset, onCaretRange, onTextInput, onClickCount, style, ...textareaProps }: DocumentTextControlProps): React.DetailedReactHTMLElement<{ ref: { readonly current: HTMLTextAreaElement | null; }; style: { accentColor?: CSS.Property.AccentColor | undefined; ... 855 more ...; glyphOrientationVertical?: CSS.Property.GlyphOrientationVertical | undefined; }; ... 290 more ...; onTransitionStartCapture?: React.TransitionEventHandler<...>; }, HTMLTextAreaElement>
```
## `DocumentTextControlBinding`

```ts
interface DocumentTextControlBinding {
  readonly ref: { readonly current: HTMLTextAreaElement | null };
  readonly props: Pick<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onFocus" | "onClick" | "onSelect" | "onChange" | "style"
  >;
}
```
## `DocumentTextControlProps`

```ts
interface DocumentTextControlProps extends UseDocumentTextControlOptions, Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onFocus" | "onClick" | "onSelect" | "onChange"
> {}
```
## `Editing`

```ts
interface Editing<Selection extends JSONValue, Key extends string = string> {
  readonly snapshot: EditingSnapshot<Selection>;
  getItem(key: Key): EditingItem<Key>;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
}
```
## `EditingItem`

```ts
interface EditingItem<Key extends string = string> {
  getIsSelected(): boolean;
  getIsFocus(): boolean;
  getTextOffset(): number | null;
  getPressHandler(): (event: EditingPressEvent) => void;
}
```
## `editingItemProps`

```ts
editingItemProps(item: EditingItem): EditingItemProps
```
## `EditingItemProps`

```ts
interface EditingItemProps {
  readonly selected: boolean;
  readonly focus: boolean;
  readonly onClick: (event: EditingPressEvent) => void;
}
```
## `EditingKeyboardCommand`

```ts
type EditingKeyboardCommand =
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
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" };
```
## `EditingKeyboardOptions`

```ts
interface EditingKeyboardOptions<Key extends string = string> {
  readonly resolve: (stroke: EditingKeyboardStroke) => EditingKeyboardCommand | null;
  readonly focusKey: () => Key | undefined;
  readonly neighbor: (
    key: Key,
    command: Extract<EditingKeyboardCommand, { readonly type: "move" } | { readonly type: "boundary" }>,
  ) => Key | null;
  readonly onDelete?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (key: Key) => void;
  readonly text?: {
    readonly offset: () => number;
    readonly length: () => number;
    readonly onOffset: (offset: number, mode: "replace" | "extend") => void;
  };
  readonly ignoreCommand?: (
    command: EditingKeyboardCommand,
    context: { readonly inField: boolean; readonly event: EditingKeyDownEvent },
  ) => boolean;
}
```
## `EditingKeyboardStroke`

```ts
interface EditingKeyboardStroke {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey?: boolean;
}
```
## `EditingKeyDownEvent`

```ts
interface EditingKeyDownEvent extends EditingKeyboardStroke {
  readonly target: EventTarget | null;
  preventDefault(): void;
}
```
## `EditingObservation`

```ts
type EditingObservation<Intent> = {
  readonly announcement: string;
  readonly lastIntent: Intent | null;
  readonly lastResult: EditingObservedResult | null;
  readonly announce: (message: string) => void;
  readonly dispatch: <Result extends EditingOperationResult>(
    intent: Intent,
    action: (intent: Intent) => Result,
    success: EditingResultMessage<Result>,
    failure?: EditingResultMessage<Result>,
  ) => Result;
  readonly observe: <Result extends EditingOperationResult>(intent: Intent, result: Result) => Result;
  readonly observeResult: <Result extends EditingOperationResult>(result: Result) => Result;
  readonly run: <Result extends EditingOperationResult>(
    action: () => Result,
    success: EditingResultMessage<Result>,
    failure: EditingResultMessage<Result>,
  ) => Result;
};
```
## `EditingObservedResult`

```ts
type EditingObservedResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string };
```
## `EditingOperationResult`

```ts
type EditingOperationResult = { readonly ok: boolean; readonly code?: string };
```
## `EditingPressEvent`

```ts
interface EditingPressEvent {
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly target?: EventTarget | null;
}
```
## `EditingResultMessage`

```ts
type EditingResultMessage<Result extends EditingOperationResult> =
  | string
  | ((result: Result) => string);
```
## `EditingSelectionMode`

```ts
type EditingSelectionMode = "replace" | "extend" | "toggle";
```
## `EditingSnapshot`

```ts
interface EditingSnapshot<Selection extends JSONValue> {
  readonly value: JSONValue;
  readonly selection: Selection;
  readonly revision: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}
```
## `EditingSnapshotSource`

```ts
interface EditingSnapshotSource<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}
```
## `ElementFocusControl`

```ts
type ElementFocusControl = Pick<HTMLElement, "focus">;
```
## `GridEditing`

```ts
interface GridEditing<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  getCell(point: GridPoint): EditingItem;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
}
```
## `GridEditingKeyboardOptions`

```ts
interface GridEditingKeyboardOptions {
  readonly resolve: EditingKeyboardOptions<string>["resolve"];
  readonly focusPoint: () => GridPoint | undefined;
  readonly neighbor: (
    point: GridPoint,
    command: Extract<EditingKeyboardCommand, { readonly type: "move" } | { readonly type: "boundary" }>,
  ) => GridPoint | null;
  readonly onDelete?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (point: GridPoint) => void;
  readonly ignoreCommand?: EditingKeyboardOptions<string>["ignoreCommand"];
}
```
## `restoreTextCursor`

```ts
restoreTextCursor(control: TextCursorControl, offset: number): void
```
## `selectionModeFromModifiers`

```ts
selectionModeFromModifiers(event: EditingPressEvent): EditingSelectionMode
```
## `TextCursorControl`

```ts
type TextCursorControl = Pick<HTMLInputElement, "value" | "setSelectionRange">;
```
## `TreeEditing`

```ts
interface TreeEditing<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  readonly visibility: TreeVisibility;
  readonly expandedIds: ReadonlySet<string>;
  getItem(nodeId: string): EditingItem;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
  isExpanded(nodeId: string): boolean;
  expand(nodeId: string): void;
  collapse(nodeId: string): void;
  toggle(nodeId: string): void;
}
```
## `TreeEditingKeyboardOptions`

```ts
interface TreeEditingKeyboardOptions {
  readonly resolve: EditingKeyboardOptions<string>["resolve"];
  readonly focusNodeId: () => string | undefined;
  readonly onDelete?: (topology: TreeTopology) => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (nodeId: string) => void;
  readonly ignoreCommand?: EditingKeyboardOptions<string>["ignoreCommand"];
}
```
## `useDocumentEditor`

```ts
useDocumentEditor(initial: BlockDocument, options?: { readonly createId?: () => string; }): DocumentEditor
```
## `useDocumentTextControl`

```ts
useDocumentTextControl(options: UseDocumentTextControlOptions): DocumentTextControlBinding
```
## `UseDocumentTextControlOptions`

```ts
interface UseDocumentTextControlOptions {
  readonly text: string;
  readonly offset: number | null;
  readonly onCaretRange: (from: number, to: number, mode: "replace" | "extend") => void;
  readonly onTextInput: (input: WebTextInput) => void;
  readonly onClickCount?: (count: number) => void;
}
```
## `useEditing`

```ts
useEditing<Selection extends JSONValue, Key extends string = string>(options: UseEditingOptions<Selection, Key>): Editing<Selection, Key>
```
## `useEditingObservation`

```ts
useEditingObservation<Intent>(initialAnnouncement: string): EditingObservation<Intent>
```
## `UseEditingOptions`

```ts
interface UseEditingOptions<Selection extends JSONValue, Key extends string = string> {
  readonly source?: EditingSnapshotSource<Selection>;
  readonly selectedKeys: Iterable<Key>;
  readonly focusKey?: Key | null;
  readonly textOffset?: number | null;
  readonly onSelect: (key: Key, mode: EditingSelectionMode) => void;
  readonly operationFromEvent?: (event: EditingPressEvent) => EditingSelectionMode;
  readonly ignorePress?: (event: EditingPressEvent) => boolean;
  readonly keyboard?: EditingKeyboardOptions<Key>;
}
```
## `useEditingSnapshot`

```ts
useEditingSnapshot<Selection extends JSONValue>(source: EditingSnapshotSource<Selection>): EditingSnapshot<Selection>
```
## `useGridEditing`

```ts
useGridEditing<Selection extends JSONValue>(options: UseGridEditingOptions<Selection>): GridEditing<Selection>
```
## `UseGridEditingOptions`

```ts
interface UseGridEditingOptions<Selection extends JSONValue> {
  readonly source?: EditingSnapshotSource<Selection>;
  readonly selectedPoints: Iterable<GridPoint>;
  readonly focusPoint?: GridPoint | null;
  readonly onSelect: (point: GridPoint, mode: EditingSelectionMode) => void;
  readonly operationFromEvent?: UseEditingOptions<Selection>["operationFromEvent"];
  readonly ignorePress?: UseEditingOptions<Selection>["ignorePress"];
  readonly keyboard?: GridEditingKeyboardOptions;
}
```
## `useJSONDocumentValue`

```ts
useJSONDocumentValue(document: JSONDocument): JSONValue
```
## `useReactConnector`

```ts
useReactConnector(document: JSONDocument): JSONValue
```
## `useRestoreElementFocus`

```ts
useRestoreElementFocus(control: { readonly current: ElementFocusControl | null; }, focused: boolean): void
```
## `useRestoreTextCursor`

```ts
useRestoreTextCursor(control: { readonly current: TextCursorControl | null; }, offset: number | null): void
```
## `useTreeEditing`

```ts
useTreeEditing<Selection extends JSONValue>(options: UseTreeEditingOptions<Selection>): TreeEditing<Selection>
```
## `UseTreeEditingOptions`

```ts
interface UseTreeEditingOptions<Selection extends JSONValue> {
  readonly source?: EditingSnapshotSource<Selection>;
  readonly nodes: ReadonlyArray<TreeNode>;
  readonly initialExpandedIds?: Iterable<string>;
  readonly selectedNodeIds: (topology: TreeTopology) => Iterable<string>;
  readonly focusNodeId?: string | null;
  readonly onSelect: (nodeId: string, mode: EditingSelectionMode, topology: TreeTopology) => void;
  readonly operationFromEvent?: UseEditingOptions<Selection>["operationFromEvent"];
  readonly ignorePress?: UseEditingOptions<Selection>["ignorePress"];
  readonly keyboard?: TreeEditingKeyboardOptions;
}
```
