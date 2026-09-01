import { useRef, useState, type PointerEvent } from "react";
import { createGestureSession } from "@interactive-os/json-document-affordance";
import {
  addCalendarDate, bindCalendarAllDayIntent, bindCalendarMonthIntent, bindCalendarTimeGridIntent,
  calendarEventsOnDay, calendarInstantAt, calendarShiftInstant, calendarVisibleEvents,
  interpretCalendarAllDayPointer, interpretCalendarMonthPointer, interpretCalendarTimeGridPointer,
  type CalendarAllDayPointerRelease, type CalendarIntent, type CalendarTimeGridHandle,
  type CalendarTimeGridPointerRelease,
  type CalendarSelectionDragSource,
} from "@interactive-os/json-document-editing";
import {
  calendarDayDeltaFromWebWidth, calendarKeyFromWebRow, calendarMinutesFromWebGrid,
  createWebPointerSession, findWebPointTarget,
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
type DragCandidate = { readonly eventId: string; readonly occurrenceStart: string };
type TimeRelease = CalendarTimeGridPointerRelease & { readonly originEventEnd: string | null; readonly dragCandidate: DragCandidate | null; readonly dragSource: CalendarSelectionDragSource | null };
type AllDayRelease = CalendarAllDayPointerRelease & { readonly originEventEnd: string | null; readonly dragCandidate: DragCandidate | null; readonly dragSource: CalendarSelectionDragSource | null };
type MonthRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
  readonly originEventStart: string | null;
  readonly originEventEnd: string | null;
  readonly targetDay: string;
  readonly eventsOnTargetDay: ReadonlyArray<{ readonly id: string }>;
  readonly dragSource: CalendarSelectionDragSource | null;
  readonly dragCandidate: DragCandidate | null;
};
type CalendarSelectionDragGesture = {
  readonly type: "calendar-selection-drag";
  readonly source: CalendarSelectionDragSource;
  readonly target: { readonly type: "instant"; readonly instant: string } | { readonly type: "day"; readonly day: string };
};

export interface CalendarPointerInteractions {
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

/** Owns Calendar's Web pointer preview, commit, cancel, and resize lifecycle. */
export function useCalendarPointerInteractions(hand: CalendarHand, policy: CalendarPointerPolicy): CalendarPointerInteractions {
  const [timePointer] = useState(() => createWebPointerSession<TimeRelease>());
  const [allDayPointer] = useState(() => createWebPointerSession<AllDayRelease>());
  const [monthPointer] = useState(() => createWebPointerSession<MonthRelease>());
  const [selectionDrag] = useState(() => createGestureSession<CalendarSelectionDragGesture>());
  const suppressEventClick = useRef(false);
  const suppressEventDoubleClick = useRef(false);
  const [hoveredTime, setHoveredTime] = useState<CalendarPointerInteractions["hoveredTime"]>(null);
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
    event.currentTarget.focus();
    const grid = event.currentTarget.closest('[data-calendar-grid="time"]');
    if (grid === null) return;
    const originInstant = instantAt(day, event.clientY, grid);
    if (originInstant === null) return;
    const dragCandidate = originHandle === "body" && originEventId !== null && originEventStart !== null
      ? { eventId: originEventId, occurrenceStart: originEventStart }
      : null;
    const release = { originInstant, originEventId, originEventStart, originEventEnd, originHandle, targetInstant: originInstant, dragCandidate, dragSource: null };
    timePointer.begin(event.currentTarget, event.pointerId, release);
    hand.setTimePreview(release);
  }

  function timePointerMove(event: PointerEvent<HTMLElement>): void {
    const grid = findWebPointTarget<Element>('[data-calendar-grid="time"]', { x: event.clientX, y: event.clientY });
    const day = grid?.getAttribute("data-calendar-day");
    if (grid == null || day == null) return;
    if (timePointer.getSnapshot()?.pointerId !== event.pointerId) {
      const target = event.target as { closest?: (selector: string) => Element | null };
      if (target.closest?.("[data-calendar-event]") != null) return setHoveredTime(null);
      const minutes = calendarMinutesFromWebGrid(event.clientY, grid.getBoundingClientRect(), {
        hourStart: policy.hourStart, hourEnd: policy.hourEnd, stepMinutes: policy.stepMinutes,
      });
      const instant = calendarInstantAt(day, minutes);
      setHoveredTime(instant === null ? null : { day, instant, minutes });
      return;
    }
    setHoveredTime(null);
    const targetGridMinutes = calendarMinutesFromWebGrid(event.clientY, grid.getBoundingClientRect(), {
      hourStart: policy.hourStart, hourEnd: policy.hourEnd, stepMinutes: policy.stepMinutes,
    });
    const targetInstant = calendarInstantAt(day, targetGridMinutes);
    if (targetInstant === null) return;
    const next = timePointer.preview(event.pointerId, (state) => {
      const dragSource = state.dragSource ?? (state.dragCandidate !== null && targetInstant !== state.originInstant
        ? hand.prepareSelectionDrag(state.dragCandidate.eventId, state.dragCandidate.occurrenceStart)
        : null);
      return { ...state, targetInstant, dragSource };
    });
    if (next?.dragSource !== null && next?.dragSource !== undefined) {
      const originAnchor = next.dragSource.anchor.occurrenceStart;
      const move = interpretCalendarTimeGridPointer(next);
      if (move?.type !== "event.move") return;
      if (selectionDrag.getActive() === null) selectionDrag.begin({ type: "calendar-selection-drag", source: next.dragSource, target: { type: "instant", instant: originAnchor } });
      const gesture = selectionDrag.preview((active) => ({ ...active, target: { type: "instant", instant: move.start } }));
      hand.previewSelectionDrag(gesture);
    } else if (next !== null) hand.setTimePreview(next);
  }

  function timePointerUp(event: PointerEvent<HTMLElement>): void {
    const release = timePointer.commit(event.pointerId);
    hand.setTimePreview(null);
    if (release === null) return;
    if (release.dragSource !== null) {
      suppressEventClick.current = true;
      suppressDoubleClickBriefly();
      const gesture = selectionDrag.commit();
      if (gesture !== null) hand.commitSelectionDrag(gesture);
      return;
    }
    if (release.dragCandidate !== null) return;
    if (release.originEventId === null && release.originInstant === release.targetInstant) {
      hand.dispatch({ type: "selection.clear" });
      hand.setOccurrence({ start: release.targetInstant, end: release.targetInstant });
      return;
    }
    remember(bindTime(interpretCalendarTimeGridPointer(release), release.originEventStart), release.originEventStart, release.originEventEnd);
  }

  function allDayPointerDown(event: PointerEvent<HTMLElement>, originDay: string, originEventId: string | null, originEventStart: string | null, originEventEnd: string | null, originHandle: "body" | "start" | "end" | null): void {
    if (event.button !== 0) return;
    event.currentTarget.focus();
    const dragCandidate = originHandle === "body" && originEventId !== null && originEventStart !== null
      ? { eventId: originEventId, occurrenceStart: originEventStart }
      : null;
    const release = { originDay, originEventId, originEventStart, originEventEnd, originHandle, targetDay: originDay, dragCandidate, dragSource: null };
    allDayPointer.begin(event.currentTarget, event.pointerId, release);
    hand.setAllDayPreview(release);
  }

  function allDayPointerMove(event: PointerEvent<HTMLElement>): void {
    if (allDayPointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-allday-day");
    if (targetDay == null) return;
    const next = allDayPointer.preview(event.pointerId, (state) => {
      const dragSource = state.dragSource ?? (state.dragCandidate !== null && targetDay !== state.originDay
        ? hand.prepareSelectionDrag(state.dragCandidate.eventId, state.dragCandidate.occurrenceStart)
        : null);
      return { ...state, targetDay, dragSource };
    });
    if (next?.dragSource !== null && next?.dragSource !== undefined) {
      if (selectionDrag.getActive() === null) selectionDrag.begin({ type: "calendar-selection-drag", source: next.dragSource, target: { type: "day", day: next.originDay } });
      const gesture = selectionDrag.preview((active) => ({ ...active, target: { type: "day", day: targetDay } }));
      hand.previewSelectionDrag(gesture);
    } else if (next !== null) hand.setAllDayPreview(next);
  }

  function allDayPointerUp(event: PointerEvent<HTMLElement>): void {
    const release = allDayPointer.commit(event.pointerId);
    hand.setAllDayPreview(null);
    if (release === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-allday-day");
    if (targetDay == null) return;
    if (release.dragSource !== null) {
      suppressEventClick.current = true;
      suppressDoubleClickBriefly();
      const gesture = selectionDrag.commit();
      if (gesture !== null) hand.commitSelectionDrag({ ...gesture, target: { type: "day", day: targetDay } });
      return;
    }
    if (release.dragCandidate !== null) return;
    const raw = interpretCalendarAllDayPointer({ ...release, targetDay });
    if (release.originEventId === null && release.originDay === targetDay) {
      hand.dispatch({ type: "selection.clear" });
      hand.setOccurrence({ start: targetDay, end: targetDay });
      return;
    }
    const id = raw?.type === "event.move-day" || raw?.type === "event.resize" ? raw.eventId : null;
    const intent = bindCalendarAllDayIntent(raw, id === null ? undefined : document.events.find((item) => item.id === id), release.originEventStart, hand.scope);
    remember(intent, release.originEventStart, release.originEventEnd);
  }

  function monthPointerDown(event: PointerEvent<HTMLElement>, fallbackDay: string, rowDays: ReadonlyArray<string>, originEventId: string | null, originEventStart: string | null, originEventEnd: string | null): void {
    if (event.button !== 0) return;
    event.currentTarget.focus();
    const row = event.currentTarget.closest("[data-calendar-week]");
    const originDay = row === null
      ? fallbackDay
      : calendarKeyFromWebRow(event.clientX, row.getBoundingClientRect(), rowDays) ?? fallbackDay;
    policy.onMonthPointerBegin?.();
    const dragCandidate = originEventId !== null && originEventStart !== null
      ? { eventId: originEventId, occurrenceStart: originEventStart }
      : null;
    const release = { originDay, originEventId, originEventStart, originEventEnd, targetDay: originDay, eventsOnTargetDay: [], dragCandidate, dragSource: null };
    monthPointer.begin(event.currentTarget, event.pointerId, release);
    hand.setMonthPreview(release);
  }

  function monthPointerMove(event: PointerEvent<HTMLElement>): void {
    if (monthPointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-day");
    if (targetDay == null) return;
    const next = monthPointer.preview(event.pointerId, (state) => {
      const dragSource = state.dragSource ?? (state.dragCandidate !== null && targetDay !== state.originDay
        ? hand.prepareSelectionDrag(state.dragCandidate.eventId, state.dragCandidate.occurrenceStart)
        : null);
      return { ...state, targetDay, dragSource };
    });
    if (next?.dragSource !== null && next?.dragSource !== undefined) {
      if (selectionDrag.getActive() === null) selectionDrag.begin({ type: "calendar-selection-drag", source: next.dragSource, target: { type: "day", day: next.originDay } });
      const gesture = selectionDrag.preview((active) => ({ ...active, target: { type: "day", day: targetDay } }));
      hand.previewSelectionDrag(gesture);
    } else if (next !== null) hand.setMonthPreview({ ...next, eventsOnTargetDay: [] });
  }

  function monthPointerUp(event: PointerEvent<HTMLElement>): void {
    const release = monthPointer.commit(event.pointerId);
    hand.setMonthPreview(null);
    if (release === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-day]", { x: event.clientX, y: event.clientY })?.getAttribute("data-calendar-day");
    if (targetDay == null) return;
    if (release.dragSource !== null) {
      suppressEventClick.current = true;
      suppressDoubleClickBriefly();
      const gesture = selectionDrag.commit();
      if (gesture !== null) hand.commitSelectionDrag({ ...gesture, target: { type: "day", day: targetDay } });
      return;
    }
    if (release.dragCandidate !== null) return;
    const raw = interpretCalendarMonthPointer({ ...release, targetDay, eventsOnTargetDay: calendarEventsOnDay(visibleEvents, targetDay).map(({ id }) => ({ id })) });
    if (release.originEventId === null && release.originDay === targetDay) {
      hand.dispatch({ type: "selection.clear" });
      hand.setOccurrence({ start: targetDay, end: targetDay });
      return;
    }
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
    selectionDrag.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel");
    hand.previewSelectionDrag(null);
    hand.setTimePreview(null);
  }

  function cancelAllDayPointer(pointerId: number, reason: "cancel" | "lost-capture" = "cancel"): void {
    allDayPointer.cancel(pointerId, reason);
    selectionDrag.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel");
    hand.previewSelectionDrag(null);
    hand.setAllDayPreview(null);
  }

  function cancelMonthPointer(pointerId: number, reason: "cancel" | "lost-capture" = "cancel"): void {
    monthPointer.cancel(pointerId, reason);
    selectionDrag.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel");
    hand.previewSelectionDrag(null);
    hand.setMonthPreview(null);
  }

  function suppressDoubleClickBriefly(): void {
    suppressEventDoubleClick.current = true;
    globalThis.setTimeout(() => { suppressEventDoubleClick.current = false; }, 500);
  }

  return {
    hoveredTime,
    instantAt,
    timePointerDown,
    timePointerMove,
    timePointerUp,
    clearTimeHover: () => setHoveredTime(null),
    consumeEventClick: () => {
      if (!suppressEventClick.current) return false;
      suppressEventClick.current = false;
      return true;
    },
    consumeEventDoubleClick: () => {
      if (!suppressEventDoubleClick.current) return false;
      suppressEventDoubleClick.current = false;
      return true;
    },
    allDayPointerDown,
    allDayPointerMove,
    allDayPointerUp,
    monthPointerDown,
    monthPointerMove,
    monthPointerUp,
    cancelTimePointer,
    cancelAllDayPointer,
    cancelMonthPointer,
    resizeTimed,
    resizeAllDay,
  };
}
