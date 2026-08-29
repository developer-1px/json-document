import { useRef, useState } from "react";
import { createRenameSession, type RenameSessionSnapshot } from "@interactive-os/json-document-affordance";
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
  type CalendarClipboard,
  type CalendarEditor,
  type CalendarEvent,
  type CalendarEventPatch,
  type CalendarIntent,
  type CalendarSelection,
  type EditingResult,
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
  readonly renaming: boolean;
  readonly titleDraft: string;
  readonly paintedEvents: ReadonlyArray<CalendarEvent>;
  readonly timePreview: CalendarTimeGridPointerRelease | null;
  readonly allDayPreview: CalendarAllDayPointerRelease | null;
  readonly monthPreview: CalendarMonthPointerRelease | null;
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
  dispatch(intent: CalendarIntent | null): boolean;
  commitIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): boolean;
  rememberIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): void;
  applySelectedPatch(patch: CalendarEventPatch): boolean;
  createInterval(start: string, end: string, options?: { readonly allDay?: boolean; readonly title?: string }): boolean;
  selectOccurrence(eventId: string, start: string, end: string): boolean;
  removeSelected(): boolean;
  setCalendarHidden(calendarId: string, hidden: boolean): boolean;
  rememberSelection(): void;
  undo(): void;
  redo(): void;
  copy(): CalendarClipboard | null;
  cut(): EditingResult<CalendarSelection> | null;
  paste(clipboard: CalendarClipboard): EditingResult<CalendarSelection>;
}

export function useCalendarHand(editor: CalendarEditor, options: CalendarHandOptions = {}): CalendarHand {
  const snapshot = useEditingSnapshot(editor);
  const selectedEvent = editor.selectedEvents[0] ?? null;
  const [occurrence, setOccurrence] = useState<CalendarOccurrenceRange>(
    options.initialOccurrence ?? calendarOccurrenceFromSelection(selectedEvent),
  );
  const [scope, setScope] = useState<OccurrenceScope>("this");
  const [renameSnapshot, setRenameSnapshot] = useState<RenameSessionSnapshot<string> | null>(null);
  const occurrenceRef = useRef(occurrence);
  const scopeRef = useRef(scope);
  const createdRenameKeyRef = useRef<string | null>(null);
  occurrenceRef.current = occurrence;
  scopeRef.current = scope;
  const [renameSession] = useState(() => createRenameSession<string>({
    onCommit(key, draft) {
      const current = editor.selectedEvents.find((event) => event.id === key);
      if (current === undefined) return;
      const next = draft.trim() || (options.defaultTitle ?? "Event");
      if (next !== current.title) {
        editor.dispatch(calendarUpdateIntent(current, occurrenceRef.current.start, scopeRef.current, { title: next }));
        setOccurrence(calendarOccurrenceFromSelection(editor.selectedEvents[0] ?? null));
      }
    },
    onCancel(key, draft) {
      const fallback = options.defaultTitle ?? "Event";
      if (createdRenameKeyRef.current === key && (draft.trim() === "" || draft.trim() === fallback)) {
        editor.dispatch({ type: "selection.remove" });
        setOccurrence(calendarOccurrenceFromSelection(editor.selectedEvents[0] ?? null));
      }
    },
    onFinish(key) {
      if (createdRenameKeyRef.current === key) createdRenameKeyRef.current = null;
    },
    onSnapshot: setRenameSnapshot,
  }));
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

  const titleDraft = renameSnapshot !== null && renameSnapshot.key === selectedEvent?.id
    ? renameSnapshot.draft
    : selectedEvent?.title ?? "";

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
      const created = editor.selectedEvents[0] ?? null;
      if (created !== null) {
        createdRenameKeyRef.current = created.id;
        renameSession.begin(created.id, created.title);
      }
    } else {
      renameSession.commit();
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

  function beginTitleRename(eventId?: string): void {
    const target = eventId === undefined
      ? selectedEvent
      : document.events.find((event) => event.id === eventId) ?? null;
    if (target !== null && renameSession.getSnapshot()?.key !== target.id) {
      renameSession.begin(target.id, target.title);
    }
  }

  function setTitleDraft(title: string): void {
    beginTitleRename();
    renameSession.update(title);
  }

  function undo(): void {
    editor.undo();
    rememberSelection();
  }

  function redo(): void {
    editor.redo();
    rememberSelection();
  }

  function occurrenceSelection() {
    return selectedEvent !== null && occurrence.start !== null && occurrence.end !== null
      ? [{ eventId: selectedEvent.id, start: occurrence.start, end: occurrence.end }]
      : undefined;
  }

  function copy(): CalendarClipboard | null {
    return editor.copy(occurrenceSelection());
  }

  function cut(): EditingResult<CalendarSelection> | null {
    const cut = editor.cut(occurrenceSelection());
    if (cut?.result.ok) rememberSelection();
    return cut?.result ?? null;
  }

  function paste(clipboard: CalendarClipboard): EditingResult<CalendarSelection> {
    const result = editor.paste(clipboard, occurrence.start ?? selectedEvent?.start);
    if (result.ok) rememberSelection();
    return result;
  }

  return {
    snapshot,
    document,
    selectedEvent,
    inspectedInterval: selectedEvent === null ? null : calendarOccurrenceForInspector(selectedEvent, occurrence),
    occurrence,
    scope,
    renaming: renameSnapshot !== null,
    titleDraft,
    paintedEvents,
    timePreview,
    allDayPreview,
    monthPreview,
    setScope,
    setOccurrence,
    setTitleDraft,
    beginTitleRename,
    commitTitleRename: renameSession.commit,
    cancelTitleRename: renameSession.cancel,
    handleTitleRenameKey: renameSession.handleKey,
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
    undo,
    redo,
    copy,
    cut,
    paste,
  };
}
