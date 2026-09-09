import { createJSONDocument } from "@interactive-os/json-document";
import { expect } from "vitest";
import { calendarOccurrenceTopology, createCalendarEditor, type CalendarDocument, type CalendarSelection } from "../../src/index.js";
import { editingGrammar } from "./editing-grammar.js";

const value: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [{ id: "a", title: "A", start: "2026-08-01T09:00", end: "2026-08-01T10:00", allDay: false,
    calendarId: "work", recurrence: { freq: "daily", interval: 1, until: "2026-08-03" }, excludeDates: [] }],
};
const points = [1, 2, 3].map((day) => ({ eventId: "a", occurrenceStart: `2026-08-0${day}T09:00` }));
const empty: CalendarSelection = { kind: "range", ranges: [], primaryIndex: null };

editingGrammar("Calendar / materialized recurring occurrences / local history", () => {
  const document = createJSONDocument(value);
  let id = 0;
  const editor = createCalendarEditor(document, { createId: () => `new-${++id}` });
  const topology = calendarOccurrenceTopology(value, "2026-08-01", "2026-08-04");
  const items = points.map((point, index) => ({ sourceEventId: "a", occurrenceStart: point.occurrenceStart,
    event: { ...value.events[0]!, start: point.occurrenceStart, end: `2026-08-0${index + 1}T10:00`, recurrence: null, excludeDates: [] },
  }));
  const clipboard = {
    type: "application/vnd.interactive-os.calendar+json" as const,
    anchorOccurrenceStart: points[0]!.occurrenceStart,
    items, text: items.map(({ event }) => `${event.start}\t${event.end}\t${event.title}`).join("\n"),
  };
  return {
    document, editor, clipboard,
    selectStart: () => editor.dispatch({ type: "selection.set", point: points[0]!, topology }),
    extend: () => editor.dispatch({ type: "selection.set", point: points[2]!, mode: "extend", topology }),
    assertSelected(selection) {
      expect(selection).toEqual({ kind: "range", primaryIndex: 0, ranges: [{ anchor: points[0], focus: points[2], points }] });
      expect(editor.primaryOccurrence?.start).toBe("2026-08-03T09:00");
      expect(editor.selectedOccurrences.map((item) => item.start)).toEqual(points.map((point) => point.occurrenceStart));
    },
    edit: () => editor.dispatch({ type: "event.update", eventId: "a", title: "Changed" }),
    assertEdited(snapshot) {
      expect(snapshot.value).toEqual({ ...value, events: [{ ...value.events[0]!, title: "Changed" }] });
      expect(editor.primaryOccurrence?.start).toBe("2026-08-01T09:00");
    },
    paste: () => editor.paste(clipboard),
    assertPasted(snapshot) {
      const pasted = items.map(({ event }, index) => ({ ...event, id: `new-${index + 1}`, start: `2026-08-0${index + 3}T09:00`, end: `2026-08-0${index + 3}T10:00` }));
      expect(snapshot.value).toEqual({ ...value, events: [...value.events, ...pasted] });
      expect(editor.selectedEvents.map((event) => event.id)).toEqual(["new-3", "new-1", "new-2"]);
      expect(editor.primaryOccurrence).toEqual({ eventId: "new-3", start: "2026-08-05T09:00", end: "2026-08-05T10:00" });
    },
    assertCut(snapshot) {
      expect(snapshot.value).toEqual({ ...value, events: [{ ...value.events[0]!, excludeDates: ["2026-08-01", "2026-08-02", "2026-08-03"] }] });
      expect(snapshot.selection).toEqual(empty);
    },
    reject: () => editor.dispatch({ type: "event.update", eventId: "a", end: "2026-08-01T08:00" }),
    rejectionCode: "event.invalid-interval",
    noop: () => editor.dispatch({ type: "event.update", eventId: "a", title: "A" }),
    removeExternal() { expect(document.commit([{ op: "remove", path: "/events/0" }]).ok).toBe(true); },
    assertExternal(selection) { expect(selection).toEqual(empty); },
  };
});
