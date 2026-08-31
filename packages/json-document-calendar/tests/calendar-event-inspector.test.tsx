import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { createCalendarEditor, type CalendarDocument } from "@interactive-os/json-document-editing";
import { CalendarEventInspector, useCalendarHand } from "../src/index.js";

afterEach(cleanup);

const document: CalendarDocument = {
  calendars: [
    { id: "work", title: "Work", hidden: false, color: "accent" },
    { id: "home", title: "Home", hidden: false, color: "subtle" },
  ],
  events: [{
    id: "standup",
    title: "Standup",
    start: "2026-05-25T09:00",
    end: "2026-05-25T09:30",
    allDay: false,
    calendarId: "work",
    recurrence: { freq: "weekly", interval: 1, until: "2026-06-30" },
    excludeDates: [],
  }],
};

const affordances = {
  inspector: "stateful",
  edit: "content-control",
  remove: "contextual-danger",
  titleField: "field",
  allDayToggle: "stateful",
  startField: "field",
  endField: "field",
  calendarChoice: "stateful",
  recurrenceChoice: "stateful",
  recurrenceInterval: "field",
} as const;

const labels = {
  inspector: "Event",
  title: "Title",
  edit: "Edit details",
  remove: "Delete",
  allDay: "All-day",
  allDaySummary: "All day",
  start: "Start",
  end: "End",
  calendar: "Calendar",
  repeat: "Repeat",
  repeats: "Repeats",
  none: "None",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  every: "Every",
  repeatEvery: "Repeat every",
  repeatUntil: "Repeat until",
  editOccurrence: "Edit occurrence",
  thisOccurrence: "This",
  followingOccurrences: "Following",
  allOccurrences: "All",
};

describe("CalendarEventInspector", () => {
  test("owns summary, rename, detail editing, and delete bindings", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [editor] = useState(() => createCalendarEditor(document, { initialEventIds: ["standup"] }));
      const hand = useCalendarHand(editor);
      return (
        <>
          <button type="button" onClick={() => hand.beginTitleRename()}>Rename selected</button>
          <CalendarEventInspector hand={hand} calendars={document.calendars} affordances={affordances} classNames={{}} labels={labels} />
          <output aria-label="event count">{hand.document.events.length}</output>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("region", { name: "Event" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Standup" })).toBeTruthy();
    expect(screen.getByText("2026-05-25 · 09:00–09:30")).toBeTruthy();
    expect(screen.getByText("Work")).toBeTruthy();
    expect(screen.getByText("Repeats")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByRole("button", { name: "All-day" })).toBeTruthy();
    expect(screen.getByLabelText("Start")).toBeTruthy();
    expect(screen.getByLabelText("End")).toBeTruthy();
    expect(screen.getByLabelText("Calendar")).toBeTruthy();
    expect(screen.getByLabelText("Repeat every")).toBeTruthy();
    expect(screen.getByLabelText("Edit occurrence")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "All" }));

    await user.click(screen.getByRole("button", { name: "Rename selected" }));
    const title = screen.getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Weekly sync{Enter}");
    expect(screen.getByRole("heading", { name: "Weekly sync" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByLabelText("event count").textContent).toBe("0");
    expect(screen.queryByRole("region", { name: "Event" })).toBeNull();
  });
});
