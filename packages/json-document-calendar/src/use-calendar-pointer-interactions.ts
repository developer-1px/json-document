import { useState, type PointerEvent } from "react";
import {
  addCalendarDate, bindCalendarAllDayIntent, bindCalendarMonthIntent, bindCalendarTimeGridIntent,
  calendarEventsOnDay, calendarInstantAt, calendarShiftInstant, calendarVisibleEvents,
  interpretCalendarAllDayPointer, interpretCalendarMonthPointer, interpretCalendarTimeGridPointer,
  type CalendarAllDayPointerRelease, type CalendarIntent, type CalendarTimeGridHandle,
  type CalendarTimeGridPointerRelease,
} from "@interactive-os/json-document-editing";
import {
  calendarDayDeltaFromWebWidth, calendarMinutesFromWebGrid, createWebPointerSession, findWebPointTarget,
} from "@interactive-os/json-document-web";
import type { CalendarHand } from "./use-calendar-hand.js";

export type CalendarPointerPolicy = {
  readonly hourStart: number;
  readonly hourEnd: number;
  readonly stepMinutes: number;
  readonly pixelsPerHour: number;
  readonly onMonthPointerBegin?: () => void;
};

type Phase = "preview" | "commit";
type TimeRelease = CalendarTimeGridPointerRelease & { readonly originEventEnd: string | null };
type AllDayRelease = CalendarAllDayPointerRelease & { readonly originEventEnd: string | null };
type MonthRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
  readonly originEventStart: string | null;
  readonly originEventEnd: string | null;
  readonly targetDay: string;
  readonly eventsOnTargetDay: ReadonlyArray<{ readonly id: string }>;
};

export interface CalendarPointerInteractions {
  instantAt(day: string, clientY: number, grid: Element): string | null;
  timePointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null, handle: CalendarTimeGridHandle | null): void;
  timePointerMove(event: PointerEvent<HTMLElement>): void;
  timePointerUp(event: PointerEvent<HTMLElement>): void;
  allDayPointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null, handle: "body" | "start" | "end" | null): void;
  allDayPointerMove(event: PointerEvent<HTMLElement>): void;
  allDayPointerUp(event: PointerEvent<HTMLElement>): void;
  monthPointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null): void;
  monthPointerMove(event: PointerEvent<HTMLElement>): void;
  monthPointerUp(event: PointerEvent<HTMLElement>): void;
  cancelTimePointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  cancelAllDayPointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  cancelMonthPointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  resizeTimed(id: string, edge: "start" | "end", occurrenceStart: string, origin: string, delta: number, phase: Phase): void;
  resizeAllDay(id: string, edge: "start" | "end", originDay: string, occurrenceStart: string, delta: number, phase: Phase): void;
}

/** Owns Calendar's Web pointer preview, commit, cancel, and resize lifecycle. */
export function useCalendarPointerInteractions(hand: CalendarHand, policy: CalendarPointerPolicy): CalendarPointerInteractions {
  const [timePointer] = useState(() => createWebPointerSession<TimeRelease>());
  const [allDayPointer] = useState(() => createWebPointerSession<AllDayRelease>());
  const [monthPointer] = useState(() => createWebPointerSession<MonthRelease>());
  const document = hand.document;
  const visibleEvents = calendarVisibleEvents(document);

  function remember(intent: CalendarIntent | null, start: string | null, end: string | null): void {
    hand.dispatch(intent);
    hand.rememberIntent(intent, { start, end });
  }

  function bindTime(intent: ReturnType<typeof interpretCalendarTimeGridPointer>, occurrenceStart: string | null) {
    const id = intent?.type === "event.move" || intent?.type === "event.resize" ? intent.eventId : null;
    return bindCalendarTimeGridIntent(intent, id === null ? undefined : document.events.find((item) => item.id === id), occurrenceStart, hand.scope);
  }

  function instantAt(day: string, clientY: number, grid: Element): string | null {
    return calendarInstantAt(day, calendarMinutesFromWebGrid(clientY, grid.getBoundingClientRect(), {
      hourStart: policy.hourStart, hourEnd: policy.hourEnd, stepMinutes: policy.stepMinutes,
    }));
  }

  function commitAllDay(release: CalendarAllDayPointerRelease): void {
    hand.setAllDayPreview(null);
    if (release.originEventId === null) return;
    const event = document.events.find((item) => item.id === release.originEventId);
    const intent = bindCalendarAllDayIntent(interpretCalendarAllDayPointer(release), event, release.originEventStart, hand.scope);
    remember(intent, release.originEventStart, event?.end ?? null);
  }

  function timePointerDown(event: PointerEvent<HTMLElement>, day: string, originEventId: string | null, originEventStart: string | null, originEventEnd: string | null, originHandle: CalendarTimeGridHandle | null): void {
    if (event.button !== 0) return;
    const grid = event.currentTarget.closest('[data-calendar-grid="time"]');
    if (grid === null) return;
    const originInstant = instantAt(day, event.clientY, grid);
    if (originInstant === null) return;
    const release = { originInstant, originEventId, originEventStart, originEventEnd, originHandle, targetInstant: originInstant };
    timePointer.begin(event.currentTarget, event.pointerId, release);
    hand.setTimePreview(release);
  }

  function timePointerMove(event: PointerEvent<HTMLElement>): void {
    if (timePointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const grid = findWebPointTarget<Element>('[data-calendar-grid="time"]', { x: event.clientX, y: event.clientY });
    const day = grid?.getAttribute("data-calendar-day");
    if (grid == null || day == null) return;
    const targetInstant = instantAt(day, event.clientY, grid);
    if (targetInstant === null) return;
    const next = timePointer.preview(event.pointerId, (state) => ({ ...state, targetInstant }));
    if (next !== null) hand.setTimePreview(next);
  }

  function timePointerUp(event: PointerEvent<HTMLElement>): void {
    const release = timePointer.commit(event.pointerId);
    hand.setTimePreview(null);
    if (release === null) return;
    remember(bindTime(interpretCalendarTimeGridPointer(release), release.originEventStart), release.originEventStart, release.originEventEnd);
  }

  function allDayPointerDown(event: PointerEvent<HTMLElement>, originDay: string, originEventId: string | null, originEventStart: string | null, originEventEnd: string | null, originHandle: "body" | "start" | "end" | null): void {
    if (event.button !== 0) return;
    const release = { originDay, originEventId, originEventStart, originEventEnd, originHandle, targetDay: originDay };
    allDayPointer.begin(event.currentTarget, event.pointerId, release);
    hand.setAllDayPreview(release);
  }

  function allDayPointerMove(event: PointerEvent<HTMLElement>): void {
    if (allDayPointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-allday-day");
    if (targetDay == null) return;
    const next = allDayPointer.preview(event.pointerId, (state) => ({ ...state, targetDay }));
    if (next !== null) hand.setAllDayPreview(next);
  }

  function allDayPointerUp(event: PointerEvent<HTMLElement>): void {
    const release = allDayPointer.commit(event.pointerId);
    hand.setAllDayPreview(null);
    if (release === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-allday-day");
    if (targetDay == null) return;
    const raw = interpretCalendarAllDayPointer({ ...release, targetDay });
    const id = raw?.type === "event.move-day" || raw?.type === "event.resize" ? raw.eventId : null;
    const intent = bindCalendarAllDayIntent(raw, id === null ? undefined : document.events.find((item) => item.id === id), release.originEventStart, hand.scope);
    remember(intent, release.originEventStart, release.originEventEnd);
  }

  function monthPointerDown(event: PointerEvent<HTMLElement>, originDay: string, originEventId: string | null, originEventStart: string | null, originEventEnd: string | null): void {
    if (event.button !== 0) return;
    policy.onMonthPointerBegin?.();
    const release = { originDay, originEventId, originEventStart, originEventEnd, targetDay: originDay, eventsOnTargetDay: [] };
    monthPointer.begin(event.currentTarget, event.pointerId, release);
    hand.setMonthPreview(release);
  }

  function monthPointerMove(event: PointerEvent<HTMLElement>): void {
    if (monthPointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-day");
    if (targetDay == null) return;
    const next = monthPointer.preview(event.pointerId, (state) => ({ ...state, targetDay }));
    if (next !== null) hand.setMonthPreview({ ...next, eventsOnTargetDay: [] });
  }

  function monthPointerUp(event: PointerEvent<HTMLElement>): void {
    const release = monthPointer.commit(event.pointerId);
    hand.setMonthPreview(null);
    if (release === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-day");
    if (targetDay == null) return;
    const raw = interpretCalendarMonthPointer({ ...release, targetDay, eventsOnTargetDay: calendarEventsOnDay(visibleEvents, targetDay).map(({ id }) => ({ id })) });
    const id = raw?.type === "event.move-day" ? raw.eventId : null;
    const intent = bindCalendarMonthIntent(raw, id === null ? undefined : document.events.find((item) => item.id === id), release.originEventStart, hand.scope);
    remember(intent, release.originEventStart, release.originEventEnd);
  }

  function resizeTimed(id: string, edge: "start" | "end", occurrenceStart: string, origin: string, delta: number, phase: Phase): void {
    const minutes = Math.round(delta / (policy.pixelsPerHour / 60) / policy.stepMinutes) * policy.stepMinutes;
    const targetInstant = calendarShiftInstant(origin, minutes);
    if (targetInstant === null) return;
    const release = { originInstant: origin, originEventId: id, originEventStart: occurrenceStart, originHandle: edge, targetInstant };
    if (phase === "preview") return hand.setTimePreview(release);
    hand.setTimePreview(null);
    remember(bindTime(interpretCalendarTimeGridPointer(release), occurrenceStart), occurrenceStart, targetInstant);
  }

  function resizeAllDay(id: string, edge: "start" | "end", originDay: string, occurrenceStart: string, delta: number, phase: Phase): void {
    const column = globalThis.document.querySelector("[data-calendar-allday-day]") ?? globalThis.document.querySelector("[data-calendar-week] [data-calendar-day]");
    const targetDay = addCalendarDate(originDay, calendarDayDeltaFromWebWidth(delta, column?.getBoundingClientRect().width ?? 0));
    if (targetDay === null) return;
    const release = { originDay, originEventId: id, originEventStart: occurrenceStart, originHandle: edge, targetDay };
    if (phase === "preview") return hand.setAllDayPreview(release);
    commitAllDay(release);
  }

  function cancelTimePointer(pointerId: number, reason: "cancel" | "lost-capture" = "cancel"): void {
    timePointer.cancel(pointerId, reason);
    hand.setTimePreview(null);
  }

  function cancelAllDayPointer(pointerId: number, reason: "cancel" | "lost-capture" = "cancel"): void {
    allDayPointer.cancel(pointerId, reason);
    hand.setAllDayPreview(null);
  }

  function cancelMonthPointer(pointerId: number, reason: "cancel" | "lost-capture" = "cancel"): void {
    monthPointer.cancel(pointerId, reason);
    hand.setMonthPreview(null);
  }

  return { instantAt, timePointerDown, timePointerMove, timePointerUp, allDayPointerDown, allDayPointerMove, allDayPointerUp, monthPointerDown, monthPointerMove, monthPointerUp, cancelTimePointer, cancelAllDayPointer, cancelMonthPointer, resizeTimed, resizeAllDay };
}
