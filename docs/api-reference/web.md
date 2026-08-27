# @interactive-os/json-document-web API

**Owner:** Adapter

Web platform adapter의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-web/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `activeDescendantContainerProps`

```ts
activeDescendantContainerProps(activeId: string | null): Readonly<{ tabIndex: 0; "aria-activedescendant"?: string; }>
```
## `activeDescendantItemProps`

```ts
activeDescendantItemProps(id: string): Readonly<{ id: string; }>
```
## `chordFromStroke`

```ts
chordFromStroke(stroke: WebKeyboardStroke): string
```
## `composerAttachmentCandidateFromWebFile`

```ts
composerAttachmentCandidateFromWebFile(file: WebFileCandidate): FileCandidate
```
## `composerAttachmentCandidatesFromWebClipboard`

```ts
composerAttachmentCandidatesFromWebClipboard(event: WebFileClipboardEvent): ReadonlyArray<FileCandidate>
```
## `composerAttachmentCandidatesFromWebFiles`

```ts
composerAttachmentCandidatesFromWebFiles(files: WebFileCandidateList | ReadonlyArray<WebFileCandidate>): ReadonlyArray<FileCandidate>
```
## `createWebClipboardBinding`

```ts
createWebClipboardBinding<Payload extends WebClipboardPayload, EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string; }>(options: WebClipboardBindingOptions<Payload, EditingResult>): WebClipboardBinding<Payload, EditingResult>
```
## `createWebClipboardSurface`

```ts
createWebClipboardSurface<Payload extends WebClipboardPayload, EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string; }>(options: WebClipboardBindingOptions<Payload, EditingResult> & { readonly onResult: (result: WebClipboardResult<Payload, EditingResult>) => void; }): WebClipboardSurface<Payload, EditingResult>
```
## `createWebClipboardTextWriter`

```ts
createWebClipboardTextWriter(options?: { readonly clipboard?: WebClipboardTextPort | null; }): WebClipboardTextWriter
```
## `createWebDragDropSession`

```ts
createWebDragDropSession<Item, Target>(options?: WebDragDropSessionOptions<Item, Target>): WebDragDropSession<Item, Target>
```
## `createWebKeyboardAdapter`

```ts
createWebKeyboardAdapter(options?: { readonly keymap?: WebKeymap; }): WebKeyboardAdapter
```
## `createWebPointerSession`

```ts
createWebPointerSession<State>(options?: WebPointerSessionOptions<State>): WebPointerSession<State>
```
## `createWebViewportInteractionPorts`

```ts
createWebViewportInteractionPorts<Key>(options: WebViewportInteractionOptions<Key>): WebViewportInteractionPorts<Key>
```
## `databaseClipboardCodec`

```ts
const databaseClipboardCodec: WebClipboardCodec<DatabaseClipboard>
```
## `defaultWebKeymap`

```ts
const defaultWebKeymap: Readonly<Record<string, WebKeyboardCommand>>
```
## `documentClipboardCodec`

```ts
const documentClipboardCodec: WebClipboardCodec<DocumentClipboard>
```
## `fileCandidateFromWebFile`

```ts
fileCandidateFromWebFile(file: WebFileCandidate): FileCandidate
```
## `fileCandidatesFromWebClipboard`

```ts
fileCandidatesFromWebClipboard(event: WebFileClipboardEvent): ReadonlyArray<FileCandidate>
```
## `fileCandidatesFromWebFiles`

```ts
fileCandidatesFromWebFiles(files: WebFileCandidateList | ReadonlyArray<WebFileCandidate>): ReadonlyArray<FileCandidate>
```
## `findWebGridCell`

```ts
findWebGridCell<Cell extends WebGridCellAddressElement>(root: WebGridCellAddressRoot<Cell> | null, point: GridPoint): Cell | null
```
## `findWebKanbanCardDropTarget`

```ts
findWebKanbanCardDropTarget(point: { readonly x: number; readonly y: number; }, webDocument?: { elementFromPoint(x: number, y: number): WebKanbanTargetElement | null; }): KanbanCardDropTarget | null
```
## `focusWebItem`

```ts
focusWebItem<Item extends WebFocusableItem>(root: WebFocusItemRoot<Item> | null, key: string): Item | null
```
## `gridBoundary`

```ts
gridBoundary(topology: GridTopology, point: GridPoint, edge: "start" | "end"): GridPoint | null
```
## `kanbanCardDropTargetFromWebElement`

```ts
kanbanCardDropTargetFromWebElement(element: WebKanbanTargetElement | null): KanbanCardDropTarget | null
```
## `lineBoundary`

```ts
lineBoundary(ids: ReadonlyArray<string>, edge: "start" | "end"): string | null
```
## `moveGridPoint`

```ts
moveGridPoint(topology: GridTopology, point: GridPoint, direction: Extract<NavigationCommand, { readonly type: "move"; }>["direction"]): GridPoint | null
```
## `moveLinePoint`

```ts
moveLinePoint(ids: ReadonlyArray<string>, currentId: string, direction: Extract<NavigationCommand, { readonly type: "move"; }>["direction"]): string | null
```
## `objectClipboardCodec`

```ts
const objectClipboardCodec: WebClipboardCodec<ObjectClipboard>
```
## `orderClipboardCodec`

```ts
const orderClipboardCodec: WebClipboardCodec<OrderClipboard>
```
## `pressInteractionFromWeb`

```ts
pressInteractionFromWeb(input: WebPressInput): WebPressInteraction | null
```
## `projectWebClientPointToSVG`

```ts
projectWebClientPointToSVG(point: WebClientPoint, viewport: WebSVGViewport): WebClientPoint | null
```
## `projectWebWidgetState`

```ts
projectWebWidgetState(state: WebWidgetState): WebWidgetARIA
```
## `readWebRasterFile`

```ts
readWebRasterFile(file: WebRasterFile): Promise<WebRasterSourceResult>
```
## `renderWebAnnotationRaster`

```ts
renderWebAnnotationRaster(options: { readonly document: AnnotationDocument; readonly sourceId: string; readonly sourceURL: string; readonly style: WebAnnotationRasterStyle; }): Promise<WebAnnotationRasterResult>
```
## `rovingFocusItemProps`

```ts
rovingFocusItemProps(focused: boolean): Readonly<{ tabIndex: 0 | -1; }>
```
## `selectionOperationFromModifiers`

```ts
selectionOperationFromModifiers(modifiers: WebModifierState): Extract<SelectionOperation, "replace" | "extend" | "toggle">
```
## `sheetClipboardCodec`

```ts
const sheetClipboardCodec: WebClipboardCodec<SheetClipboard>
```
## `textInputFromControl`

```ts
textInputFromControl(event: WebTextControlEvent): WebTextInput
```
## `treeClipboardCodec`

```ts
const treeClipboardCodec: WebClipboardCodec<TreeClipboard>
```
## `WebAnnotationRasterResult`

```ts
type WebAnnotationRasterResult =
  | { readonly ok: true; readonly dataURL: string }
  | { readonly ok: false; readonly code: "raster.decode-failed" | "raster.context-unavailable" | "raster.encode-failed"; readonly reason?: string };
```
## `WebAnnotationRasterStyle`

```ts
interface WebAnnotationRasterStyle {
  readonly stroke: string;
  readonly fill: string;
  readonly lineWidth: number;
  readonly labelFont: string;
}
```
## `WebClientPoint`

```ts
interface WebClientPoint {
  readonly x: number;
  readonly y: number;
}
```
## `WebClipboardBinding`

```ts
interface WebClipboardBinding<Payload extends WebClipboardPayload, EditingResult> {
  copy(event: WebClipboardEvent): WebClipboardResult<Payload, EditingResult>;
  cut(event: WebClipboardEvent): WebClipboardResult<Payload, EditingResult>;
  paste(event: WebClipboardEvent): WebClipboardResult<Payload, EditingResult>;
}
```
## `WebClipboardBindingOptions`

```ts
interface WebClipboardBindingOptions<
  Payload extends WebClipboardPayload,
  EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string },
> {
  readonly codec: WebClipboardCodec<Payload>;
  readonly representations?: ReadonlyArray<WebClipboardRepresentation<Payload>>;
  readonly read: () => Payload | null;
  readonly cut?: (payload: Payload) => EditingResult;
  readonly paste: (payload: Payload) => EditingResult;
}
```
## `WebClipboardCodec`

```ts
interface WebClipboardCodec<Payload extends WebClipboardPayload> {
  readonly mimeType: Payload["type"];
  encode(payload: Payload): string;
  decode(serialized: string): Payload | null;
}
```
## `WebClipboardData`

```ts
interface WebClipboardData {
  readonly types: ReadonlyArray<string>;
  getData(format: string): string;
  setData(format: string, data: string): void;
}
```
## `WebClipboardEvent`

```ts
interface WebClipboardEvent {
  readonly clipboardData: WebClipboardData | null;
  preventDefault(): void;
}
```
## `WebClipboardPayload`

```ts
interface WebClipboardPayload {
  readonly type: string;
  readonly text: string;
}
```
## `WebClipboardRepresentation`

```ts
interface WebClipboardRepresentation<Payload extends WebClipboardPayload> {
  readonly mimeType: string;
  encode(payload: Payload): string;
  decode(serialized: string): Payload | null;
}
```
## `WebClipboardResult`

```ts
type WebClipboardResult<Payload extends WebClipboardPayload, EditingResult> =
  | { readonly ok: true; readonly operation: "copy"; readonly payload: Payload }
  | { readonly ok: true; readonly operation: "cut" | "paste"; readonly payload: Payload; readonly result: EditingResult }
  | { readonly ok: false; readonly code: "clipboard.unavailable" | "clipboard.empty" | "clipboard.invalid" | "clipboard.unsupported" | "editing.rejected"; readonly reason?: string };
```
## `WebClipboardSurface`

```ts
interface WebClipboardSurface<Payload extends WebClipboardPayload, EditingResult> {
  readonly onCopy: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
  readonly onCut: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
  readonly onPaste: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
}
```
## `WebClipboardTextPort`

```ts
interface WebClipboardTextPort {
  writeText(text: string): Promise<void>;
}
```
## `WebClipboardTextWriter`

```ts
interface WebClipboardTextWriter {
  writeText(text: string): Promise<WebClipboardWriteResult>;
}
```
## `WebClipboardWriteResult`

```ts
type WebClipboardWriteResult =
  | { readonly ok: true }
  | {
    readonly ok: false;
    readonly code: "clipboard.unsupported" | "clipboard.write-failed";
    readonly reason?: string;
  };
```
## `WebComposerClipboardEvent`

```ts
type WebComposerClipboardEvent = WebFileClipboardEvent;
```
## `WebComposerFile`

```ts
type WebComposerFile = WebFileCandidate;
```
## `WebComposerFileList`

```ts
type WebComposerFileList = WebFileCandidateList;
```
## `WebDragDropCancelReason`

```ts
type WebDragDropCancelReason = "cancel" | "drop-rejected" | "superseded";
```
## `WebDragDropSession`

```ts
interface WebDragDropSession<Item, Target> {
  getActiveItem(): Item | null;
  begin(item: Item): void;
  preview(target: Target): boolean;
  commit(target: Target): Item | null;
  cancel(reason?: WebDragDropCancelReason): Item | null;
}
```
## `WebDragDropSessionOptions`

```ts
interface WebDragDropSessionOptions<Item, Target> {
  readonly onPreview?: (item: Item, target: Target) => void;
  readonly onCommit?: (item: Item, target: Target) => void;
  readonly onCancel?: (item: Item, reason: WebDragDropCancelReason) => void;
}
```
## `WebFileCandidate`

```ts
interface WebFileCandidate {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}
```
## `WebFileCandidateList`

```ts
interface WebFileCandidateList {
  readonly length: number;
  readonly [index: number]: WebFileCandidate;
}
```
## `WebFileClipboardEvent`

```ts
interface WebFileClipboardEvent {
  readonly clipboardData: { readonly files: WebFileCandidateList } | null;
}
```
## `WebFocusableItem`

```ts
interface WebFocusableItem {
  getAttribute(name: string): string | null;
  focus(): void;
}
```
## `WebFocusItemAttributes`

```ts
interface WebFocusItemAttributes {
  readonly tabIndex: 0 | -1;
  readonly "data-web-focus-key": string;
}
```
## `webFocusItemProps`

```ts
webFocusItemProps(key: string, focused: boolean): WebFocusItemAttributes
```
## `WebFocusItemRoot`

```ts
interface WebFocusItemRoot<Item extends WebFocusableItem> {
  querySelectorAll(selectors: string): ArrayLike<Item>;
}
```
## `WebGridCellAddressAttributes`

```ts
interface WebGridCellAddressAttributes {
  readonly "data-grid-row-id": string;
  readonly "data-grid-column-id": string;
}
```
## `WebGridCellAddressElement`

```ts
interface WebGridCellAddressElement {
  getAttribute(name: string): string | null;
}
```
## `webGridCellAddressProps`

```ts
webGridCellAddressProps(point: GridPoint): WebGridCellAddressAttributes
```
## `WebGridCellAddressRoot`

```ts
interface WebGridCellAddressRoot<Cell extends WebGridCellAddressElement> {
  querySelectorAll(selectors: string): ArrayLike<Cell>;
}
```
## `webKanbanCardProps`

```ts
webKanbanCardProps(cardId: string): Readonly<{ "data-kanban-card-id": string; }>
```
## `webKanbanColumnProps`

```ts
webKanbanColumnProps(columnId: string): Readonly<{ "data-kanban-column-id": string; }>
```
## `WebKanbanTargetElement`

```ts
interface WebKanbanTargetElement {
  closest(selector: string): WebKanbanTargetElement | null;
  getAttribute(name: string): string | null;
}
```
## `WebKeyboardAdapter`

```ts
interface WebKeyboardAdapter {
  resolve(stroke: WebKeyboardStroke): WebKeyboardCommand | null;
}
```
## `WebKeyboardCommand`

```ts
type WebKeyboardCommand =
  | Extract<NavigationCommand, { readonly type: "move" } | { readonly type: "boundary" }>
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" };
```
## `WebKeyboardStroke`

```ts
interface WebKeyboardStroke {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey?: boolean;
}
```
## `WebKeymap`

```ts
type WebKeymap = Readonly<Record<string, WebKeyboardCommand>>;
```
## `WebModifierState`

```ts
interface WebModifierState {
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}
```
## `WebPointerCaptureTarget`

```ts
interface WebPointerCaptureTarget {
  setPointerCapture(pointerId: number): void;
  hasPointerCapture(pointerId: number): boolean;
  releasePointerCapture(pointerId: number): void;
}
```
## `WebPointerSession`

```ts
interface WebPointerSession<State> {
  getSnapshot(): WebPointerSessionSnapshot<State> | null;
  begin(target: WebPointerCaptureTarget, pointerId: number, state: State): void;
  preview(pointerId: number, update: (state: State) => State): State | null;
  commit(pointerId: number): State | null;
  cancel(pointerId: number, reason?: WebPointerSessionCancelReason): State | null;
}
```
## `WebPointerSessionCancelReason`

```ts
type WebPointerSessionCancelReason = "cancel" | "lost-capture" | "superseded";
```
## `WebPointerSessionOptions`

```ts
interface WebPointerSessionOptions<State> {
  readonly onPreview?: (state: State) => void;
  readonly onCommit?: (state: State) => void;
  readonly onCancel?: (state: State, reason: WebPointerSessionCancelReason) => void;
}
```
## `WebPointerSessionSnapshot`

```ts
type WebPointerSessionSnapshot<State> = Readonly<{
  pointerId: number;
  state: State;
}>;
```
## `WebPressInput`

```ts
type WebPressInput = {
  readonly type: string;
  readonly key?: string;
  readonly button?: number;
  readonly detail?: number;
  readonly repeat?: boolean;
  readonly defaultPrevented?: boolean;
};
```
## `WebPressInteraction`

```ts
type WebPressInteraction =
  | { readonly phase: "start" | "end"; readonly source: "keyboard"; readonly key: "Enter" | "Space" }
  | { readonly phase: "start" | "end"; readonly source: "pointer" }
  | { readonly phase: "cancel"; readonly source: "keyboard" | "pointer" }
  | { readonly phase: "activation"; readonly source: "pointer" | "virtual" };
```
## `WebPressSource`

```ts
type WebPressSource = "keyboard" | "pointer" | "virtual";
```
## `WebRasterFile`

```ts
interface WebRasterFile {
  readonly name: string;
  readonly type: string;
}
```
## `WebRasterSourceResult`

```ts
type WebRasterSourceResult =
  | { readonly ok: true; readonly dataURL: string; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly code: "raster.read-failed" | "raster.decode-failed"; readonly reason?: string };
```
## `WebSVGElement`

```ts
interface WebSVGElement {
  getBoundingClientRect(): { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly viewBox: { readonly baseVal: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } };
}
```
## `WebSVGViewport`

```ts
interface WebSVGViewport {
  readonly clientRect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly viewBox: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}
```
## `webSVGViewportFromElement`

```ts
webSVGViewportFromElement(svg: WebSVGElement): WebSVGViewport
```
## `WebTextControl`

```ts
interface WebTextControl {
  readonly value: string;
  readonly selectionStart: number | null;
}
```
## `WebTextControlEvent`

```ts
interface WebTextControlEvent {
  readonly currentTarget: WebTextControl;
}
```
## `WebTextInput`

```ts
interface WebTextInput {
  readonly text: string;
  readonly offset: number;
}
```
## `WebViewportElement`

```ts
interface WebViewportElement {
  readonly clientHeight: number;
  readonly scrollHeight: number;
  getBoundingClientRect(): { readonly top: number };
  scrollBy(options: { readonly top: number; readonly behavior: "instant" }): void;
  scrollTo(options: { readonly top: number; readonly behavior: "instant" }): void;
  addEventListener(type: string, listener: () => void, options?: { readonly passive?: boolean }): void;
  removeEventListener(type: string, listener: () => void): void;
}
```
## `WebViewportInteractionOptions`

```ts
interface WebViewportInteractionOptions<Key> {
  readonly viewport: WebViewportElement;
  readonly content?: object;
  readonly findAnchor: (key: Key) => { getBoundingClientRect(): { readonly top: number } } | null;
  readonly createResizeObserver?: (callback: () => void) => WebViewportObserver;
  readonly createMutationObserver?: (callback: () => void) => WebViewportObserver;
  readonly requestFrame?: (callback: () => void) => number;
  readonly cancelFrame?: (handle: number) => void;
  readonly setTimer?: (callback: () => void, delay: number) => number;
  readonly clearTimer?: (handle: number) => void;
}
```
## `WebViewportInteractionPorts`

```ts
interface WebViewportInteractionPorts<Key> {
  measureAnchor(key: Key): number | null;
  scrollBy(delta: number): void;
  scrollToFollowTarget(): void;
  scheduleFrame(callback: () => void): () => void;
  scheduleWatchdog(callback: () => void, delay: number): () => void;
  observeLayout(callback: () => void): () => void;
  observeUserScrollIntent(callback: () => void): () => void;
}
```
## `WebViewportObserver`

```ts
interface WebViewportObserver {
  observe(target: object, options?: object): void;
  disconnect(): void;
}
```
## `WebWidgetARIA`

```ts
type WebWidgetARIA = Readonly<{
  role: "button" | "option" | "gridcell" | "treeitem";
  "aria-pressed"?: boolean;
  "aria-selected"?: boolean;
  "aria-expanded"?: boolean;
  "aria-disabled"?: true;
  "aria-level"?: number;
  "aria-posinset"?: number;
  "aria-setsize"?: number;
}>;
```
## `WebWidgetState`

```ts
type WebWidgetState =
  | { readonly role: "button"; readonly pressed?: boolean; readonly disabled?: boolean }
  | { readonly role: "option" | "gridcell"; readonly selected: boolean; readonly disabled?: boolean }
  | {
    readonly role: "treeitem";
    readonly selected: boolean;
    readonly expanded?: boolean;
    readonly disabled?: boolean;
    readonly level?: number;
    readonly posInSet?: number;
    readonly setSize?: number;
  }
  | { readonly role: "disclosure"; readonly expanded: boolean; readonly disabled?: boolean };
```
