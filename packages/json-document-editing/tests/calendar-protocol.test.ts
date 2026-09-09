import { describe, expect, test } from "vitest";
import {
  addCalendarDate, bindCalendarAllDayIntent, bindCalendarMonthIntent, bindCalendarTimeGridIntent,
  calendarClipboardFormat, calendarOccurrenceTopology, calendarUpdateIntent, createCalendarEditor,
  interpretCalendarAllDayPointer, interpretCalendarMonthPointer, interpretCalendarTimeGridPointer,
  previewCalendarAllDay, previewCalendarMonth, previewCalendarTimeGrid, planCalendarSelectionMove,
  projectCalendarOccurrences,
  type CalendarDocument, type CalendarEvent, type CalendarIntent,
} from "../src/index.js";

const event = (patch: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "a", title: "A", start: "2026-08-01T09:00", end: "2026-08-01T10:00",
  allDay: false, calendarId: "work", recurrence: null, excludeDates: [], ...patch,
});
const document = (events = [event()]): CalendarDocument => ({
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }], events,
});
function editor(events = [event()]) {
  let sequence = 0;
  return createCalendarEditor(document(events), { createId: () => `new-${++sequence}` });
}
const recurring = (allDay = false) => event({
  ...(allDay ? { start: "2026-08-01", end: "2026-08-02", allDay } : {}),
  recurrence: { freq: "daily", interval: 1, until: "2026-08-08" },
});
function capture(instance: ReturnType<typeof editor>, start = "2026-08-01T09:00") {
  const point = { eventId: "a", occurrenceStart: start };
  const topology = calendarOccurrenceTopology(instance.snapshot.value as CalendarDocument, "2026-08-01", "2026-08-09");
  instance.dispatch({ type: "selection.set", point, topology });
  return instance.prepareSelectionDrag(point, topology)!;
}
function visible(events: ReadonlyArray<CalendarEvent>) {
  return projectCalendarOccurrences(events, "2026-08-01", "2026-08-09")
    .map(({ event, start, end }) => ({ title: event.title, start, end }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

describe("Calendar protocol rejection", () => {
  test.each([
    { type: "event.typo" },
    { type: "event.update", eventId: "a", end: "zz" },
    { type: "event.update", eventId: "a", calendarId: "unknown" },
    { type: "event.create", start: "2026-08-01T11:00", end: "2026-08-01T12:00", calendarId: "unknown" },
    { type: "event.update", eventId: "a", recurrence: { freq: "daily", interval: 1.5, until: "" } },
    { type: "event.update", eventId: "a", recurrence: { freq: "daily", interval: 1, until: "bad-date" } },
  ])("rejects $type without changing value, selection, history or notifications", (intent) => {
    const instance = editor();
    instance.dispatch({ type: "event.update", eventId: "a", title: "Before undo" });
    instance.undo();
    const before = instance.snapshot;
    const observed: unknown[] = [];
    const release = instance.subscribe((snapshot) => observed.push(snapshot));
    expect(instance.dispatch(intent as CalendarIntent)).toMatchObject({ ok: false, code: expect.any(String) });
    expect(instance.snapshot).toEqual(before);
    expect(observed).toEqual([]);
    expect(() => createCalendarEditor(instance.snapshot.value as CalendarDocument)).not.toThrow();
    expect(instance.redo().ok).toBe(true);
    release();
  });

  test("rejects inverted clipboard intervals at parse and direct paste boundaries", () => {
    const payload = structuredClone(editor().copy()!);
    const invalid = { ...payload, items: payload.items.map((item) => ({
      ...item, event: { ...item.event, start: "2026-08-01T11:00", end: "2026-08-01T10:00" },
    })) };
    expect(calendarClipboardFormat.parse(invalid)).toBeNull();
    const instance = editor([]);
    const before = instance.snapshot;
    expect(instance.paste(invalid, "2026-08-02T12:00").ok).toBe(false);
    expect(instance.snapshot).toEqual(before);
  });

  test("rejects a foreign calendar reference without silently changing its owner", () => {
    const payload = editor().copy()!;
    const instance = createCalendarEditor({
      calendars: [{ id: "personal", title: "Personal", hidden: false, color: "subtle" }], events: [],
    });
    const before = instance.snapshot;
    expect(instance.paste(payload, "2026-08-02T12:00").ok).toBe(false);
    expect(instance.snapshot).toEqual(before);
    expect(instance.paste(payload, "2026-08-02T12:00", { calendarId: "personal" }).ok).toBe(true);
    expect((instance.snapshot.value as CalendarDocument).events[0]?.calendarId).toBe("personal");
    expect(() => createCalendarEditor(instance.snapshot.value as CalendarDocument)).not.toThrow();
  });

  test("captured cut rejects content changed after the clipboard write", () => {
    const instance = editor();
    const payload = instance.copy()!;
    instance.dispatch({ type: "event.update", eventId: "a", title: "Not written to clipboard" });
    const before = instance.snapshot;
    expect(instance.cut(payload)?.result.ok).toBe(false);
    expect(instance.snapshot).toEqual(before);
  });

  test("legacy documents emit canonical clipboard events and can still cut", () => {
    const instance = createCalendarEditor({ events: [{ id: "legacy", title: "Legacy", start: "2026-08-01T09:00", end: "2026-08-01T10:00" }] } as unknown as CalendarDocument);
    expect(calendarClipboardFormat.parse(instance.copy())).not.toBeNull();
    expect(instance.cut()?.result.ok).toBe(true);
  });

  test("rejects inconsistent captured points and duplicate occurrences atomically", () => {
    const instance = editor();
    const source = capture(instance);
    const before = instance.snapshot;
    for (const invalid of [
      { ...source, points: [] },
      { ...source, points: [...source.points, ...source.points], occurrences: [...source.occurrences, ...source.occurrences] },
    ]) {
      expect(instance.dispatch({ type: "selection.move", source: invalid, target: { type: "day", day: "2026-08-02" } }).ok).toBe(false);
      expect(instance.snapshot).toEqual(before);
    }
  });

  test("rejects an occurrence removed after capture", () => {
    const instance = editor([recurring()]);
    const source = capture(instance, "2026-08-03T09:00");
    instance.dispatch({ type: "occurrence.remove", eventId: "a", occurrenceStart: "2026-08-03T09:00", scope: "this" });
    const before = instance.snapshot;
    expect(instance.dispatch({ type: "selection.move", source, target: { type: "instant", instant: "2026-08-03T12:00" } })).toMatchObject({ ok: false });
    expect(instance.snapshot).toEqual(before);
  });

  test("rejects a drag whose captured interval changed but preserves unrelated edits", () => {
    const instance = editor();
    const source = capture(instance);
    instance.dispatch({ type: "event.update", eventId: "a", end: "2026-08-01T11:00" });
    const before = instance.snapshot;
    expect(instance.dispatch({ type: "selection.move", source, target: { type: "instant", instant: "2026-08-01T12:00" } })).toMatchObject({ ok: false });
    expect(instance.snapshot).toEqual(before);
    const fresh = capture(instance);
    instance.dispatch({ type: "event.update", eventId: "a", title: "New title" });
    expect(instance.dispatch({ type: "selection.move", source: fresh, target: { type: "instant", instant: "2026-08-01T12:00" } }).ok).toBe(true);
    expect((instance.snapshot.value as CalendarDocument).events[0]).toMatchObject({ title: "New title", start: "2026-08-01T12:00", end: "2026-08-01T14:00" });
  });

  test("bounds allocator collisions before mutation", () => {
    let calls = 0;
    const instance = createCalendarEditor(document([recurring()]), { createId: () => ++calls <= 100 ? "a" : "new" });
    const source = capture(instance, "2026-08-03T09:00");
    const before = instance.snapshot;
    expect(() => instance.dispatch({ type: "selection.move", source, target: { type: "instant", instant: "2026-08-03T12:00" } })).toThrow(/unique/);
    expect(calls).toBe(100);
    expect(instance.snapshot).toEqual(before);
  });
});

describe("Calendar recurrence and input parity", () => {
  const scopes = ["this", "this-and-following", "all"] as const;
  test.each(scopes)("time resize preview matches commit: %s", (scope) => {
    const original = recurring();
    const instance = editor([original]);
    const release = { originInstant: "2026-08-03T10:00", targetInstant: "2026-08-03T11:00", originEventId: "a", originEventStart: "2026-08-03T09:00", originHandle: "end" as const };
    const preview = previewCalendarTimeGrid([original], release, scope);
    expect(instance.dispatch(bindCalendarTimeGridIntent(interpretCalendarTimeGridPointer(release), original, release.originEventStart, scope)!).ok).toBe(true);
    expect(visible(preview)).toEqual(visible((instance.snapshot.value as CalendarDocument).events));
  });
  test.each(scopes)("all-day resize preview matches commit: %s", (scope) => {
    const original = recurring(true);
    const instance = editor([original]);
    const release = { originDay: "2026-08-03", targetDay: "2026-08-04", originEventId: "a", originEventStart: "2026-08-03", originHandle: "end" as const };
    const preview = previewCalendarAllDay([original], release, scope);
    expect(instance.dispatch(bindCalendarAllDayIntent(interpretCalendarAllDayPointer(release), original, release.originEventStart, scope)!).ok).toBe(true);
    expect(visible(preview)).toEqual(visible((instance.snapshot.value as CalendarDocument).events));
  });
  test.each(scopes)("month move preview matches commit: %s", (scope) => {
    const original = recurring(true);
    const instance = editor([original]);
    const release = { originDay: "2026-08-03", targetDay: "2026-08-04", originEventId: "a", originEventStart: "2026-08-03", eventsOnTargetDay: [] };
    const preview = previewCalendarMonth([original], release, scope);
    expect(instance.dispatch(bindCalendarMonthIntent(interpretCalendarMonthPointer(release), original, release.originEventStart, scope)!).ok).toBe(true);
    expect(visible(preview)).toEqual(visible((instance.snapshot.value as CalendarDocument).events));
  });
  test("all-day all-scope resize and Inspector preserve the same two-day interval", () => {
    const original = recurring(true);
    const pointer = editor([original]);
    const inspector = editor([original]);
    const release = { originDay: "2026-08-03", targetDay: "2026-08-04", originEventId: "a", originEventStart: "2026-08-03", originHandle: "end" as const };
    pointer.dispatch(bindCalendarAllDayIntent(interpretCalendarAllDayPointer(release), original, release.originEventStart, "all")!);
    inspector.dispatch(calendarUpdateIntent(original, "2026-08-03", "all", { end: "2026-08-05" }));
    expect(pointer.snapshot.value).toEqual(inspector.snapshot.value);
    expect((pointer.snapshot.value as CalendarDocument).events[0]).toMatchObject({ start: "2026-08-01", end: "2026-08-03" });
  });
  test.each(scopes)("single recurring selection drag supports %s and one-step undo", (scope) => {
    const instance = editor([recurring()]);
    const source = capture(instance, "2026-08-03T09:00");
    const before = instance.snapshot;
    expect(instance.dispatch({ type: "selection.move", source, target: { type: "instant", instant: "2026-08-03T11:00" }, scope }).ok).toBe(true);
    expect(instance.undo().ok).toBe(true);
    expect(instance.snapshot.value).toEqual(before.value);
    expect(instance.snapshot.selection).toEqual(before.selection);
  });
  test.each([399, 400, 600, 100_000])("projects a narrow window after occurrence %s without a hidden lifetime cap", (index) => {
    const original = event({ recurrence: { freq: "daily", interval: 1, until: "" } });
    const day = addCalendarDate("2026-08-01", index)!;
    expect(projectCalendarOccurrences([original], day, addCalendarDate(day, 1)!)).toMatchObject([{ start: `${day}T09:00`, end: `${day}T10:00` }]);
  });

  test.each(scopes)("moves duplicate series once for scope %s, retaining every selected point", (scope) => {
    const original = recurring();
    const second = { ...structuredClone(original), id: "b", title: "B" };
    const instance = editor([original, second]);
    const points = [
      { eventId: "a", occurrenceStart: "2026-08-04T09:00" },
      { eventId: "a", occurrenceStart: "2026-08-03T09:00" },
      { eventId: "b", occurrenceStart: "2026-08-03T09:00" },
    ];
    points.forEach((point, index) => instance.dispatch({ type: "selection.set", point, topology: { points }, mode: index === 0 ? "replace" : "toggle" }));
    const source = instance.prepareSelectionDrag(points[0]!, { points })!;
    const before = instance.snapshot;
    const target = { type: "instant" as const, instant: "2026-08-04T11:00" };
    const preview = planCalendarSelectionMove([original, second], source.occurrences, source.anchor, target, { scope, primary: source.primary });
    expect(preview.ok).toBe(true);
    expect(instance.dispatch({ type: "selection.move", source, target, scope }).ok).toBe(true);
    const current = (instance.snapshot.value as CalendarDocument).events;
    expect(current).toHaveLength(scope === "this" ? 5 : scope === "all" ? 2 : 4);
    expect(instance.selectedOccurrences.map(({ start }) => start).sort()).toEqual(["2026-08-03T11:00", "2026-08-03T11:00", "2026-08-04T11:00"]);
    if (preview.ok) expect(visible(preview.events)).toEqual(visible(current));
    if (scope === "this-and-following") expect(current[0]?.recurrence?.until).toBe("2026-08-02");
    expect(instance.undo().ok).toBe(true);
    expect(instance.snapshot.value).toEqual(before.value);
    expect(instance.snapshot.selection).toEqual(before.selection);
  });

  test.each(["all", "this-and-following"] as const)("translates the finite lifetime and future exclusions for %s", (scope) => {
    const instance = editor([{ ...recurring(), excludeDates: ["2026-08-05"] }]);
    expect(instance.dispatch({ type: "occurrence.edit", eventId: "a", occurrenceStart: "2026-08-03T09:00", start: "2026-08-04T09:00", scope }).ok).toBe(true);
    const series = (instance.snapshot.value as CalendarDocument).events.at(-1)!;
    expect(series.recurrence?.until).toBe("2026-08-09");
    expect(series.excludeDates).toEqual(["2026-08-06"]);
    expect(projectCalendarOccurrences([series], "2026-08-06", "2026-08-07")).toEqual([]);
    expect(projectCalendarOccurrences([series], "2026-08-10", "2026-08-11")).toEqual([]);
  });

  test.each([
    ["weekly", "2026-01-01", "2038-07-01", "2038-07-02"],
    ["monthly", "2026-01-31", "2076-02-29", "2076-03-01"],
    ["yearly", "2000-02-29", "2600-02-28", "2600-03-01"],
  ] as const)("seeks late %s occurrences, including constrained dates", (freq, start, from, to) => {
    const original = event({ start: `${start}T09:00`, end: `${start}T10:00`, recurrence: { freq, interval: 1, until: "" } });
    expect(projectCalendarOccurrences([original], from, to)).toHaveLength(1);
  });

  test("seeking retains long intervals already in progress", () => {
    const original = event({ start: "2026-01-01", end: "2026-01-31", allDay: true, recurrence: { freq: "weekly", interval: 2, until: "" } });
    const late = projectCalendarOccurrences([original], "2050-01-15", "2050-01-16");
    expect(late.length).toBeGreaterThanOrEqual(2);
    expect(late.every((item) => item.start <= "2050-01-15" && item.end > "2050-01-15")).toBe(true);
  });

  test("preview ID collisions do not alias an existing event", () => {
    const original = { ...recurring(), id: "preview" };
    const preview = previewCalendarTimeGrid([original], {
      originInstant: "2026-08-03T09:00", targetInstant: "2026-08-03T11:00",
      originEventId: "preview", originEventStart: "2026-08-03T09:00", originHandle: "body",
    });
    expect(new Set(preview.map((item) => item.id)).size).toBe(2);
  });

  test("detached group occurrences preserve independent extension metadata", () => {
    const instance = editor([{ ...recurring(), metadata: { note: "Keep me" } }]);
    const source = capture(instance);
    expect(instance.dispatch({ type: "selection.move", source, target: { type: "instant", instant: "2026-08-01T11:00" } }).ok).toBe(true);
    const current = instance.snapshot.value as CalendarDocument;
    expect(current.events.at(-1)?.metadata).toEqual({ note: "Keep me" });
    expect(() => createCalendarEditor(current)).not.toThrow();
  });

  test("rejects an unrepresentable constrained monthly group instead of losing points", () => {
    const original = event({ start: "2026-01-30T09:00", end: "2026-01-30T10:00", recurrence: { freq: "monthly", interval: 1, until: "" } });
    const plan = planCalendarSelectionMove([original], [
      { eventId: "a", start: "2026-01-30T09:00", end: "2026-01-30T10:00" },
      { eventId: "a", start: "2026-02-28T09:00", end: "2026-02-28T10:00" },
    ], { eventId: "a", occurrenceStart: original.start }, { type: "day", day: "2026-01-31" }, { scope: "all" });
    expect(plan).toEqual({ ok: false, code: "selection.unrepresentable-series-move" });
  });

  test("single all-scope edits also reject a monthly anchor that cannot represent the requested occurrence", () => {
    const original = event({ start: "2026-01-30T09:00", end: "2026-01-30T10:00", recurrence: { freq: "monthly", interval: 1, until: "" } });
    const instance = editor([original]);
    const before = instance.snapshot;
    expect(instance.dispatch({ type: "occurrence.edit", eventId: "a", occurrenceStart: "2026-02-28T09:00", start: "2026-03-01T09:00", scope: "all" }))
      .toEqual({ ok: false, code: "selection.unrepresentable-series-move" });
    expect(instance.snapshot).toEqual(before);
    expect(previewCalendarTimeGrid([original], {
      originInstant: "2026-02-28T09:00", targetInstant: "2026-03-01T09:00",
      originEventId: "a", originEventStart: "2026-02-28T09:00", originHandle: "body",
    }, "all")).toEqual([original]);
  });

  test.each([
    ["monthly", true, "2026-01-30", "2026-01-31", "2026-02-28", "2026-03-01"],
    ["monthly", false, "2026-01-30T23:30", "2026-01-31T00:15", "2026-02-28T23:30", "2026-03-01T00:15"],
    ["yearly", true, "2028-02-28", "2028-02-29", "2029-02-28", "2029-03-01"],
  ] as const)("%s projection preserves duration across constrained dates (allDay=%s)", (freq, allDay, start, end, nextStart, nextEnd) => {
    const original = event({ start, end, allDay, recurrence: { freq, interval: 1, until: "" } });
    const projected = projectCalendarOccurrences([original], nextStart.slice(0, 10), addCalendarDate(nextEnd.slice(0, 10), 1)!);
    expect(projected.map(({ start, end }) => ({ start, end }))).toEqual([{ start: nextStart, end: nextEnd }]);
    expect(() => createCalendarEditor(document(projected.map(({ event, start, end }) => ({ ...event, start, end }))))).not.toThrow();
  });
});
