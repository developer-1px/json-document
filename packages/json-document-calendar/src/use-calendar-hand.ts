import { useEffect, useState } from "react";
import {
  calendarOccurrenceAfterIntent,
  calendarOccurrenceForInspector,
  calendarOccurrenceFromSelection,
  calendarUpdateIntent,
  calendarVisibleEvents,
  previewCalendarAllDay,
  previewCalendarMonth,
  previewCalendarTimeGrid,
  type CalendarAllDayPointerRelease,
  type CalendarDocument,
  type CalendarEditor,
  type CalendarEvent,
  type CalendarEventPatch,
  type CalendarIntent,
  type CalendarMonthPointerRelease,
  type CalendarOccurrenceRange,
  type CalendarTimeGridPointerRelease,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";

type OccurrenceScope = Extract<CalendarIntent, { type: "occurrence.edit" }>["scope"];

export type CalendarHandOptions = {
  readonly initialOccurrence?: CalendarOccurrenceRange;
  readonly defaultTitle?: string;
};

export interface CalendarHand {
  readonly snapshot: CalendarEditor["snapshot"];
  readonly document: CalendarDocument;
  readonly selectedEvent: CalendarEvent | null;
  readonly inspectedInterval: { readonly start: string; readonly end: string } | null;
  readonly occurrence: CalendarOccurrenceRange;
  readonly scope: OccurrenceScope;
  readonly naming: boolean;
  readonly titleDraft: string;
  readonly paintedEvents: ReadonlyArray<CalendarEvent>;
  readonly timePreview: CalendarTimeGridPointerRelease | null;
  readonly allDayPreview: CalendarAllDayPointerRelease | null;
  readonly monthPreview: CalendarMonthPointerRelease | null;
  setScope(scope: OccurrenceScope): void;
  setOccurrence(occurrence: CalendarOccurrenceRange): void;
  setTitleDraft(title: string): void;
  setTimePreview(preview: CalendarTimeGridPointerRelease | null): void;
  setAllDayPreview(preview: CalendarAllDayPointerRelease | null): void;
  setMonthPreview(preview: CalendarMonthPointerRelease | null): void;
  dispatch(intent: CalendarIntent | null): boolean;
  commitIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): boolean;
  rememberIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): void;
  applySelectedPatch(patch: CalendarEventPatch): boolean;
  createInterval(start: string, end: string, options?: { readonly allDay?: boolean; readonly title?: string }): boolean;
  selectOccurrence(eventId: string, start: string, end: string): boolean;
  removeSelected(): boolean;
  setCalendarHidden(calendarId: string, hidden: boolean): boolean;
  rememberSelection(): void;
  finishNaming(): void;
  cancelNaming(): void;
  undo(): void;
  redo(): void;
}

export function useCalendarHand(editor: CalendarEditor, options: CalendarHandOptions = {}): CalendarHand {
  const snapshot = useEditingSnapshot(editor);
  const selectedEvent = editor.selectedEvents[0] ?? null;
  const [occurrence, setOccurrence] = useState<CalendarOccurrenceRange>(
    options.initialOccurrence ?? calendarOccurrenceFromSelection(selectedEvent),
  );
  const [scope, setScope] = useState<OccurrenceScope>("this");
  const [naming, setNaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(selectedEvent?.title ?? "");
  const [timePreview, setTimePreview] = useState<CalendarTimeGridPointerRelease | null>(null);
  const [allDayPreview, setAllDayPreview] = useState<CalendarAllDayPointerRelease | null>(null);
  const [monthPreview, setMonthPreview] = useState<CalendarMonthPointerRelease | null>(null);
  const document = snapshot.value as CalendarDocument;
  const visibleEvents = calendarVisibleEvents(document);
  const paintedEvents = allDayPreview !== null
    ? previewCalendarAllDay(visibleEvents, allDayPreview, scope)
    : timePreview !== null
      ? previewCalendarTimeGrid(visibleEvents, timePreview, scope)
      : monthPreview !== null
        ? previewCalendarMonth(visibleEvents, monthPreview, scope)
        : visibleEvents;

  useEffect(() => {
    setTitleDraft(selectedEvent?.title ?? "");
  }, [selectedEvent?.id, selectedEvent?.title, occurrence.start]);

  function dispatch(intent: CalendarIntent | null): boolean {
    return intent !== null && editor.dispatch(intent).ok;
  }

  function rememberSelection(): void {
    setOccurrence(calendarOccurrenceFromSelection(editor.selectedEvents[0] ?? null));
  }

  function commitIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): boolean {
    if (!dispatch(intent)) return false;
    rememberIntent(intent, origin);
    return true;
  }

  function rememberIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): void {
    const committed = calendarOccurrenceFromSelection(editor.selectedEvents[0] ?? null);
    setOccurrence(calendarOccurrenceAfterIntent(intent, origin, committed));
    if (intent?.type === "event.create") {
      setScope("this");
      setNaming(true);
    } else {
      setNaming(false);
    }
  }

  function applySelectedPatch(patch: CalendarEventPatch): boolean {
    if (selectedEvent === null) return false;
    if (!dispatch(calendarUpdateIntent(selectedEvent, occurrence.start, scope, patch))) return false;
    rememberSelection();
    return true;
  }

  function createInterval(
    start: string,
    end: string,
    createOptions: { readonly allDay?: boolean; readonly title?: string } = {},
  ): boolean {
    return commitIntent({
      type: "event.create",
      start,
      end,
      ...(createOptions.allDay === true ? { allDay: true } : {}),
      ...(createOptions.title === undefined ? {} : { title: createOptions.title }),
    }, { start, end });
  }

  function selectOccurrence(eventId: string, start: string, end: string): boolean {
    if (!dispatch({ type: "selection.set", eventIds: [eventId] })) return false;
    setOccurrence({ start, end });
    return true;
  }

  function removeSelected(): boolean {
    if (selectedEvent === null) return false;
    const intent: CalendarIntent = selectedEvent.recurrence !== null && occurrence.start !== null
      ? { type: "occurrence.remove", eventId: selectedEvent.id, occurrenceStart: occurrence.start, scope }
      : { type: "selection.remove" };
    if (!dispatch(intent)) return false;
    rememberSelection();
    return true;
  }

  function setCalendarHidden(calendarId: string, hidden: boolean): boolean {
    return dispatch({ type: "calendar.set-hidden", calendarId, hidden });
  }

  function cancelNaming(): void {
    const fallback = options.defaultTitle ?? "Event";
    if (naming && (titleDraft.trim() === "" || titleDraft.trim() === fallback)) {
      dispatch({ type: "selection.remove" });
    }
    setNaming(false);
    rememberSelection();
  }

  function undo(): void {
    editor.undo();
    rememberSelection();
  }

  function redo(): void {
    editor.redo();
    rememberSelection();
  }

  return {
    snapshot,
    document,
    selectedEvent,
    inspectedInterval: selectedEvent === null ? null : calendarOccurrenceForInspector(selectedEvent, occurrence),
    occurrence,
    scope,
    naming,
    titleDraft,
    paintedEvents,
    timePreview,
    allDayPreview,
    monthPreview,
    setScope,
    setOccurrence,
    setTitleDraft,
    setTimePreview,
    setAllDayPreview,
    setMonthPreview,
    dispatch,
    commitIntent,
    rememberIntent,
    applySelectedPatch,
    createInterval,
    selectOccurrence,
    removeSelected,
    setCalendarHidden,
    rememberSelection,
    finishNaming: () => setNaming(false),
    cancelNaming,
    undo,
    redo,
  };
}
