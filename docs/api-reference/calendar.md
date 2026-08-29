# @interactive-os/json-document-calendar API

**Owner:** Hands

Calendar React lifecycle와 occurrence interaction 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-calendar/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `CalendarHand`

```ts
interface CalendarHand {
  readonly snapshot: CalendarEditor["snapshot"];
  readonly document: CalendarDocument;
  readonly selectedEvent: CalendarEvent | null;
  readonly selectedOccurrences: ReadonlyArray<CalendarOccurrenceSelection>;
  readonly inspectedInterval: { readonly start: string; readonly end: string } | null;
  readonly occurrence: CalendarOccurrenceRange;
  readonly scope: OccurrenceScope;
  readonly renaming: boolean;
  readonly titleDraft: string;
  readonly paintedEvents: ReadonlyArray<CalendarEvent>;
  readonly timePreview: CalendarTimeGridPointerRelease | null;
  readonly allDayPreview: CalendarAllDayPointerRelease | null;
  readonly monthPreview: CalendarMonthPointerRelease | null;
  readonly selectionDragPreview: CalendarSelectionDragPreview | null;
  setScope(scope: OccurrenceScope): void;
  setOccurrence(occurrence: CalendarOccurrenceRange): void;
  setTitleDraft(title: string): void;
  beginTitleRename(eventId?: string): void;
  commitTitleRename(): void;
  cancelTitleRename(): void;
  handleTitleRenameKey(key: string): boolean;
  setTimePreview(preview: CalendarTimeGridPointerRelease | null): void;
  setAllDayPreview(preview: CalendarAllDayPointerRelease | null): void;
  setMonthPreview(preview: CalendarMonthPointerRelease | null): void;
  prepareSelectionDrag(eventId: string, occurrenceStart: string): CalendarSelectionDragSource | null;
  previewSelectionDrag(preview: CalendarSelectionDragPreview | null): void;
  commitSelectionDrag(preview: CalendarSelectionDragPreview): boolean;
  dispatch(intent: CalendarIntent | null): boolean;
  commitIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): boolean;
  rememberIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): void;
  applySelectedPatch(patch: CalendarEventPatch): boolean;
  createInterval(start: string, end: string, options?: { readonly allDay?: boolean; readonly title?: string }): boolean;
  isOccurrenceSelected(eventId: string, occurrenceStart: string): boolean;
  isPrimaryOccurrence(eventId: string, occurrenceStart: string): boolean;
  selectOccurrence(
    eventId: string,
    start: string,
    end: string,
    mode?: "replace" | "extend" | "toggle",
    topology?: CalendarOccurrenceTopologySnapshot,
  ): boolean;
  removeSelected(): boolean;
  setCalendarHidden(calendarId: string, hidden: boolean): boolean;
  rememberSelection(): void;
  undo(): void;
  redo(): void;
  copy(): CalendarClipboard | null;
  cut(): EditingResult<CalendarSelection> | null;
  paste(clipboard: CalendarClipboard): EditingResult<CalendarSelection>;
}
```
## `CalendarHandOptions`

```ts
type CalendarHandOptions = {
  readonly initialOccurrence?: CalendarOccurrenceRange;
  readonly defaultTitle?: string;
};
```
## `CalendarKeyboardOptions`

```ts
interface CalendarKeyboardOptions {
  readonly active: boolean;
  readonly target?: CalendarKeyboardTarget;
  readonly onView: (view: CalendarView) => void;
  readonly onShift: (direction: 1 | -1) => void;
  readonly onToday: () => void;
  readonly onCreate: () => void;
  readonly onRename: () => void;
  readonly onRemove: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly onDismiss?: () => boolean;
}
```
## `CalendarKeyboardTarget`

```ts
interface CalendarKeyboardTarget {
  addEventListener(type: "keydown", listener: (event: KeyboardEvent) => void): void;
  removeEventListener(type: "keydown", listener: (event: KeyboardEvent) => void): void;
}
```
## `CalendarPointerInteractions`

```ts
interface CalendarPointerInteractions {
  readonly hoveredTime: { readonly day: string; readonly instant: string; readonly minutes: number } | null;
  instantAt(day: string, clientY: number, grid: Element): string | null;
  timePointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null, handle: CalendarTimeGridHandle | null): void;
  timePointerMove(event: PointerEvent<HTMLElement>): void;
  timePointerUp(event: PointerEvent<HTMLElement>): void;
  clearTimeHover(): void;
  consumeEventClick(): boolean;
  consumeEventDoubleClick(): boolean;
  allDayPointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null, handle: "body" | "start" | "end" | null): void;
  allDayPointerMove(event: PointerEvent<HTMLElement>): void;
  allDayPointerUp(event: PointerEvent<HTMLElement>): void;
  monthPointerDown(event: PointerEvent<HTMLElement>, day: string, rowDays: ReadonlyArray<string>, id: string | null, start: string | null, end: string | null): void;
  monthPointerMove(event: PointerEvent<HTMLElement>): void;
  monthPointerUp(event: PointerEvent<HTMLElement>): void;
  cancelTimePointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  cancelAllDayPointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  cancelMonthPointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  resizeTimed(id: string, edge: "start" | "end", occurrenceStart: string, origin: string, delta: number, phase: Phase): void;
  resizeAllDay(id: string, edge: "start" | "end", originDay: string, occurrenceStart: string, delta: number, phase: Phase): void;
}
```
## `CalendarPointerPolicy`

```ts
type CalendarPointerPolicy = {
  readonly hourStart: number;
  readonly hourEnd: number;
  readonly stepMinutes: number;
  readonly pixelsPerHour: number;
  readonly onMonthPointerBegin?: () => void;
};
```
## `CalendarRenameInputBinding`

```ts
interface CalendarRenameInputBinding {
  readonly ref: RefObject<HTMLInputElement | null>;
  readonly value: string;
  onFocus(): void;
  onChange(event: ChangeEvent<HTMLInputElement>): void;
  onBlur(event: FocusEvent<HTMLInputElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}
```
## `CalendarRenameInputOptions`

```ts
interface CalendarRenameInputOptions {
  /** Commit when focus leaves the title. Disable inside a larger contextual editor. */
  readonly commitOnBlur?: boolean;
  /** Retries focus realization when an enclosing positioned editor becomes interactive. */
  readonly realizationKey?: string | number | boolean | null;
}
```
## `CalendarSelectionDragPreview`

```ts
interface CalendarSelectionDragPreview {
  readonly source: CalendarSelectionDragSource;
  readonly target: CalendarSelectionMoveTarget;
}
```
## `CalendarViewportPositionOptions`

```ts
interface CalendarViewportPositionOptions {
  readonly viewportRef: RefObject<HTMLElement | null>;
  readonly active: boolean;
  readonly resetKey: string;
  readonly targetHour: number;
  readonly viewportOffset?: number;
}
```
## `useCalendarHand`

```ts
useCalendarHand(editor: CalendarEditor, options?: CalendarHandOptions): CalendarHand
```
## `useCalendarKeyboard`

```ts
useCalendarKeyboard(options: CalendarKeyboardOptions): void
```
## `useCalendarPointerInteractions`

```ts
useCalendarPointerInteractions(hand: CalendarHand, policy: CalendarPointerPolicy): CalendarPointerInteractions
```
## `useCalendarRenameInput`

```ts
useCalendarRenameInput(hand: CalendarHand, options?: CalendarRenameInputOptions): CalendarRenameInputBinding
```
## `useCalendarViewportPosition`

```ts
useCalendarViewportPosition(options: CalendarViewportPositionOptions): void
```
