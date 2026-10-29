# @interactive-os/json-document-editing API

**탐색 분류:** Editing

Intent·변경 계획·선택·Clipboard·History의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-editing/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `acceptsDatabaseValue`

```ts
acceptsDatabaseValue(property: DatabaseProperty, value: JSONValue): boolean
```
## `addCalendarDate`

```ts
addCalendarDate(day: string, days: number): string | null
```
## `Annotation`

```ts
interface Annotation extends Record<string, JSONValue> { readonly id: string; readonly body: { readonly instruction: string }; readonly target: { readonly sourceId: string; readonly selector: AnnotationSelector }; readonly presentation: AnnotationPresentation }
```
## `ANNOTATION_PROFILE_V1`

```ts
const ANNOTATION_PROFILE_V1: "urn:interactive-os:json-document:annotation:1"
```
## `AnnotationBounds`

```ts
interface AnnotationBounds extends AnnotationPoint { readonly width: number; readonly height: number }
```
## `AnnotationDocument`

```ts
interface AnnotationDocument extends Record<string, JSONValue> { readonly profile: typeof ANNOTATION_PROFILE_V1; readonly id: string; readonly sources: ReadonlyArray<AnnotationSource>; readonly annotations: ReadonlyArray<Annotation> }
```
## `AnnotationEditor`

```ts
interface AnnotationEditor { readonly snapshot: EditingSnapshot<AnnotationSelection>; dispatch(intent: AnnotationIntent): EditingResult<AnnotationSelection>; undo(): EditingResult<AnnotationSelection>; redo(): EditingResult<AnnotationSelection>; subscribe(listener: () => void): () => void }
```
## `AnnotationIntent`

```ts
type AnnotationIntent =
  | { readonly type: "selection.set"; readonly annotationId: string | null; readonly mode: "replace" | "toggle" }
  | { readonly type: "annotation.create"; readonly annotation: Annotation }
  | { readonly type: "annotation.body.set"; readonly annotationId: string; readonly instruction: string }
  | { readonly type: "annotation.move"; readonly annotationId: string; readonly dx: number; readonly dy: number }
  | { readonly type: "annotation.resize"; readonly annotationId: string; readonly handle: "end" | "south-east"; readonly dx: number; readonly dy: number }
  | { readonly type: "annotation.delete"; readonly annotationId: string };
```
## `AnnotationPoint`

```ts
interface AnnotationPoint extends Record<string, JSONValue> { readonly x: number; readonly y: number }
```
## `AnnotationPresentation`

```ts
type AnnotationPresentation =
  | { readonly type: "marker" }
  | { readonly type: "reaction"; readonly reaction: "like" | "dislike" }
  | { readonly type: "outline" }
  | { readonly type: "stroke" }
  | { readonly type: "arrow" };
```
## `annotationResizeHandle`

```ts
annotationResizeHandle(selector: AnnotationSelector): "end" | "south-east" | null
```
## `AnnotationSelection`

```ts
interface AnnotationSelection extends Record<string, JSONValue> { readonly kind: "annotation"; readonly ids: ReadonlyArray<string>; readonly primaryId: string | null }
```
## `AnnotationSelector`

```ts
type AnnotationSelector =
  | ({ readonly type: "point" } & AnnotationPoint)
  | ({ readonly type: "rectangle"; readonly width: number; readonly height: number } & AnnotationPoint)
  | { readonly type: "path"; readonly points: ReadonlyArray<AnnotationPoint> }
  | { readonly type: "arrow"; readonly from: AnnotationPoint; readonly to: AnnotationPoint };
```
## `annotationSelectorBounds`

```ts
annotationSelectorBounds(selector: AnnotationSelector): AnnotationBounds
```
## `AnnotationSelectorTransform`

```ts
type AnnotationSelectorTransform =
  | { readonly type: "move"; readonly dx: number; readonly dy: number }
  | { readonly type: "resize"; readonly handle: "end" | "south-east"; readonly dx: number; readonly dy: number };
```
## `AnnotationSource`

```ts
interface AnnotationSource extends Record<string, JSONValue> { readonly id: string; readonly src: string; readonly width: number; readonly height: number }
```
## `applyTextEdit`

```ts
applyTextEdit(editor: TextEditor, edit: TextEdit): import("<repository>/packages/json-document-editing/src/session").EditingResult<import("<repository>/packages/json-document-editing/src/text").TextSelection>
```
## `applyUIBuilderConfiguration`

```ts
applyUIBuilderConfiguration(editor: ObjectEditor, change: UIBuilderConfiguration): { readonly ok: false; readonly code: string; readonly reason?: string; } | { readonly ok: true; readonly snapshot: import("<repository>/packages/json-document-editing/src/session").EditingSnapshot<import("<repository>/packages/json-document-editing/src/object").ObjectSelection>; readonly change?: import("<repository>/packages/json-document/src/application/document/contract").JSONAppliedChange; } | { ...; }
```
## `applyUIBuilderMaterials`

```ts
applyUIBuilderMaterials(editor: ObjectEditor, commands: readonly UIBuilderMaterialCommand[], generate?: UIBuilderSampleGenerator): { readonly ok: false; readonly code: string; readonly reason?: string; } | { ...; } | { ...; }
```
## `assertAnnotationDocument`

```ts
assertAnnotationDocument(document: AnnotationDocument): void
```
## `assertUIBuilderActionExecution`

```ts
assertUIBuilderActionExecution(value: unknown): asserts value is UIBuilderActionExecution
```
## `assertUIBuilderProject`

```ts
assertUIBuilderProject(value: unknown): asserts value is UIBuilderProject
```
## `bindCalendarAllDayIntent`

```ts
bindCalendarAllDayIntent(intent: CalendarAllDayPointerIntent | null, event: CalendarEvent | undefined, occurrenceStart: string | null, scope?: "this" | "this-and-following" | "all"): CalendarIntent | null
```
## `bindCalendarMonthIntent`

```ts
bindCalendarMonthIntent(intent: CalendarMonthPointerIntent | null, event: CalendarEvent | undefined, occurrenceStart: string | null, scope?: "this" | "this-and-following" | "all"): CalendarIntent | null
```
## `bindCalendarTimeGridIntent`

```ts
bindCalendarTimeGridIntent(intent: CalendarTimeGridPointerIntent | null, event: CalendarEvent | undefined, occurrenceStart: string | null, scope?: "this" | "this-and-following" | "all"): CalendarIntent | null
```
## `BlockDocument`

```ts
interface BlockDocument extends Record<string, JSONValue> {
  readonly blocks: ReadonlyArray<DocumentBlock>;
}
```
## `CalendarAllDayHandle`

```ts
type CalendarAllDayHandle = "body" | "start" | "end";
```
## `calendarAllDayLayout`

```ts
calendarAllDayLayout(events: ReadonlyArray<CalendarEvent>, days: ReadonlyArray<string>): ReadonlyArray<{ readonly event: CalendarEvent; readonly startIndex: number; readonly span: number; readonly lane: number; readonly laneCount: number; }>
```
## `CalendarAllDayPointerIntent`

```ts
type CalendarAllDayPointerIntent = Extract<
  CalendarIntent,
  { type: "event.create" } | { type: "selection.set" } | { type: "selection.clear" } | { type: "event.move-day" } | { type: "event.resize" }
>;
```
## `CalendarAllDayPointerRelease`

```ts
type CalendarAllDayPointerRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
  readonly originEventStart: string | null;
  readonly originHandle: CalendarAllDayHandle | null;
  readonly targetDay: string;
};
```
## `calendarAllDaySpan`

```ts
calendarAllDaySpan(originDay: string, targetDay: string): { readonly start: string; readonly end: string; } | null
```
## `calendarBusyDates`

```ts
calendarBusyDates(events: ReadonlyArray<CalendarEvent>, rangeStart: string, rangeEnd: string): ReadonlySet<string>
```
## `CalendarCalendar`

```ts
interface CalendarCalendar extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly hidden: boolean;
  readonly color: string;
}
```
## `CalendarClipboard`

```ts
interface CalendarClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.calendar+json";
  readonly anchorOccurrenceStart: string;
  readonly items: ReadonlyArray<CalendarClipboardItem>;
  readonly text: string;
}
```
## `calendarClipboardFormat`

```ts
const calendarClipboardFormat: { mimeType: "application/vnd.interactive-os.calendar+json"; parse(value: unknown): CalendarClipboard | null; }
```
## `CalendarClipboardItem`

```ts
interface CalendarClipboardItem extends Record<string, JSONValue> {
  readonly sourceEventId: string;
  readonly occurrenceStart: string;
  readonly event: CalendarEvent;
}
```
## `calendarDatePart`

```ts
calendarDatePart(value: string): string
```
## `CalendarDocument`

```ts
interface CalendarDocument extends Record<string, JSONValue> {
  readonly calendars: ReadonlyArray<CalendarCalendar>;
  readonly events: ReadonlyArray<CalendarEvent>;
}
```
## `calendarDocumentCalendar`

```ts
calendarDocumentCalendar(document: CalendarDocument, calendarId: string): CalendarCalendar | null
```
## `calendarDocumentCalendars`

```ts
calendarDocumentCalendars(document: CalendarDocument): ReadonlyArray<CalendarCalendar>
```
## `CalendarEditor`

```ts
interface CalendarEditor {
  readonly snapshot: EditingSnapshot<CalendarSelection>;
  readonly selectedEvents: ReadonlyArray<CalendarEvent>;
  readonly selectedOccurrences: ReadonlyArray<CalendarOccurrenceSelection>;
  readonly primaryOccurrence: CalendarOccurrenceSelection | null;
  prepareSelectionDrag(
    point: CalendarOccurrencePoint,
    topology?: CalendarOccurrenceTopologySnapshot,
  ): CalendarSelectionDragSource | null;
  dispatch(intent: CalendarIntent): EditingResult<CalendarSelection>;
  copy(occurrences?: ReadonlyArray<CalendarOccurrenceSelection>): CalendarClipboard | null;
  cut(source?: ReadonlyArray<CalendarOccurrenceSelection> | CalendarClipboard): EditingClipboardCut<CalendarClipboard, EditingResult<CalendarSelection>> | null;
  paste(clipboard: CalendarClipboard, target?: string, options?: { readonly calendarId?: string }): EditingResult<CalendarSelection>;
  undo(): EditingResult<CalendarSelection>;
  redo(): EditingResult<CalendarSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<CalendarSelection>) => void): () => void;
}
```
## `CalendarEvent`

```ts
interface CalendarEvent extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
  readonly calendarId: string;
  readonly recurrence: CalendarRecurrence | null;
  readonly excludeDates: ReadonlyArray<string>;
}
```
## `CalendarEventPatch`

```ts
type CalendarEventPatch = {
  readonly title?: string;
  readonly start?: string;
  readonly end?: string;
  readonly allDay?: boolean;
  readonly calendarId?: string;
  readonly recurrence?: CalendarEvent["recurrence"];
};
```
## `calendarEventsInMonth`

```ts
calendarEventsInMonth(events: ReadonlyArray<CalendarEvent>, month: string): ReadonlyArray<CalendarEvent>
```
## `calendarEventsOnDay`

```ts
calendarEventsOnDay(events: ReadonlyArray<CalendarEvent>, day: string): ReadonlyArray<CalendarEvent>
```
## `calendarInstantAt`

```ts
calendarInstantAt(day: string, minutesFromMidnight: number): string | null
```
## `CalendarIntent`

```ts
type CalendarIntent =
  | {
      readonly type: "selection.set";
      readonly point: CalendarOccurrencePoint;
      readonly topology?: CalendarOccurrenceTopologySnapshot;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.clear" }
  | { readonly type: "selection.remove" }
  | {
      readonly type: "selection.move";
      readonly source: CalendarSelectionDragSource;
      readonly target: CalendarSelectionMoveTarget;
      readonly scope?: "this" | "this-and-following" | "all";
    }
  | CalendarEventOperation
  | {
      readonly type: "occurrence.remove";
      readonly eventId: string;
      readonly occurrenceStart: string;
      readonly scope: "this" | "this-and-following" | "all";
    }
  | { readonly type: "calendar.set-hidden"; readonly calendarId: string; readonly hidden: boolean };
```
## `calendarIntervalLastDate`

```ts
calendarIntervalLastDate(start: string, end: string, allDay: boolean): string
```
## `calendarMonthDayLayout`

```ts
calendarMonthDayLayout(events: ReadonlyArray<CalendarEvent>, day: string, rowLimit: number): { readonly events: ReadonlyArray<CalendarEvent>; readonly hiddenCount: number; }
```
## `CalendarMonthPointerIntent`

```ts
type CalendarMonthPointerIntent = Extract<
  CalendarIntent,
  { type: "event.create" } | { type: "selection.set" } | { type: "selection.clear" } | { type: "event.move-day" }
>;
```
## `CalendarMonthPointerRelease`

```ts
type CalendarMonthPointerRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
  readonly originEventStart?: string | null;
  readonly targetDay: string;
  readonly eventsOnTargetDay: ReadonlyArray<{ readonly id: string }>;
};
```
## `calendarMonthWeekLayout`

```ts
calendarMonthWeekLayout(events: ReadonlyArray<CalendarEvent>, days: ReadonlyArray<string>, rowLimit: number): { readonly items: ReadonlyArray<{ readonly event: CalendarEvent; readonly startIndex: number; readonly span: number; readonly lane: number; }>; readonly hiddenCounts: ReadonlyArray<number>; readonly laneCount: number; }
```
## `calendarNowMarker`

```ts
calendarNowMarker(nowInstant: string, day: string): { readonly minutes: number; } | null
```
## `CalendarOccurrence`

```ts
type CalendarOccurrence = {
  readonly event: CalendarEvent;
  readonly start: string;
  readonly end: string;
};
```
## `calendarOccurrenceAfterIntent`

```ts
calendarOccurrenceAfterIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange, committed: CalendarOccurrenceRange | null): CalendarOccurrenceRange
```
## `calendarOccurrenceForInspector`

```ts
calendarOccurrenceForInspector(selected: Pick<CalendarEvent, "start" | "end" | "recurrence">, occurrence: CalendarOccurrenceRange): { readonly start: string; readonly end: string; }
```
## `calendarOccurrenceFromSelection`

```ts
calendarOccurrenceFromSelection(selected: Pick<CalendarEvent, "start" | "end"> | null): CalendarOccurrenceRange
```
## `CalendarOccurrencePoint`

```ts
interface CalendarOccurrencePoint extends Record<string, JSONValue> {
  readonly eventId: string;
  readonly occurrenceStart: string;
}
```
## `CalendarOccurrenceRange`

```ts
type CalendarOccurrenceRange = {
  readonly start: string | null;
  readonly end: string | null;
};
```
## `CalendarOccurrenceSelection`

```ts
type CalendarOccurrenceSelection = CalendarOccurrenceInterval;
```
## `calendarOccurrenceTopology`

```ts
calendarOccurrenceTopology(document: CalendarDocument, rangeStart: string, rangeEnd: string): CalendarOccurrenceTopologySnapshot
```
## `CalendarOccurrenceTopologySnapshot`

```ts
interface CalendarOccurrenceTopologySnapshot extends Record<string, JSONValue> {
  readonly points: ReadonlyArray<CalendarOccurrencePoint>;
}
```
## `CalendarRecurrence`

```ts
interface CalendarRecurrence extends Record<string, JSONValue> {
  readonly freq: "daily" | "weekly" | "monthly" | "yearly";
  readonly interval: number;
  readonly until: string;
}
```
## `calendarRecurrenceWithFrequency`

```ts
calendarRecurrenceWithFrequency(current: CalendarRecurrence | null, value: unknown): CalendarRecurrence | null
```
## `calendarRecurrenceWithInterval`

```ts
calendarRecurrenceWithInterval(current: CalendarRecurrence | null, value: unknown): CalendarRecurrence | null
```
## `calendarRecurrenceWithUntil`

```ts
calendarRecurrenceWithUntil(current: CalendarRecurrence | null, until: string): CalendarRecurrence | null
```
## `CalendarSelection`

```ts
interface CalendarSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<CalendarSelectionRange>;
  readonly primaryIndex: number | null;
}
```
## `CalendarSelectionDragSource`

```ts
interface CalendarSelectionDragSource {
  readonly anchor: CalendarOccurrencePoint;
  readonly primary: CalendarOccurrencePoint;
  readonly points: ReadonlyArray<CalendarOccurrencePoint>;
  readonly occurrences: ReadonlyArray<CalendarOccurrenceSelection>;
}
```
## `CalendarSelectionMovePlan`

```ts
type CalendarSelectionMovePlan =
  | {
      readonly ok: true;
      readonly events: ReadonlyArray<CalendarEvent>;
      readonly selectionAfter: CalendarSelection;
      readonly movedOccurrences: ReadonlyArray<CalendarOccurrenceSelection>;
    }
  | { readonly ok: false; readonly code: string };
```
## `CalendarSelectionMoveTarget`

```ts
type CalendarSelectionMoveTarget =
  | { readonly type: "instant"; readonly instant: string }
  | { readonly type: "day"; readonly day: string };
```
## `CalendarSelectionRange`

```ts
interface CalendarSelectionRange extends Record<string, JSONValue> {
  readonly anchor: CalendarOccurrencePoint;
  readonly focus: CalendarOccurrencePoint;
  readonly points: ReadonlyArray<CalendarOccurrencePoint>;
}
```
## `calendarShiftInstant`

```ts
calendarShiftInstant(instant: string, minutes: number): string | null
```
## `calendarTimedLayout`

```ts
calendarTimedLayout(events: ReadonlyArray<CalendarEvent>, day: string): ReadonlyArray<{ readonly event: CalendarEvent; readonly startMinutes: number; readonly endMinutes: number; readonly lane: number; readonly laneCount: number; }>
```
## `CalendarTimeGridHandle`

```ts
type CalendarTimeGridHandle = "body" | "start" | "end";
```
## `CalendarTimeGridPointerIntent`

```ts
type CalendarTimeGridPointerIntent = Extract<
  CalendarIntent,
  { type: "event.create" } | { type: "selection.set" } | { type: "selection.clear" } | { type: "event.move" } | { type: "event.resize" }
>;
```
## `CalendarTimeGridPointerRelease`

```ts
type CalendarTimeGridPointerRelease = {
  readonly originInstant: string;
  readonly originEventId: string | null;
  readonly originEventStart: string | null;
  readonly originHandle: CalendarTimeGridHandle | null;
  readonly targetInstant: string;
};
```
## `calendarUpdateIntent`

```ts
calendarUpdateIntent(event: CalendarEvent, occurrenceStart: string | null, scope: Extract<CalendarIntent, { type: "occurrence.edit"; }>["scope"], patch: CalendarEventPatch): CalendarIntent
```
## `CalendarView`

```ts
type CalendarView = "day" | "week" | "month" | "year";
```
## `calendarVisibleEvents`

```ts
calendarVisibleEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent>
```
## `calendarVisibleHourBand`

```ts
calendarVisibleHourBand(startMinutes: number, endMinutes: number, hourStart: number, hourEnd: number): { readonly startMinutes: number; readonly endMinutes: number; } | null
```
## `CanvasClipboardContent`

```ts
type CanvasClipboardContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "images"; readonly images: ReadonlyArray<{ readonly source: string; readonly width: number; readonly height: number; readonly label: string }> }
  | { readonly type: "mixed"; readonly items: ReadonlyArray<CanvasClipboardItem> };
```
## `CanvasClipboardItem`

```ts
type CanvasClipboardItem = { readonly type: "text"; readonly text: string }
  | ({ readonly type: "image" } & Parameters<typeof createCanvasImage>[0]);
```
## `CanvasClipboardOptions`

```ts
interface CanvasClipboardOptions {
  readonly bounds: ObjectBounds;
  readonly textColor: string;
  readonly fontSize: number;
  readonly imageOffset?: number;
  readonly contentGap?: number;
}
```
## `clampTextSelection`

```ts
clampTextSelection(value: string, selection: TextSelection): TextSelection
```
## `createAnnotationEditor`

```ts
createAnnotationEditor(source: EditingDocumentSource<AnnotationDocument>, options?: EditingHistoryOptions): AnnotationEditor
```
## `createCalendarEditor`

```ts
createCalendarEditor(source: EditingDocumentSource<CalendarDocument>, options?: EditingHistoryOptions & { readonly createId?: () => string; readonly initialEventIds?: ReadonlyArray<string>; }): CalendarEditor
```
## `createCanvasClipboard`

```ts
createCanvasClipboard(content: CanvasClipboardContent, options: CanvasClipboardOptions): ObjectClipboard
```
## `createCanvasEditorTools`

```ts
createCanvasEditorTools(editor: ObjectEditor): { name: string; description: string; parameters: Record<string, unknown>; execute: (args: unknown) => unknown; }[]
```
## `createCanvasSheet`

```ts
createCanvasSheet(bounds: ObjectBounds, options?: { rows?: number; columns?: number; }): CanvasObjectDraft
```
## `createDatabaseEditor`

```ts
createDatabaseEditor(source: EditingDocumentSource<DatabaseDocument>, options?: EditingHistoryOptions): DatabaseEditor
```
## `createDatabaseView`

```ts
createDatabaseView(id: string, name: string, propertyIds: ReadonlyArray<string>, ownership?: DatabaseTableView["ownership"], options?: { readonly hiddenPropertyIds?: readonly string[]; }): DatabaseTableView
```
## `createDocumentEditor`

```ts
createDocumentEditor(source: EditingDocumentSource<BlockDocument>, options?: EditingHistoryOptions & { readonly createId?: () => string; }): DocumentEditor
```
## `createEditingId`

```ts
createEditingId(prefix: string): string
```
## `createEditingIdAllocator`

```ts
createEditingIdAllocator(existingIds: Iterable<string>, createId: () => string, subject: string): () => string
```
## `createEditingPreparationQueue`

```ts
createEditingPreparationQueue<Value, Result extends { readonly ok: boolean; }>(options: { readonly apply: (value: Value) => Result; readonly onResult?: (result: Result | EditingPreparationFailure) => void; readonly onPendingChange?: (pending: boolean) => void; readonly cancelCode?: string; readonly errorCode?: string; }): EditingPreparationQueue<Value, Result>
```
## `createEditingSession`

```ts
createEditingSession<Selection extends JSONValue>(options: EditingSessionOptions<Selection>): EditingSession<Selection>
```
## `createKanbanEditor`

```ts
createKanbanEditor(source: EditingDocumentSource<KanbanDocument>, options?: EditingHistoryOptions): KanbanEditor
```
## `createMarkdownTableEditor`

```ts
createMarkdownTableEditor(text: TextEditor, position: () => number): SheetEditor
```
## `createObjectEditor`

```ts
createObjectEditor(source: EditingDocumentSource<ObjectDocument>, options?: EditingHistoryOptions & ObjectLayoutOptions & { readonly createId?: () => string; }): ObjectEditor
```
## `createObjectPasteSession`

```ts
createObjectPasteSession(editor: ObjectEditor, options?: { readonly placement?: ObjectPastePlacement; readonly onResult?: (result: EditingResult<ObjectSelection>) => void; readonly onPendingChange?: (pending: boolean) => void; }): ObjectPasteSession
```
## `createObjectSheetEditor`

```ts
createObjectSheetEditor(parent: ObjectEditor, objectId: string): SheetEditor
```
## `createOrderEditor`

```ts
createOrderEditor(source: EditingDocumentSource<OrderDocument>, options?: EditingHistoryOptions & { readonly createId?: () => string; }): OrderEditor
```
## `createProjectedSheetEditor`

```ts
createProjectedSheetEditor(options: ProjectedSheetOptions): SheetEditor
```
## `createSheetEditor`

```ts
createSheetEditor(source: EditingDocumentSource<SheetDocument>, options?: SheetEditorOptions): SheetEditor
```
## `createTextEditor`

```ts
createTextEditor(document: JSONDocument, pointer?: Pointer): TextEditor
```
## `createTextEditorTools`

```ts
createTextEditorTools(editor: TextEditor): ({ name: string; description: string; parameters: { type: string; properties: {}; required: any[]; additionalProperties: boolean; }; execute: (_args: unknown) => unknown; } | { ...; } | { ...; } | { ...; })[]
```
## `createTreeEditor`

```ts
createTreeEditor(source: EditingDocumentSource<TreeDocument>, options?: EditingHistoryOptions & { readonly createId?: () => string; }): TreeEditor
```
## `createUIBuilderActionTools`

```ts
createUIBuilderActionTools(editor: ObjectEditor, skills: readonly UIBuilderSkillDefinition[]): { name: string; description: string; parameters: { type: string; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean; }; execute(args: unknown): { ...; } | ... 2 more ... | { ...; }; }[]
```
## `createUIBuilderCatalogTools`

```ts
createUIBuilderCatalogTools(editor: ObjectEditor): { name: string; description: string; parameters: { type: string; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean; }; execute(args: unknown): { ...; } | ... 2 more ... | { ...; }; }[]
```
## `createUIBuilderEditor`

```ts
createUIBuilderEditor(value: CanvasDocument): ObjectEditor
```
## `createUIBuilderLayoutTools`

Optional context는 `{pageId, selection, runtimeValues?}`다. 읽기 응답의 `rootObjectIds`는 최상위 배치 대상, `objects`는 중첩을 포함한 표시 콘텐츠, `collections`는 현재 검색·필터의 Database projection이다.

```ts
createUIBuilderLayoutTools(editor: ObjectEditor): ({ name: string; description: string; parameters: { type: string; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean; }; execute(): { ...; }; } | { ...; })[]
```
## `createUIBuilderMaterialTools`

```ts
createUIBuilderMaterialTools(editor: ObjectEditor, generate: UIBuilderSampleGenerator): { name: string; description: string; parameters: { type: string; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean; }; execute(args: unknown): { ...; } | ... 2 more ... | { ...; }; }[]
```
## `createUIBuilderTools`

```ts
createUIBuilderTools(editor: ObjectEditor): { name: string; description: string; parameters: { type: string; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean; }; execute(args: unknown): { ...; } | ... 3 more ... | { ...; }; }[]
```
## `cutEditingClipboard`

```ts
cutEditingClipboard<Payload, Result>(copy: () => Payload | null, remove: (clipboard: Payload) => Result): EditingClipboardCut<Payload, Result> | null
```
## `DatabaseCell`

```ts
interface DatabaseCell extends DatabasePoint {
  readonly value: JSONValue;
}
```
## `DatabaseClipboard`

```ts
interface DatabaseClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.database+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
}
```
## `databaseClipboardFormat`

```ts
const databaseClipboardFormat: { mimeType: "application/vnd.interactive-os.database+json"; parse(value: unknown): DatabaseClipboard | null; }
```
## `DatabaseColumnProjection`

```ts
interface DatabaseColumnProjection extends Record<string, JSONValue> { readonly propertyId: string; readonly visible: boolean; readonly width: number | null; readonly pinned: "start" | "end" | null; }
```
## `DatabaseDocument`

```ts
interface DatabaseDocument extends Record<string, JSONValue> {
  readonly schema: {
    readonly properties: ReadonlyArray<DatabaseProperty>;
  };
  readonly records: ReadonlyArray<DatabaseRecord>;
  readonly views: ReadonlyArray<DatabaseTableView>;
}
```
## `DatabaseEditor`

```ts
interface DatabaseEditor {
  readonly snapshot: EditingSnapshot<DatabaseSelection>;
  dispatch(intent: DatabaseIntent): EditingResult<DatabaseSelection>;
  tableTopology(viewId: string): DatabaseTopology;
  selectedCellsIn(topology: DatabaseTopology): ReadonlyArray<DatabaseCell>;
  copy(topology?: DatabaseTopology): DatabaseClipboard | null;
  cut(topology?: DatabaseTopology): { readonly clipboard: DatabaseClipboard; readonly result: EditingResult<DatabaseSelection> } | null;
  undo(): EditingResult<DatabaseSelection>;
  redo(): EditingResult<DatabaseSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<DatabaseSelection>) => void): () => void;
}
```
## `DatabaseFilter`

```ts
interface DatabaseFilter extends Record<string, JSONValue> { readonly id: string; readonly propertyId: string; readonly operator: DatabaseFilterOperator; readonly value: JSONValue; }
```
## `DatabaseFilterGroup`

```ts
interface DatabaseFilterGroup extends Record<string, JSONValue> { readonly id: string; readonly conjunction: "and" | "or"; readonly items: ReadonlyArray<DatabaseFilter | DatabaseFilterGroup>; }
```
## `DatabaseFilterOperator`

```ts
type DatabaseFilterOperator = "equals" | "not-equals" | "contains" | "greater-than" | "greater-than-or-equal" | "less-than" | "less-than-or-equal" | "is-empty";
```
## `DatabaseGroup`

```ts
interface DatabaseGroup extends Record<string, JSONValue> { readonly propertyId: string; readonly direction: "ascending" | "descending"; }
```
## `DatabaseIntent`

```ts
type DatabaseIntent =
  | {
      readonly type: "selection.set";
      readonly recordId: string;
      readonly propertyId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | {
      readonly type: "cell.commit";
      readonly recordId: string;
      readonly propertyId: string;
      readonly value: JSONValue;
    }
  | {
      readonly type: "record.add";
      readonly recordId: string;
      readonly values?: Readonly<Record<string, JSONValue>>;
    }
  | {
      readonly type: "record.delete";
      readonly recordId: string;
    }
  | {
      readonly type: "view.configure";
      readonly viewId: string;
      readonly projection: DatabaseProjection;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: DatabaseClipboard;
      readonly topology?: DatabaseTopology;
    };
```
## `DatabasePoint`

```ts
interface DatabasePoint extends Record<string, JSONValue> {
  readonly recordId: string;
  readonly propertyId: string;
}
```
## `DatabaseProjection`

```ts
interface DatabaseProjection extends Record<string, JSONValue> { readonly search: string; readonly filter: DatabaseFilterGroup; readonly sorts: ReadonlyArray<DatabaseSort>; readonly groups: ReadonlyArray<DatabaseGroup>; readonly columns: ReadonlyArray<DatabaseColumnProjection>; }
```
## `DatabaseProperty`

```ts
interface DatabaseProperty extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly type: DatabasePropertyType;
  readonly options: ReadonlyArray<DatabaseSelectOption>;
}
```
## `DatabasePropertyType`

```ts
type DatabasePropertyType = "title" | "text" | "number" | "select" | "checkbox";
```
## `DatabaseRange`

```ts
interface DatabaseRange extends Record<string, JSONValue> {
  readonly anchor: DatabasePoint;
  readonly focus: DatabasePoint;
}
```
## `DatabaseRecord`

```ts
interface DatabaseRecord extends Record<string, JSONValue> {
  readonly id: string;
  readonly values: Readonly<Record<string, JSONValue>>;
}
```
## `DatabaseSelection`

```ts
interface DatabaseSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly anchor: DatabasePoint | null;
  readonly focus: DatabasePoint | null;
  readonly ranges: ReadonlyArray<DatabaseRange>;
  readonly primaryIndex: number | null;
}
```
## `DatabaseSelectOption`

```ts
interface DatabaseSelectOption extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
}
```
## `DatabaseSort`

```ts
interface DatabaseSort extends Record<string, JSONValue> {
  readonly propertyId: string;
  readonly direction: "ascending" | "descending";
}
```
## `DatabaseTableView`

```ts
interface DatabaseTableView extends Record<string, JSONValue> { readonly id: string; readonly name: string; readonly ownership: "personal" | "shared" | "locked"; readonly layout: "table"; readonly projection: DatabaseProjection; }
```
## `DatabaseTopology`

```ts
interface DatabaseTopology {
  readonly recordIds: ReadonlyArray<string>;
  readonly propertyIds: ReadonlyArray<string>;
}
```
## `databaseValueFromText`

```ts
databaseValueFromText(property: DatabaseProperty, value: string): string | number | boolean
```
## `defaultDatabaseValue`

```ts
defaultDatabaseValue(property: DatabaseProperty): JSONValue
```
## `diffText`

```ts
diffText(before: string, after: string): TextChange | null
```
## `DocumentBlock`

```ts
interface DocumentBlock extends Record<string, JSONValue> {
  readonly id: string;
  readonly text: string;
}
```
## `DocumentClipboard`

```ts
interface DocumentClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.blocks+json";
  readonly blocks: ReadonlyArray<DocumentBlock>;
  readonly text: string;
}
```
## `documentClipboardFormat`

```ts
const documentClipboardFormat: { mimeType: "application/vnd.interactive-os.blocks+json"; parse(value: unknown): DocumentClipboard | null; }
```
## `DocumentEditor`

```ts
interface DocumentEditor {
  readonly snapshot: EditingSnapshot<DocumentSelection>;
  readonly selectedBlockIds: ReadonlyArray<string>;
  dispatch(intent: DocumentIntent): EditingResult<DocumentSelection>;
  copy(): DocumentClipboard | null;
  cut(): { readonly clipboard: DocumentClipboard; readonly result: EditingResult<DocumentSelection> } | null;
  undo(): EditingResult<DocumentSelection>;
  redo(): EditingResult<DocumentSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<DocumentSelection>) => void): () => void;
}
```
## `DocumentIntent`

```ts
type DocumentIntent =
  | { readonly type: "selection.select-all" }
  | { readonly type: "selection.set"; readonly blockId: string; readonly mode?: "replace" | "extend" | "toggle"; readonly offset?: number }
  | { readonly type: "text.replace"; readonly blockId: string; readonly text: string; readonly offset?: number }
  | { readonly type: "block.insert"; readonly afterId?: string; readonly text?: string }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.move"; readonly direction: -1 | 1 }
  | { readonly type: "selection.duplicate" }
  | { readonly type: "clipboard.paste"; readonly clipboard: DocumentClipboard; readonly afterId?: string };
```
## `DocumentObject`

```ts
interface DocumentObject extends ObjectDraft {
  readonly id: string;
}
```
## `DocumentPoint`

```ts
interface DocumentPoint extends Record<string, JSONValue> {
  readonly blockId: string;
  readonly offset: number;
}
```
## `DocumentRange`

```ts
interface DocumentRange extends Record<string, JSONValue> {
  readonly anchor: DocumentPoint;
  readonly focus: DocumentPoint;
}
```
## `DocumentSelection`

```ts
interface DocumentSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<DocumentRange>;
  readonly primaryIndex: number | null;
}
```
## `documentSelectionFocus`

```ts
documentSelectionFocus(selection: DocumentSelection): DocumentPoint | null
```
## `EditingClipboardCut`

```ts
interface EditingClipboardCut<Payload, Result> {
  readonly clipboard: Payload;
  readonly result: Result;
}
```
## `EditingDispatch`

```ts
interface EditingDispatch<Intent extends EditingIntent, Selection extends JSONValue> {
  dispatch(intent: Intent): EditingResult<Selection>;
}
```
## `EditingDocumentChange`

```ts
interface EditingDocumentChange {
  readonly before: JSONValue;
  readonly after: JSONValue;
  /** Null when catching up without an observed, matching applied change. */
  readonly change: JSONAppliedChange | null;
}
```
## `EditingHistory`

```ts
interface EditingHistory {
  status(): EditingHistoryStatus;
  undo(): EditingHistoryResult;
  redo(): EditingHistoryResult;
  /** Includes history-only changes, even when the document value stays equal. */
  subscribe(listener: () => void): () => void;
}
```
## `EditingHistoryOptions`

```ts
interface EditingHistoryOptions {
  /** Use the history belonging to the same document. Omit for local history. */
  readonly history?: EditingHistory;
}
```
## `EditingHistoryResult`

```ts
type EditingHistoryResult =
  | {
      readonly ok: true;
      readonly target: string;
      /** This operation's applied change; null for a history-only transition. */
      readonly change: JSONAppliedChange | null;
      /** This operation's status, captured before notifying subscribers. */
      readonly status: EditingHistoryStatus;
    }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `EditingHistoryStatus`

```ts
interface EditingHistoryStatus {
  readonly undoTarget: string | null;
  readonly redoTarget: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly revision: number;
}
```
## `EditingIntent`

```ts
interface EditingIntent {
  readonly type: string;
}
```
## `EditingPlan`

```ts
interface EditingPlan<Selection extends JSONValue> {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter: Selection;
  readonly origin: string;
  readonly history?: "record" | "ignore";
  /** Groups local inverse history. An external history owner defines its own steps. */
  readonly historyGroup?: string;
}
```
## `EditingPreparation`

```ts
type EditingPreparation<Value> = { readonly ok: true; readonly value: Value } | EditingPreparationFailure;
```
## `EditingPreparationFailure`

```ts
type EditingPreparationFailure = { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `EditingPreparationQueue`

```ts
interface EditingPreparationQueue<Value, Result> {
  readonly isPending: boolean;
  enqueue(prepare: () => EditingPreparation<Value> | Promise<EditingPreparation<Value>>, cancelPreparation?: () => void): Promise<Result | EditingPreparationFailure>;
  cancel(): void;
}
```
## `EditingResult`

```ts
type EditingResult<Selection extends JSONValue> =
  | { readonly ok: true; readonly snapshot: EditingSnapshot<Selection>; readonly change?: JSONAppliedChange }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `EditingSession`

```ts
interface EditingSession<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  apply(plan: EditingPlan<Selection>): EditingResult<Selection>;
  select(selection: Selection): EditingSnapshot<Selection>;
  reconcile(reconciler: (selection: Selection, value: JSONValue) => Selection): EditingSnapshot<Selection>;
  undo(): EditingResult<Selection>;
  redo(): EditingResult<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}
```
## `EditingSessionOptions`

```ts
interface EditingSessionOptions<Selection extends JSONValue> extends EditingHistoryOptions {
  readonly document: JSONDocument;
  readonly selection: Selection;
  readonly mapSelection?: (selection: Selection, change: EditingDocumentChange) => Selection;
  readonly reconcileSelection?: (selection: Selection, value: JSONValue) => Selection;
}
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
## `executeUIBuilderAction`

```ts
executeUIBuilderAction(editor: ObjectEditor, actionId: string, skills: readonly UIBuilderSkillDefinition[], selection?: UIBuilderRecordSelection, signal?: { readonly aborted: boolean; }): Promise<...>
```
## `formatCalendarInstant`

```ts
formatCalendarInstant(value: Temporal.PlainDateTime): string
```
## `gridCellsInRange`

```ts
gridCellsInRange(topology: GridTopology, range: { readonly anchor: GridPoint; readonly focus: GridPoint; }): ReadonlyArray<GridPoint>
```
## `GridPoint`

```ts
interface GridPoint {
  readonly rowId: string;
  readonly columnId: string;
}
```
## `gridPointFromKey`

```ts
gridPointFromKey(key: string): GridPoint | null
```
## `gridPointIndex`

```ts
gridPointIndex(topology: GridTopology, point: GridPoint): { readonly rowIndex: number; readonly columnIndex: number; } | null
```
## `gridPointKey`

```ts
gridPointKey(point: GridPoint): string
```
## `gridRangeBounds`

```ts
gridRangeBounds(topology: GridTopology, range: { readonly anchor: GridPoint; readonly focus: GridPoint; }): GridRangeBounds | null
```
## `GridRangeBounds`

```ts
interface GridRangeBounds {
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly columnStart: number;
  readonly columnEnd: number;
}
```
## `gridTopology`

```ts
gridTopology(rowIds: ReadonlyArray<string>, columnIds: ReadonlyArray<string>): GridTopology
```
## `GridTopology`

```ts
interface GridTopology {
  readonly rowIds: ReadonlyArray<string>;
  readonly columnIds: ReadonlyArray<string>;
}
```
## `interpretCalendarAllDayPointer`

```ts
interpretCalendarAllDayPointer(release: CalendarAllDayPointerRelease): CalendarAllDayPointerIntent | null
```
## `interpretCalendarMonthPointer`

```ts
interpretCalendarMonthPointer(release: CalendarMonthPointerRelease): CalendarMonthPointerIntent | null
```
## `interpretCalendarTimeGridPointer`

```ts
interpretCalendarTimeGridPointer(release: CalendarTimeGridPointerRelease): CalendarTimeGridPointerIntent | null
```
## `isCalendarAllDay`

```ts
isCalendarAllDay(event: Pick<CalendarEvent, "allDay">): boolean
```
## `jsonCellText`

```ts
jsonCellText(value: JSONValue | undefined): string
```
## `KanbanCard`

```ts
interface KanbanCard extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
}
```
## `KanbanCardDropTarget`

```ts
interface KanbanCardDropTarget {
  readonly columnId: string;
  readonly beforeCardId: string | null;
}
```
## `KanbanColumn`

```ts
interface KanbanColumn extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly cardIds: ReadonlyArray<string>;
}
```
## `KanbanDocument`

```ts
interface KanbanDocument extends Record<string, JSONValue> {
  readonly columns: ReadonlyArray<KanbanColumn>;
  readonly cards: ReadonlyArray<KanbanCard>;
}
```
## `KanbanEditor`

```ts
interface KanbanEditor {
  readonly snapshot: EditingSnapshot<KanbanSelection>;
  readonly selectedCardIds: ReadonlyArray<string>;
  dispatch(intent: KanbanIntent): EditingResult<KanbanSelection>;
  undo(): EditingResult<KanbanSelection>;
  redo(): EditingResult<KanbanSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<KanbanSelection>) => void): () => void;
}
```
## `KanbanIntent`

```ts
type KanbanIntent =
  | {
      readonly type: "selection.set";
      readonly cardId: string;
      readonly mode?: "replace" | "toggle";
    }
  | ({
      readonly type: "card.move";
      readonly cardId: string;
    } & KanbanCardDropTarget)
  | { readonly type: "selection.remove" };
```
## `KanbanSelection`

```ts
interface KanbanSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}
```
## `lineInterval`

```ts
lineInterval(topology: LineTopology, anchorId: string, focusId: string): ReadonlyArray<string>
```
## `lineTopology`

```ts
lineTopology(ids: ReadonlyArray<string>): LineTopology
```
## `LineTopology`

```ts
interface LineTopology {
  readonly ids: ReadonlyArray<string>;
}
```
## `moveText`

```ts
moveText(editor: TextEditor, move: TextMove): import("<repository>/packages/json-document-editing/src/session").EditingResult<import("<repository>/packages/json-document-editing/src/text").TextSelection>
```
## `nextDatabasePropertySort`

```ts
nextDatabasePropertySort(sort: DatabaseSort | null, propertyId: string): DatabaseSort | null
```
## `ObjectClipboard`

```ts
type ObjectClipboard = Record<string, JSONValue> & {
  readonly type: "application/vnd.interactive-os.objects+json";
  readonly objects: ReadonlyArray<DocumentObject>;
  readonly text: string;
  /** Optional for legacy payloads; remapped to the corresponding new ID on paste. */
  readonly primaryKey?: string | null;
};
```
## `objectClipboardFormat`

```ts
const objectClipboardFormat: { mimeType: "application/vnd.interactive-os.objects+json"; parse(value: unknown): ObjectClipboard | null; }
```
## `ObjectDocument`

```ts
interface ObjectDocument extends Record<string, JSONValue> {
  readonly objects: ReadonlyArray<DocumentObject>;
}
```
## `ObjectEditor`

```ts
interface ObjectEditor {
  readonly snapshot: EditingSnapshot<ObjectSelection>;
  readonly selectedObjects: ReadonlyArray<DocumentObject>;
  layoutDocument(document: ObjectDocument): ObjectDocument;
  layoutObject<Object extends ObjectDraft>(object: Object): Object;
  dispatch(intent: ObjectIntent): EditingResult<ObjectSelection>;
  copy(): ObjectClipboard | null;
  cut(): { readonly clipboard: ObjectClipboard; readonly result: EditingResult<ObjectSelection> } | null;
  undo(): EditingResult<ObjectSelection>;
  redo(): EditingResult<ObjectSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<ObjectSelection>) => void): () => void;
}
```
## `ObjectIntent`

```ts
type ObjectIntent =
  | { readonly type: "object.update"; readonly objectId: string; readonly changes: Partial<ObjectDraft> }
  | { readonly type: "object.reorder"; readonly objectIds: ReadonlyArray<string> }
  | { readonly type: "object.create"; readonly object: ObjectDraft }
  | { readonly type: "object.duplicate"; readonly objectIds: ReadonlyArray<string>; readonly placement?: ObjectPastePlacement }
  | { readonly type: "object.remove"; readonly objectIds: ReadonlyArray<string> }
  | { readonly type: "object.document"; readonly objectId: string; readonly document: JSONValue }
  | { readonly type: "object.text"; readonly objectId: string; readonly text: string }
  | { readonly type: "document.replace"; readonly document: ObjectDocument }
  | {
      readonly type: "selection.set";
      readonly objectIds: ReadonlyArray<string>;
      readonly mode?: ObjectSelectionMode;
      readonly primaryKey?: string;
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.fill"; readonly color: string }
  | { readonly type: "selection.style"; readonly style: Partial<ObjectStyle> }
  | {
      readonly type: "object.translate";
      readonly objectIds: ReadonlyArray<string>;
      readonly dx: number;
      readonly dy: number;
    }
  | {
      readonly type: "object.resize";
      readonly objectIds: ReadonlyArray<string>;
      readonly dx: number;
      readonly dy: number;
      readonly dw: number;
      readonly dh: number;
    }
  | { readonly type: "clipboard.paste"; readonly clipboard: ObjectClipboard; readonly placement?: ObjectPastePlacement };
```
## `ObjectPastePlacement`

```ts
interface ObjectPastePlacement {
  readonly type: "offset" | "cascade";
  readonly dx: number;
  readonly dy: number;
}
```
## `ObjectPastePreparation`

```ts
type ObjectPastePreparation =
  | { readonly ok: true; readonly clipboard: ObjectClipboard }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `ObjectPasteSession`

```ts
interface ObjectPasteSession {
  readonly pending: boolean;
  enqueue(prepare: () => ObjectPastePreparation | Promise<ObjectPastePreparation>, cancelPreparation?: () => void): Promise<EditingResult<ObjectSelection>>;
  /** Cancels queued work and releases subscriptions. The session can be reused. */
  cancel(): void;
}
```
## `ObjectSelection`

```ts
interface ObjectSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}
```
## `ObjectSelectionMode`

```ts
type ObjectSelectionMode = "replace" | "extend" | "add" | "subtract" | "toggle";
```
## `OrderClipboard`

```ts
interface OrderClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.order+json";
  readonly items: ReadonlyArray<OrderItem>;
  readonly text: string;
}
```
## `orderClipboardFormat`

```ts
const orderClipboardFormat: { mimeType: "application/vnd.interactive-os.order+json"; parse(value: unknown): OrderClipboard | null; }
```
## `OrderDocument`

```ts
interface OrderDocument extends Record<string, JSONValue> {
  readonly items: ReadonlyArray<OrderItem>;
}
```
## `OrderEditor`

```ts
interface OrderEditor {
  readonly snapshot: EditingSnapshot<OrderSelection>;
  readonly selectedItemIds: ReadonlyArray<string>;
  dispatch(intent: OrderIntent): EditingResult<OrderSelection>;
  copy(): OrderClipboard | null;
  cut(): { readonly clipboard: OrderClipboard; readonly result: EditingResult<OrderSelection> } | null;
  undo(): EditingResult<OrderSelection>;
  redo(): EditingResult<OrderSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<OrderSelection>) => void): () => void;
}
```
## `OrderIntent`

```ts
type OrderIntent =
  | { readonly type: "selection.select-all" }
  | {
      readonly type: "selection.set";
      readonly itemId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "item.rename"; readonly itemId: string; readonly label: string }
  | { readonly type: "clipboard.paste"; readonly clipboard: OrderClipboard; readonly afterId?: string };
```
## `OrderItem`

```ts
interface OrderItem extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
}
```
## `OrderPoint`

```ts
interface OrderPoint extends Record<string, JSONValue> {
  readonly itemId: string;
}
```
## `OrderRange`

```ts
interface OrderRange extends Record<string, JSONValue> {
  readonly anchor: OrderPoint;
  readonly focus: OrderPoint;
}
```
## `OrderSelection`

```ts
interface OrderSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<OrderRange>;
  readonly primaryIndex: number | null;
}
```
## `parseCalendarView`

```ts
parseCalendarView(value: unknown): CalendarView | null
```
## `parseSheetClipboardText`

```ts
parseSheetClipboardText(text: string): SheetClipboard | null
```
## `planCalendarSelectionMove`

```ts
planCalendarSelectionMove(events: ReadonlyArray<CalendarEvent>, occurrences: ReadonlyArray<CalendarOccurrenceSelection>, anchor: CalendarOccurrencePoint, target: CalendarSelectionMoveTarget, options?: { readonly scope?: "this" | "this-and-following" | "all"; readonly createId?: () => string; readonly primary?: CalendarOccurrencePoint; }): CalendarSelectionMovePlan
```
## `planSheetIntent`

```ts
planSheetIntent(document: SheetDocument, selection: SheetSelection, intent: SheetIntent, options?: SheetEditorOptions): SheetPlanResult
```
## `previewCalendarAllDay`

```ts
previewCalendarAllDay(events: ReadonlyArray<CalendarEvent>, release: CalendarAllDayPointerRelease, scope?: "this" | "this-and-following" | "all"): ReadonlyArray<CalendarEvent>
```
## `previewCalendarMonth`

```ts
previewCalendarMonth(events: ReadonlyArray<CalendarEvent>, release: CalendarMonthPointerRelease, scope?: "this" | "this-and-following" | "all"): ReadonlyArray<CalendarEvent>
```
## `previewCalendarTimeGrid`

```ts
previewCalendarTimeGrid(events: ReadonlyArray<CalendarEvent>, release: CalendarTimeGridPointerRelease, scope?: "this" | "this-and-following" | "all"): ReadonlyArray<CalendarEvent>
```
## `projectCalendarOccurrences`

```ts
projectCalendarOccurrences(events: ReadonlyArray<CalendarEvent>, rangeStart: string, rangeEnd: string): ReadonlyArray<CalendarOccurrence>
```
## `ProjectedSheetOptions`

```ts
interface ProjectedSheetOptions {
  readonly source: ProjectedSheetSource;
  /** Null means absent; a present value is validated by the canonical Sheet schema. */
  readonly read: () => unknown;
  readonly write: (value: SheetDocument) => {readonly ok:boolean;readonly code?:string};
  readonly readOnly?:()=>boolean;
  readonly sheet?: SheetEditorOptions;
  /** Formats with position-based IDs remap selection after structural edits. */
  readonly mapSelection?: (selection:SheetSelection,value:SheetDocument) => SheetSelection;
}
```
## `ProjectedSheetSource`

```ts
interface ProjectedSheetSource {
  readonly snapshot: {readonly value: JSONValue;readonly canUndo: boolean;readonly canRedo: boolean};
  subscribe(listener: () => void): () => void;
  undo(): {readonly ok:boolean;readonly code?:string};
  redo(): {readonly ok:boolean;readonly code?:string};
}
```
## `projectSheetGrid`

```ts
projectSheetGrid(document: SheetDocument, order?: SheetViewOptions): SheetGrid
```
## `projectTreeVisibility`

```ts
projectTreeVisibility(nodes: ReadonlyArray<TreeNode>, expandedIds: ReadonlySet<string>): TreeVisibility
```
## `readUIBuilderProject`

```ts
readUIBuilderProject(value: unknown): UIBuilderProject
```
## `resolveUIBuilderComponent`

```ts
resolveUIBuilderComponent(project: UIBuilderProject, object: UIComponentObject, selection?: UIBuilderRecordSelection): UIBuilderProjection
```
## `setUIBuilderInput`

```ts
setUIBuilderInput(editor: ObjectEditor, object: UIComponentObject, value: string | boolean, selection?: UIBuilderRecordSelection): { readonly ok: false; readonly code: string; readonly reason?: string; } | { ...; } | { ...; }
```
## `SheetAvailability`

```ts
type SheetAvailability = "ready" | "missing" | "invalid" | "readonly";
```
## `SheetCell`

```ts
interface SheetCell extends SheetPoint {
  readonly value: JSONValue;
}
```
## `SheetClipboard`

```ts
interface SheetClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.sheet+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
}
```
## `sheetClipboardFormat`

```ts
const sheetClipboardFormat: { mimeType: "application/vnd.interactive-os.sheet+json"; parse(value: unknown): SheetClipboard | null; }
```
## `SheetColumn`

```ts
type SheetColumn = z.infer<typeof sheetColumnSchema>;
```
## `sheetColumnLabel`

```ts
sheetColumnLabel(index: number): string
```
## `SheetDocument`

```ts
type SheetDocument = z.infer<typeof sheetDocumentSchema>;
```
## `SheetEditor`

```ts
interface SheetEditor {
  readonly availability: SheetAvailability;
  readonly grid: SheetGrid;
  createView(options?:SheetViewOptions):SheetEditor;
  readonly capabilities: {readonly resize: boolean};
  readonly structure: SheetStructureActions;
  readonly snapshot: EditingSnapshot<SheetSelection>;
  readonly selectedCells: ReadonlyArray<SheetCell>;
  selectedCellsIn(topology: SheetTopology): ReadonlyArray<SheetCell>;
  dispatch(intent: SheetIntent): EditingResult<SheetSelection>;
  copy(topology?: SheetTopology): SheetClipboard | null;
  cut(topology?: SheetTopology): { readonly clipboard: SheetClipboard; readonly result: EditingResult<SheetSelection> } | null;
  undo(): EditingResult<SheetSelection>;
  redo(): EditingResult<SheetSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<SheetSelection>) => void): () => void;
}
```
## `SheetEditorOptions`

```ts
interface SheetEditorOptions extends EditingHistoryOptions, SheetViewOptions {
  /** False for formats such as GFM that cannot persist row heights or column widths. */
  readonly resize?: boolean;
  readonly structure?: SheetStructurePolicy;
  /** Restore selection when projecting a new source snapshot; missing cells are reconciled. */
  readonly selection?: SheetSelection;
}
```
## `sheetEmbeddedDocumentType`

```ts
const sheetEmbeddedDocumentType: "sheet/1"
```
## `SheetGrid`

```ts
interface SheetGrid extends GridTopology {
  readonly rows:ReadonlyArray<SheetRow>;
  readonly columns:ReadonlyArray<SheetColumn>;
}
```
## `SheetIntent`

```ts
type SheetIntent =
  | SheetStructureIntent
  | { readonly type: "sheet.rename"; readonly name: string }
  | { readonly type: "column.resize"; readonly columnId: string; readonly width: number }
  | { readonly type: "row.resize"; readonly rowId: string; readonly height: number }
  | { readonly type: "selection.range"; readonly range: SheetRange }
  | { readonly type: "selection.row"; readonly rowId: string }
  | { readonly type: "selection.column"; readonly columnId: string }
  | { readonly type: "range.fill"; readonly source: SheetRange; readonly target: SheetRange; readonly topology?:SheetTopology }
  | { readonly type: "selection.navigate"; readonly direction: SheetTraversalDirection; readonly topology?: SheetTopology }
  | { readonly type: "selection.select-all"; readonly topology?: SheetTopology }
  | {
      readonly type: "selection.set";
      readonly rowId: string;
      readonly columnId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | {
      readonly type: "selection.fill";
      readonly value: JSONValue;
      readonly topology?: SheetTopology;
    }
  | {
      readonly type: "cell.commit";
      readonly rowId: string;
      readonly columnId: string;
      readonly value: JSONValue;
      readonly preserveSelection?: boolean;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: SheetClipboard;
      readonly topology?: SheetTopology;
    };
```
## `sheetNavigationTarget`

```ts
sheetNavigationTarget(topology: GridTopology, selection: SheetSelection, direction: SheetTraversalDirection): { readonly point: GridPoint; readonly preserveRange: boolean; } | null
```
## `SheetPlanResult`

```ts
type SheetPlanResult = {readonly ok:true;readonly plan:EditingPlan<SheetSelection>} | {readonly ok:false;readonly code:string};
```
## `SheetPoint`

```ts
interface SheetPoint extends Record<string, JSONValue> {
  readonly rowId: string;
  readonly columnId: string;
}
```
## `SheetRange`

```ts
interface SheetRange extends Record<string, JSONValue> {
  readonly anchor: SheetPoint;
  readonly focus: SheetPoint;
}
```
## `SheetRow`

```ts
type SheetRow = z.infer<typeof sheetRowSchema>;
```
## `SheetSelection`

```ts
interface SheetSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  /** Anchor of the primary range; focus is the active cell and may move inside that range. */
  readonly anchor: SheetPoint | null;
  readonly focus: SheetPoint | null;
  readonly ranges: ReadonlyArray<SheetRange>;
  readonly primaryIndex: number | null;
}
```
## `sheetSelectionSummary`

```ts
sheetSelectionSummary(editor: SheetEditor): { address: string; selected: number; filled: number; }
```
## `SheetStructureActions`

```ts
interface SheetStructureActions {
  readonly insertRow: SheetStructureIntent;
  readonly insertColumn: SheetStructureIntent;
  readonly deleteRow: SheetStructureIntent | null;
  readonly deleteColumn: SheetStructureIntent | null;
}
```
## `SheetStructureIntent`

```ts
type SheetStructureIntent =
  | { readonly type: "row.insert"; readonly index: number; readonly row?: SheetRow }
  | { readonly type: "row.delete"; readonly rowId: string }
  | { readonly type: "column.insert"; readonly index: number; readonly column?: SheetColumn }
  | { readonly type: "column.delete"; readonly columnId: string };
```
## `SheetStructurePolicy`

```ts
interface SheetStructurePolicy {
  readonly headerRows?: number;
  readonly minimumColumns?: number;
  readonly minimumRows?: number;
}
```
## `SheetTopology`

```ts
type SheetTopology = GridTopology;
```
## `SheetTraversalDirection`

```ts
type SheetTraversalDirection = "previous" | "next" | "up" | "down";
```
## `SheetViewOptions`

```ts
interface SheetViewOptions {
  readonly rowOrder?:ReadonlyArray<string>;
  readonly columnOrder?:ReadonlyArray<string>;
  readonly readOnly?:()=>boolean;
  readonly selection?:SheetSelection;
}
```
## `TextChange`

```ts
interface TextChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}
```
## `TextEdit`

```ts
interface TextEdit {
  readonly source: string;
  readonly before: string;
  readonly after: string;
}
```
## `TextEditor`

```ts
interface TextEditor {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly text: string;
  readonly snapshot: EditingSnapshot<TextSelection>;
  select(selection: TextSelection): EditingSnapshot<TextSelection>;
  replace(value: string, selection: TextSelection): EditingResult<TextSelection>;
  insert(text: string): EditingResult<TextSelection>;
  copy(): string;
  undo(): EditingResult<TextSelection>;
  redo(): EditingResult<TextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<TextSelection>) => void): () => void;
}
```
## `TextMove`

```ts
interface TextMove {
  readonly source: string;
  readonly text: string;
  readonly anchor: string;
  readonly placement: "before" | "after";
}
```
## `TextSelection`

```ts
type TextSelection = { readonly anchor: number; readonly focus: number };
```
## `transformAnnotationSelector`

```ts
transformAnnotationSelector(selector: AnnotationSelector, transform: AnnotationSelectorTransform): AnnotationSelector | null
```
## `TreeClipboard`

```ts
interface TreeClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.tree+json";
  readonly nodes: ReadonlyArray<TreeNode>;
  readonly text: string;
}
```
## `treeClipboardFormat`

```ts
const treeClipboardFormat: { mimeType: "application/vnd.interactive-os.tree+json"; parse(value: unknown): TreeClipboard | null; }
```
## `TreeDocument`

```ts
interface TreeDocument extends Record<string, JSONValue> {
  readonly nodes: ReadonlyArray<TreeNode>;
}
```
## `TreeEditor`

```ts
interface TreeEditor {
  readonly snapshot: EditingSnapshot<TreeSelection>;
  selectedNodeIdsIn(topology: TreeTopology): ReadonlyArray<string>;
  dispatch(intent: TreeIntent): EditingResult<TreeSelection>;
  copy(topology: TreeTopology): TreeClipboard | null;
  cut(topology: TreeTopology): { readonly clipboard: TreeClipboard; readonly result: EditingResult<TreeSelection> } | null;
  reconcile(topology: TreeTopology): EditingSnapshot<TreeSelection>;
  undo(): EditingResult<TreeSelection>;
  redo(): EditingResult<TreeSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<TreeSelection>) => void): () => void;
}
```
## `TreeIntent`

```ts
type TreeIntent =
  | { readonly type: "selection.select-all"; readonly topology: TreeTopology }
  | {
      readonly type: "selection.set";
      readonly nodeId: string;
      readonly topology: TreeTopology;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove"; readonly topology: TreeTopology }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: TreeClipboard;
      readonly topology: TreeTopology;
      readonly afterId?: string;
    };
```
## `TreeNode`

```ts
interface TreeNode extends Record<string, JSONValue> {
  readonly id: string;
  readonly parentId: string | null;
  readonly label: string;
}
```
## `TreePoint`

```ts
interface TreePoint extends Record<string, JSONValue> {
  readonly nodeId: string;
}
```
## `TreeRange`

```ts
interface TreeRange extends Record<string, JSONValue> {
  readonly anchor: TreePoint;
  readonly focus: TreePoint;
}
```
## `TreeSelection`

```ts
interface TreeSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<TreeRange>;
  readonly primaryIndex: number | null;
}
```
## `TreeTopology`

```ts
interface TreeTopology {
  readonly visibleIds: ReadonlyArray<string>;
}
```
## `TreeVisibility`

```ts
interface TreeVisibility {
  readonly rows: ReadonlyArray<TreeVisibilityRow>;
  readonly topology: TreeTopology;
}
```
## `TreeVisibilityNavigation`

```ts
type TreeVisibilityNavigation =
  | { readonly type: "move"; readonly direction: "previous" | "next" | "up" | "down" | "left" | "right" }
  | { readonly type: "boundary"; readonly edge: "start" | "end" };
```
## `treeVisibilityNeighbor`

```ts
treeVisibilityNeighbor(visibility: TreeVisibility, nodeId: string, navigation: TreeVisibilityNavigation): string | null
```
## `TreeVisibilityRow`

```ts
interface TreeVisibilityRow extends TreeNode {
  readonly depth: number;
  readonly posInSet: number;
  readonly setSize: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}
```
## `UIBuilderAction`

```ts
type UIBuilderAction = Record<string, JSONValue> & {
  readonly execution?: UIBuilderActionExecution;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: readonly DatabaseProperty[];
  readonly outputs: readonly DatabaseProperty[];
}
```
## `UIBuilderActionExecution`

```ts
interface UIBuilderActionExecution extends Record<string, JSONValue> {
  readonly skill: string;
  readonly tableId: string;
  readonly prompt: string;
  readonly inputFieldIds: readonly string[];
  readonly outputFieldIds: readonly string[];
  readonly requiredFieldIds: readonly string[];
}
```
## `UIBuilderConfiguration`

```ts
interface UIBuilderConfiguration {
  readonly connections?: readonly UIBuilderConnection[];
  readonly designId?: UIDesignId;
  readonly flow?: UIFlowLayout;
  /** Empty objectIds explicitly arranges the whole page. */
  readonly layout?: {readonly id: UILayoutId; readonly objectIds: readonly string[]};
}
```
## `UIBuilderConnection`

```ts
interface UIBuilderConnection {
  readonly objectId: string;
  readonly bindings: readonly UIComponentBinding[];
  /** Empty string disconnects the action. */
  readonly actionId: string;
}
```
## `UIBuilderField`

```ts
interface UIBuilderField extends DatabaseProperty { readonly sample: UIBuilderSampleKind; }
```
## `UIBuilderMaterialCommand`

```ts
type UIBuilderMaterialCommand =
  | { readonly type: "table.save"; readonly id: string; readonly name: string; readonly fields: readonly UIBuilderField[] }
  | { readonly type: "table.remove"; readonly id: string }
  | { readonly type: "table.data"; readonly id: string; readonly data: DatabaseDocument }
  | { readonly type: "table.generate"; readonly id: string; readonly count: number; readonly mode: "append" | "replace" }
  | { readonly type: "action.save"; readonly action: UIBuilderAction }
  | { readonly type: "action.remove"; readonly id: string };
```
## `UIBuilderProject`

```ts
interface UIBuilderProject extends CanvasDocument {
  readonly designId: UIDesignId;
  readonly flow: UIFlowLayout | null;
  readonly tables: readonly UIBuilderTable[];
  readonly actions: readonly UIBuilderAction[];
}
```
## `UIBuilderProjection`

```ts
interface UIBuilderProjection { readonly object: UIComponentObject; readonly issues: readonly string[]; readonly collection?: UIBuilderCollectionProjection; readonly recordIds?: readonly string[]; readonly selectionMissing: boolean; }
```
## `UIBuilderRecordSelection`

```ts
type UIBuilderRecordSelection = Readonly<Record<string, string>>;
```
## `UIBuilderSampleGenerator`

```ts
type UIBuilderSampleGenerator = (field: UIBuilderField) => JSONValue;
```
## `UIBuilderSampleKind`

```ts
type UIBuilderSampleKind = typeof uiBuilderSampleKinds[number];
```
## `uiBuilderSampleKinds`

```ts
const uiBuilderSampleKinds: readonly ["auto", "name", "email", "company", "product", "sentence", "date", "url"]
```
## `UIBuilderSkill`

```ts
type UIBuilderSkill = (request: UIBuilderSkillRequest) => Promise<Readonly<Record<string, JSONValue>>>;
```
## `UIBuilderSkillDefinition`

```ts
interface UIBuilderSkillDefinition { readonly id: string; readonly name: string; readonly description: string; readonly run: UIBuilderSkill; }
```
## `UIBuilderSkillRequest`

```ts
interface UIBuilderSkillRequest {
  readonly action: UIBuilderAction;
  readonly recordId: string;
  readonly input: Readonly<Record<string, JSONValue>>;
  readonly outputs: readonly UIBuilderField[];
  readonly signal: {readonly aborted: boolean};
}
```
## `UIBuilderTable`

```ts
interface UIBuilderTable extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly UIBuilderField[];
  readonly data: DatabaseDocument;
}
```


## UI Builder 등록·컬렉션·조합 API

- `applyUIBuilderComponentConfiguration` / `createUIBuilderComponentConfigurationTools`: 승인된 props·자식·다중 필드 매핑의 정본 설정 API.
- `projectDatabaseTable`: Database의 순수 검색·필터·정렬 투영. UI Builder 조회도 이 함수를 소비한다.
- `resolveUIBuilderCollection` / `resolveUIBuilderTableData`: 컬렉션과 표시 행 ID를 투영한다.
- `setUIBuilderComponentValue` / `commitUIBuilderCollection`: 입력·표 변경을 원본 데이터와 history에 반영한다.
- `uiBuilderComponentChildIds` / `getUIBuilderRootObjects` / `assertUIBuilderComposition` / `duplicateUIBuilderComposition`: 조합의 참조·루트·유효성·복제 계약.

`resolveUIBuilderCollection`의 projection은 `tableId`, `name`, `document`, `fieldIds`,
`selectedRecordId`를 제공한다. `document`의 schema와 view columns는 모든 원본 필드를
유지하고 표시 대상 밖의 필드는 숨긴다. `selectedRecordId`는 공유 선택의 행 ID이며
표 adapter가 `DatabaseHand.selectedRecordId`로 연결한다. 표 초기화·외부 선택 복원은
사용자 선택 콜백을 발생시키지 않는다.

세부 계약은 [UI Builder 컴포넌트 카탈로그](ui-builder-component-catalog.md),
Usage와 Source는 `/applications/ui-builder?example=catalog&new=1`에서 확인한다.

## resolveUIBuilderActionPrerequisites

`resolveUIBuilderActionPrerequisites(project, actionId, selection?)`는 실행할 레코드와 requiredFieldIds를 읽어 `{ok:true}` 또는 `{ok:false,reason}`을 반환한다. 상태를 변경하거나 스킬을 호출하지 않는다. 실제 실행과 UI command가 같은 필수 입력 판정을 소비한다. 필수 조건 충족이 등록 스킬의 실행 성공을 보장하지는 않는다.

`UIBuilderConfiguration.childOrders`는 `{objectId, slot, objectIds}` 배열이며
slot은 childIds/toolbarIds/inspectorIds다. `applyUIBuilderConfiguration`은 현재
페이지의 기존 슬롯 구성원을 보존하는 순열만 허용하고 flow와 원자적으로 적용한다.
`arrange_ui_builder`의 childOrders는 같은 계약을 사용하며 빈 배열은 기존 순서 보존이다.

`read_ui_builder_layout`의 `executionContract`는 자유 편집 geometry를
`intent-sketch`로, 실행 반영을 `responsive-flow`로 선언한다. 에이전트는 좌표를
복사하지 않고 그룹·순서·강조·비중을 해석해 기존 JSON 문서의 flow를 수정한다.
콘텐츠·데이터·바인딩·액션·실행 상태는 보존한다.

`UIBuilderProjection.selectionMissing`는 현재 선택행을 필요로 하는 value binding,
detail-list 또는 action이 선택 없이 표시되는지 알려줍니다. 고정 recordId와
목록·집계는 현재 선택을 필요로 하지 않습니다. 저장 문서나 값은 변경하지 않습니다.

## createUIBuilderRecordSelection

`createUIBuilderRecordSelection(project): UIBuilderRecordSelection`는 테이블별 최초
레코드 ID 또는 명시적 빈 선택을 만든다. 이후 필터나 데이터 변경이 암묵적인
첫 행을 다른 행으로 해석하지 않도록 Workspace와 Runtime이 같은 factory를 소비한다.

`UIBuilderCollectionProjection.selectionOutsideQuery?: boolean`은 선택한 원본
레코드가 존재하지만 현재 query 결과에는 없는 상태다. 명시적 빈 선택이나 삭제된
레코드를 필터 제외로 오인하지 않는다. UIBuilder의 컬렉션 Usage가 실제 조건일
때만 안내하며 현재 선택을 다른 레코드로 변경하지 않는다.

`createUIBuilderCatalogTools(editor, {dataPresentations?: readonly JSONValue[]})`는 Host가 주입한 표현 계약을 read catalog 응답에 포함합니다. 도메인 의미와 읽기/쓰기를 먼저 구분하며 React 구현을 소유하거나 자동 추론하지 않습니다. UI Primitives 소유 계약을 Host가 주입합니다.

## applyUIBuilderScreen / createUIBuilderScreenTools

```ts
applyUIBuilderScreen(editor: ObjectEditor, plan: UIBuilderScreenPlan): ReturnType<ObjectEditor["dispatch"]> | {ok: false; reason: string}
createUIBuilderScreenTools(editor: ObjectEditor, options?: {pageId?: string; dataPresentations?: readonly JSONValue[]}): readonly {name: string; description: string; parameters: object; execute(args: unknown): unknown}[]
```

`UIBuilderScreenPlan`은 pageId, materials(기존 UIBuilderMaterialCommand[]), components(id/text + 기존 UIComponentContent, pageId 제외), flow(UIFlowLayout)를 포함한다. 계획의 id는 자식 및 flow 참조에 사용한다. 하나의 요청에서 한 번 제출하며 실패·stale·재호출은 실제 문서를 변경하지 않는다. 상세 계약은 [UI Builder](ui-builder.md#화면-한-번-제출)에 있다.

## uiBuilderContentStructure

화면 콘텐츠를 관계별로 구조화하고 표현 이유에 따라 정본 UI를 선택하는 작성 지침 상수다. `createUIBuilderScreenTools` 문맥과 `read_ui_builder_catalogs` 응답이 같은 상수를 제공한다. 정책·도메인 모델 또는 자동 컴포넌트 판별기가 아니다. 상세 계약은 [UI Builder](ui-builder.md#콘텐츠-관계에서-ui-선택)에 있다.


## UI Builder 기록 추가

`appendUIBuilderActivity(editor, composerId, body)`는 `comment-composer`의 `props.targetId`가 가리키는 기존 `activity-feed`에 새 기록을 추가한다. `props.actor`는 작성자가 명시한 표시명이며 비어 있으면 거부한다. 새 ID와 실제 시각은 명령이 생성하고 기존 `entries.items`는 보존한다. 한 번의 document.replace로 undo 가능하다. 대상·본문·작성자 검증 실패 시 `{ok:false,reason}`를 반환하며 컴포저는 초안을 유지한다. 외부 서비스 호출이나 Database 행 생성 계약이 아니다.

Usage: [빌더 카탈로그](/applications/ui-builder?example=catalog)의 입력·행동 페이지에서 메모 저장 후 같은 페이지의 작성한 기록을 확인한다. RuntimeHand는 이 공개 API를 호출하고 Canvas는 동일한 CommentComposer와 ActivityFeed를 렌더링한다. 소스: `packages/json-document-editing/src/ui-builder-runtime.ts`.
