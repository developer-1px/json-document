import { applyPatch } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import {
  assertCalendarDocument, validateCalendarDocument, planCalendarEventEdit,
  planCalendarEventRemoval, planCalendarOccurrenceRemoval, planCalendarVisibility,
  projectCalendarOccurrences, calendarVisibleEvents,
  type CalendarDocument, type CalendarEventOperation,
} from "../src/index.js";

const document = (): CalendarDocument => ({
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [{ id: "a", title: "A", start: "2026-08-01T09:00", end: "2026-08-01T10:00", allDay: false,
    calendarId: "work", recurrence: { freq: "daily", interval: 1, until: "2026-08-08" }, excludeDates: [] }],
});

describe("Calendar Document Type public contract", () => {
  test("validates without editing state and preserves canonical and legacy inputs", () => {
    for (const value of [document(), { events: [{ id: "legacy", title: "L", start: "2026-08-01T09:00", end: "2026-08-01T10:00" }] }]) {
      const before = structuredClone(value);
      expect(validateCalendarDocument(value)).toEqual({ ok: true });
      expect(() => assertCalendarDocument(value)).not.toThrow();
      expect(value).toEqual(before);
    }
  });

  test.each([
    "work", null, 123, {}, [null], [123], [[]],
    [{ id: 123, title: "Work", hidden: false, color: "accent" }],
    [{ id: "", title: "Work", hidden: false, color: "accent" }],
    [{ id: "work", title: 123, hidden: false, color: "accent" }],
    [{ id: "work", title: "Work", hidden: "false", color: "accent" }],
    [{ id: "work", title: "Work", hidden: false, color: "" }],
  ])("rejects malformed calendar containers and records: %j", (calendars) => {
    const value = { calendars, events: [] };
    expect(validateCalendarDocument(value)).toMatchObject({ ok: false, code: "calendar.invalid-document" });
    expect(() => assertCalendarDocument(value)).toThrow(TypeError);
  });

  test("validates document identity, membership and JSON extension fields", () => {
    const value = document();
    for (const invalid of [
      { ...value, calendars: [...value.calendars, { ...value.calendars[0]! }] },
      { ...value, events: [...value.events, { ...value.events[0]!, recurrence: { ...value.events[0]!.recurrence! }, excludeDates: [] }] },
      { ...value, events: [{ ...value.events[0]!, calendarId: "missing" }] },
      { ...value, metadata: Number.NaN },
    ]) expect(validateCalendarDocument(invalid).ok).toBe(false);
  });

  test.each(["this", "this-and-following", "all"] as const)("plans %s edits as document operations, not selection transitions", (scope) => {
    const value = document();
    const before = structuredClone(value);
    const plan = planCalendarEventEdit(value.events, {
      type: "occurrence.edit", eventId: "a", occurrenceStart: "2026-08-03T09:00", scope,
      start: "2026-08-03T11:00", title: "Changed",
    }, { allocateId: () => "new", calendarIds: new Set(["work"]) });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.code);
    const applied = applyPatch(value, plan.operations);
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error("patch failed");
    expect((applied.value as CalendarDocument).events).toEqual(plan.events);
    expect(validateCalendarDocument(applied.value).ok).toBe(true);
    expect(plan.affectedOccurrence.occurrenceStart).toBe("2026-08-03T11:00");
    expect(plan).not.toHaveProperty("selectionAfter");
    const focused = projectCalendarOccurrences(plan.events, "2026-08-03", "2026-08-04")
      .find((occurrence) => occurrence.event.id === plan.affectedOccurrence.eventId);
    expect(focused).toMatchObject({ start: "2026-08-03T11:00", end: "2026-08-03T12:00", event: { title: "Changed" } });
    expect(value).toEqual(before);
  });

  test("rejects invalid edits, unknown operations and reused allocation identities", () => {
    const value = document();
    for (const operation of [
      { type: "event.create", start: "2026-08-03T11:00", end: "2026-08-03T12:00" },
      { type: "event.update", eventId: "a", end: "2026-08-01T08:00" },
      { type: "event.typo", eventId: "a" },
    ]) expect(planCalendarEventEdit(value.events, operation as CalendarEventOperation, { allocateId: () => "a" }).ok).toBe(false);
    expect(value).toEqual(document());
  });

  test.each(["this", "this-and-following", "all"] as const)("owns %s occurrence removal without selection or history", (scope) => {
    const value = document();
    const plan = planCalendarOccurrenceRemoval(value.events, { eventId: "a", occurrenceStart: "2026-08-03T09:00", scope });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.code);
    const applied = applyPatch(value, plan.operations);
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error("patch failed");
    expect((applied.value as CalendarDocument).events).toEqual(plan.events);
    const days = projectCalendarOccurrences(plan.events, "2026-08-01", "2026-08-09").map((item) => item.start.slice(8, 10));
    expect(days).toEqual(scope === "all" ? [] : scope === "this-and-following" ? ["01", "02"] : ["01", "02", "04", "05", "06", "07", "08"]);
  });

  test("owns record removal and calendar visibility", () => {
    const value = document();
    expect(planCalendarEventRemoval(value.events, ["missing"]).ok).toBe(false);
    expect(planCalendarEventRemoval(value.events, ["a"])).toMatchObject({ ok: true, events: [], operations: [{ op: "remove", path: "/events/0" }] });
    expect(planCalendarVisibility(value, "missing", true).ok).toBe(false);
    const plan = planCalendarVisibility(value, "work", true);
    if (!plan.ok) throw new Error(plan.code);
    const applied = applyPatch(value, plan.operations);
    if (!applied.ok) throw new Error("patch failed");
    expect(calendarVisibleEvents(applied.value as CalendarDocument)).toEqual([]);
    expect(value).toEqual(document());
  });
});
