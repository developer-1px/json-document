# @interactive-os/json-document-calendar-document API

**탐색 분류:** Document Types

Calendar 문서 모델·검증·의미 연산·projection 계약의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-calendar-document/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `addCalendarDate`

```ts
addCalendarDate(day: string, days: number): string | null
```
## `assertCalendarDocument`

```ts
assertCalendarDocument(value: unknown): void
```
## `calendarAllDayLayout`

```ts
calendarAllDayLayout(events: ReadonlyArray<CalendarEvent>, days: ReadonlyArray<string>): ReadonlyArray<{ readonly event: CalendarEvent; readonly startIndex: number; readonly span: number; readonly lane: number; readonly laneCount: number; }>
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
## `calendarDatePart`

```ts
calendarDatePart(value: string): string
```
## `calendarDaysBetween`

```ts
calendarDaysBetween(from: Temporal.PlainDate, to: Temporal.PlainDate): number
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
## `calendarDocumentEvents`

```ts
calendarDocumentEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent>
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
## `calendarEventBounds`

```ts
calendarEventBounds(event: Pick<CalendarEvent, "start" | "end" | "allDay">): { readonly from: Temporal.PlainDateTime; readonly to: Temporal.PlainDateTime; } | null
```
## `calendarEventExcludeDates`

```ts
calendarEventExcludeDates(event: CalendarEvent): ReadonlyArray<string>
```
## `calendarEventIntervalAt`

```ts
calendarEventIntervalAt(event: Pick<CalendarEvent, "start" | "end" | "allDay">, start: string): { readonly start: string; readonly end: string; } | null
```
## `CalendarEventOperation`

```ts
type CalendarEventOperation =
  | {
      readonly type: "event.create";
      readonly start: string;
      readonly end: string;
      readonly title?: string;
      readonly allDay?: boolean;
      readonly calendarId?: string;
      readonly recurrence?: CalendarRecurrence | null;
    }
  | { readonly type: "event.move"; readonly eventId: string; readonly start: string }
  | { readonly type: "event.resize"; readonly eventId: string; readonly edge: "start" | "end"; readonly instant: string }
  | { readonly type: "event.move-day"; readonly eventId: string; readonly day: string }
  | {
      readonly type: "event.update";
      readonly eventId: string;
      readonly title?: string;
      readonly start?: string;
      readonly end?: string;
      readonly allDay?: boolean;
      readonly calendarId?: string;
      readonly recurrence?: CalendarRecurrence | null;
    }
  | {
      readonly type: "occurrence.edit";
      readonly eventId: string;
      readonly occurrenceStart: string;
      readonly scope: "this" | "this-and-following" | "all";
      readonly title?: string;
      readonly start?: string;
      readonly end?: string;
    };
```
## `CalendarEventPlan`

```ts
type CalendarEventPlan = {
  readonly ok: true;
  readonly events: ReadonlyArray<CalendarEvent>;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly affectedOccurrence: CalendarOccurrencePoint;
} | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `calendarEventRecurrence`

```ts
calendarEventRecurrence(event: CalendarEvent): CalendarRecurrence | null
```
## `calendarEventsInMonth`

```ts
calendarEventsInMonth(events: ReadonlyArray<CalendarEvent>, month: string): ReadonlyArray<CalendarEvent>
```
## `calendarEventsOnDay`

```ts
calendarEventsOnDay(events: ReadonlyArray<CalendarEvent>, day: string): ReadonlyArray<CalendarEvent>
```
## `CalendarEventsPlan`

```ts
type CalendarEventsPlan = (Extract<CalendarPatchPlan, { ok: true }> & { readonly events: ReadonlyArray<CalendarEvent> })
  | Extract<CalendarPatchPlan, { ok: false }>;
```
## `calendarInstantAt`

```ts
calendarInstantAt(day: string, minutesFromMidnight: number): string | null
```
## `calendarIntervalLastDate`

```ts
calendarIntervalLastDate(start: string, end: string, allDay: boolean): string
```
## `calendarMinutesBetween`

```ts
calendarMinutesBetween(from: Temporal.PlainDateTime, to: Temporal.PlainDateTime): number
```
## `calendarMonthDayLayout`

```ts
calendarMonthDayLayout(events: ReadonlyArray<CalendarEvent>, day: string, rowLimit: number): { readonly events: ReadonlyArray<CalendarEvent>; readonly hiddenCount: number; }
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
## `CalendarOccurrenceInterval`

```ts
interface CalendarOccurrenceInterval {
  readonly eventId: string;
  readonly start: string;
  readonly end: string;
}
```
## `CalendarOccurrencePoint`

```ts
interface CalendarOccurrencePoint extends Record<string, JSONValue> {
  readonly eventId: string;
  readonly occurrenceStart: string;
}
```
## `CalendarOccurrenceRemoval`

```ts
type CalendarOccurrenceRemoval = {
  readonly eventId: string;
  readonly occurrenceStart: string;
  readonly scope: "this" | "this-and-following" | "all";
};
```
## `CalendarPatchPlan`

```ts
type CalendarPatchPlan = { readonly ok: true; readonly operations: ReadonlyArray<JSONPatchOperation> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
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
## `calendarShiftInstant`

```ts
calendarShiftInstant(instant: string, minutes: number): string | null
```
## `calendarTimedLayout`

```ts
calendarTimedLayout(events: ReadonlyArray<CalendarEvent>, day: string): ReadonlyArray<{ readonly event: CalendarEvent; readonly startMinutes: number; readonly endMinutes: number; readonly lane: number; readonly laneCount: number; }>
```
## `CalendarValidationResult`

```ts
type CalendarValidationResult = { readonly ok: true } | {
  readonly ok: false; readonly code: string; readonly reason: string;
};
```
## `calendarVisibleEvents`

```ts
calendarVisibleEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent>
```
## `formatCalendarDate`

```ts
formatCalendarDate(value: Temporal.PlainDate): string
```
## `formatCalendarInstant`

```ts
formatCalendarInstant(value: Temporal.PlainDateTime): string
```
## `isCalendarAllDay`

```ts
isCalendarAllDay(event: Pick<CalendarEvent, "allDay">): boolean
```
## `isCalendarRecurrence`

```ts
isCalendarRecurrence(value: unknown): value is CalendarRecurrence
```
## `parseCalendarDate`

```ts
parseCalendarDate(value: string): Temporal.PlainDate | null
```
## `parseCalendarInstant`

```ts
parseCalendarInstant(value: string): Temporal.PlainDateTime | null
```
## `planCalendarEventEdit`

```ts
planCalendarEventEdit(events: ReadonlyArray<CalendarEvent>, intent: CalendarEventOperation, options: { readonly allocateId: () => string; readonly calendarIds?: ReadonlySet<string>; readonly defaultCalendarId?: string; }): CalendarEventPlan
```
## `planCalendarEventRemoval`

```ts
planCalendarEventRemoval(events: ReadonlyArray<CalendarEvent>, eventIds: ReadonlyArray<string>): CalendarEventsPlan
```
## `planCalendarOccurrenceRemoval`

```ts
planCalendarOccurrenceRemoval(events: ReadonlyArray<CalendarEvent>, removal: CalendarOccurrenceRemoval): CalendarEventsPlan
```
## `planCalendarVisibility`

```ts
planCalendarVisibility(document: CalendarDocument, calendarId: string, hidden: boolean): CalendarPatchPlan
```
## `projectCalendarOccurrences`

```ts
projectCalendarOccurrences(events: ReadonlyArray<CalendarEvent>, rangeStart: string, rangeEnd: string): ReadonlyArray<CalendarOccurrence>
```
## `resolveCalendarOccurrence`

```ts
resolveCalendarOccurrence(events: ReadonlyArray<CalendarEvent>, point: CalendarOccurrencePoint): CalendarOccurrenceInterval | null
```
## `validateCalendarDocument`

```ts
validateCalendarDocument(value: unknown): CalendarValidationResult
```
## `validateCalendarEvent`

```ts
validateCalendarEvent(value: unknown, calendarIds?: ReadonlySet<string>): CalendarValidationResult
```
