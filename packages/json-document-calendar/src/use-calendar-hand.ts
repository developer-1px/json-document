import { useRef, useState } from "react";
import { createRenameSession, type RenameSessionSnapshot } from "@interactive-os/json-document-affordance";
import {
  calendarClipboardFormat,
  calendarOccurrenceForInspector,
  calendarOccurrenceFromSelection,
  calendarUpdateIntent,
  previewCalendarAllDay,
  previewCalendarMonth,
  previewCalendarTimeGrid,
  planCalendarSelectionMove,
  type CalendarAllDayPointerRelease,
  type CalendarClipboard,
  type CalendarEditor,
  type CalendarEventPatch,
  type CalendarIntent,
  type CalendarSelection,
  type CalendarSelectionDragSource,
  type CalendarSelectionMoveTarget,
  type EditingResult,
  type CalendarMonthPointerRelease,
  type CalendarOccurrenceRange,
  type CalendarOccurrenceSelection,
  type CalendarOccurrenceTopologySnapshot,
  type CalendarTimeGridPointerRelease,
} from "@interactive-os/json-document-editing";
import {
  calendarVisibleEvents,
  type CalendarDocument,
  type CalendarEvent,
} from "@interactive-os/json-document-calendar-document";
import { useEditingSnapshot } from "@interactive-os/json-document-react";

type OccurrenceScope = Extract<CalendarIntent, { type: "occurrence.edit" }>["scope"];
export interface CalendarSelectionDragPreview {
  readonly source: CalendarSelectionDragSource;
  readonly target: CalendarSelectionMoveTarget;
}

export type CalendarHandOptions = {
  readonly initialOccurrence?: CalendarOccurrenceRange;
  readonly defaultTitle?: string;
  readonly onResult?: (result: EditingResult<CalendarSelection>) => void;
};

export interface CalendarHand {
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
  cut(clipboard?: CalendarClipboard): EditingResult<CalendarSelection> | null;
  paste(clipboard: CalendarClipboard): EditingResult<CalendarSelection>;
}

export function useCalendarHand(editor: CalendarEditor, options: CalendarHandOptions = {}): CalendarHand {
  const snapshot = useEditingSnapshot(editor);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const selectedEvent = editor.selectedEvents[0] ?? null;
  const selectedOccurrences = editor.selectedOccurrences;
  // A cursor in an empty slot is an explicit paste destination, not a copy of selection.
  type PasteTarget = { readonly editor: CalendarEditor; readonly revision: number; readonly range: CalendarOccurrenceRange };
  const [pasteTarget, setPasteTarget] = useState<PasteTarget | null>(() => options.initialOccurrence === undefined
    ? null : { editor, revision: editor.snapshot.revision, range: options.initialOccurrence });
  const pasteTargetRef = useRef(pasteTarget);
  pasteTargetRef.current = pasteTarget;
  const primaryOccurrence = editor.primaryOccurrence;
  const occurrence = primaryOccurrence !== null ? calendarOccurrenceFromSelection(primaryOccurrence)
    : pasteTarget?.editor === editor && pasteTarget.revision === snapshot.revision ? pasteTarget.range : { start: null, end: null };
  const [scope, setScope] = useState<OccurrenceScope>("this");
  const [renameSnapshot, setRenameSnapshot] = useState<RenameSessionSnapshot<string> | null>(null);
  const scopeRef = useRef(scope);
  const createdRenameKeyRef = useRef<string | null>(null);
  scopeRef.current = scope;
  const [renameSession] = useState(() => createRenameSession<string>({
    onCommit(key, draft) {
      const current = editor.selectedEvents.find((event) => event.id === key);
      if (current === undefined) return;
      const next = draft.trim() || (options.defaultTitle ?? "Event");
      if (next !== current.title) {
        if (dispatch(calendarUpdateIntent(current, editor.primaryOccurrence?.start ?? null, scopeRef.current, { title: next }))) rememberSelection();
      }
    },
    onCancel(key, draft) {
      const fallback = options.defaultTitle ?? "Event";
      if (createdRenameKeyRef.current === key && (draft.trim() === "" || draft.trim() === fallback)) {
        if (dispatch({ type: "selection.remove" })) rememberSelection();
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
  const [selectionDragPreview, setSelectionDragPreview] = useState<CalendarSelectionDragPreview | null>(null);
  const document = snapshot.value as CalendarDocument;
  const visibleEvents = calendarVisibleEvents(document);
  const dragPlan = selectionDragPreview === null ? null : planCalendarSelectionMove(
    visibleEvents,
    selectionDragPreview.source.occurrences,
    selectionDragPreview.source.anchor,
    selectionDragPreview.target,
    { scope, primary: selectionDragPreview.source.primary },
  );
  const paintedEvents = dragPlan?.ok === true
    ? dragPlan.events
    : allDayPreview !== null
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
    return intent !== null && observe(editor.dispatch(intent)).ok;
  }

  function observe(result: EditingResult<CalendarSelection>): EditingResult<CalendarSelection> {
    optionsRef.current.onResult?.(result);
    return result;
  }

  function rememberSelection(): void {
    pasteTargetRef.current = null;
    setPasteTarget(null);
  }

  function setOccurrence(range: CalendarOccurrenceRange): void {
    const target = { editor, revision: editor.snapshot.revision, range };
    pasteTargetRef.current = target;
    setPasteTarget(target);
  }

  function commitIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): boolean {
    if (!dispatch(intent)) return false;
    rememberIntent(intent, origin);
    return true;
  }

  function rememberIntent(intent: CalendarIntent | null, _origin: CalendarOccurrenceRange): void {
    rememberSelection();
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
    const current = editor.selectedEvents[0];
    if (current === undefined) return false;
    if (!dispatch(calendarUpdateIntent(current, editor.primaryOccurrence?.start ?? null, scopeRef.current, patch))) return false;
    rememberSelection();
    return true;
  }

  function createInterval(
    start: string,
    end: string,
    createOptions: { readonly allDay?: boolean; readonly title?: string } = {},
  ): boolean {
    setSelectionDragPreview(null);
    return commitIntent({
      type: "event.create",
      start,
      end,
      ...(createOptions.allDay === true ? { allDay: true } : {}),
      ...(createOptions.title === undefined ? {} : { title: createOptions.title }),
    }, { start, end });
  }

  function isOccurrenceSelected(eventId: string, occurrenceStart: string): boolean {
    const occurrences = dragPlan?.ok === true ? dragPlan.movedOccurrences : selectedOccurrences;
    return occurrences.some((item) => item.eventId === eventId && item.start === occurrenceStart);
  }

  function isPrimaryOccurrence(eventId: string, occurrenceStart: string): boolean {
    if (dragPlan?.ok === true) {
      const index = dragPlan.selectionAfter.primaryIndex;
      const point = index === null ? null : dragPlan.selectionAfter.ranges[index]?.focus ?? null;
      return point?.eventId === eventId && point.occurrenceStart === occurrenceStart;
    }
    const primary = editor.primaryOccurrence ?? editor.selectedOccurrences[0] ?? null;
    return primary?.eventId === eventId && primary.start === occurrenceStart;
  }

  function selectOccurrence(
    eventId: string,
    start: string,
    end: string,
    mode: "replace" | "extend" | "toggle" = "replace",
    topology?: CalendarOccurrenceTopologySnapshot,
  ): boolean {
    if (!dispatch({
      type: "selection.set",
      point: { eventId, occurrenceStart: start },
      mode,
      ...(topology === undefined ? {} : { topology }),
    })) return false;
    rememberSelection();
    return true;
  }

  function prepareSelectionDrag(eventId: string, occurrenceStart: string): CalendarSelectionDragSource | null {
    return editor.prepareSelectionDrag({ eventId, occurrenceStart });
  }

  function commitSelectionDrag(preview: CalendarSelectionDragPreview): boolean {
    setSelectionDragPreview(null);
    if (!dispatch({
      type: "selection.move",
      source: preview.source,
      target: preview.target,
      scope,
    })) return false;
    renameSession.commit();
    rememberSelection();
    return true;
  }

  function removeSelected(): boolean {
    const current = editor.selectedEvents[0];
    if (current === undefined) return false;
    const primary = editor.primaryOccurrence;
    const intent: CalendarIntent = current.recurrence !== null && primary !== null
      ? { type: "occurrence.remove", eventId: current.id, occurrenceStart: primary.start, scope: scopeRef.current }
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
    setSelectionDragPreview(null);
    if (observe(editor.undo()).ok) rememberSelection();
  }

  function redo(): void {
    setSelectionDragPreview(null);
    if (observe(editor.redo()).ok) rememberSelection();
  }

  function copy(): CalendarClipboard | null {
    return editor.copy();
  }

  function cut(clipboard?: CalendarClipboard): EditingResult<CalendarSelection> | null {
    if (clipboard !== undefined && calendarClipboardFormat.parse(clipboard) === null) return observe({ ok: false, code: "clipboard.invalid" });
    const cut = editor.cut(clipboard);
    if (cut === null) return null;
    const result = observe(cut.result);
    if (result.ok) rememberSelection();
    return result;
  }

  function paste(clipboard: CalendarClipboard): EditingResult<CalendarSelection> {
    const target = pasteTargetRef.current;
    const result = observe(editor.paste(clipboard, target?.editor === editor && target.revision === editor.snapshot.revision ? target.range.start ?? undefined : undefined));
    if (result.ok) rememberSelection();
    return result;
  }

  return {
    snapshot,
    document,
    selectedEvent,
    selectedOccurrences,
    inspectedInterval: selectedEvent === null ? null : calendarOccurrenceForInspector(selectedEvent, occurrence),
    occurrence,
    scope,
    renaming: renameSnapshot !== null,
    titleDraft,
    paintedEvents,
    timePreview,
    allDayPreview,
    monthPreview,
    selectionDragPreview,
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
    prepareSelectionDrag,
    previewSelectionDrag: setSelectionDragPreview,
    commitSelectionDrag,
    dispatch,
    commitIntent,
    rememberIntent,
    applySelectedPatch,
    createInterval,
    isOccurrenceSelected,
    isPrimaryOccurrence,
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
