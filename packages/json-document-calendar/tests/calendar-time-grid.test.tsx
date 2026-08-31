import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import {
  calendarOccurrenceTopology,
  createCalendarEditor,
  type CalendarDocument,
} from "@interactive-os/json-document-editing";
import {
  calendarCells,
  CalendarTimeGrid,
  useCalendarHand,
  useCalendarPointerInteractions,
} from "../src/index.js";

afterEach(cleanup);

const document: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [
    { id: "holiday", title: "Holiday", start: "2026-05-25", end: "2026-05-27", allDay: true, calendarId: "work", recurrence: null, excludeDates: [] },
    { id: "standup", title: "Standup", start: "2026-05-25T09:00", end: "2026-05-25T09:30", allDay: false, calendarId: "work", recurrence: null, excludeDates: [] },
  ],
};

describe("CalendarTimeGrid", () => {
  test("owns headers, all-day and timed occurrences, selection, resize, and pointer binding", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [editor] = useState(() => createCalendarEditor(document));
      const hand = useCalendarHand(editor);
      const baseInteractions = useCalendarPointerInteractions(hand, { hourStart: 0, hourEnd: 24, stepMinutes: 15, pixelsPerHour: 72 });
      const [pointerDowns, setPointerDowns] = useState(0);
      const interactions = {
        ...baseInteractions,
        timePointerDown: (..._args: Parameters<typeof baseInteractions.timePointerDown>) => setPointerDowns((count) => count + 1),
      };
      return (
        <>
          <CalendarTimeGrid
            cells={calendarCells("week", "2026-05-25")}
            weekdays={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
            events={hand.paintedEvents}
            today="2026-05-25"
            nowInstant="2026-05-25T09:15"
            hourStart={0}
            hourEnd={24}
            workHourStart={7}
            stepMinutes={15}
            defaultTimedDurationMinutes={60}
            pixelsPerHour={72}
            fillViewport={false}
            hand={hand}
            interactions={interactions}
            selectionTopology={calendarOccurrenceTopology(hand.document, "2026-05-25", "2026-06-01")}
            affordances={{ allDayCell: "content-control", allDayEvent: "direct", eventResizeEnd: "direct", timeCell: "content-control", selectedSlot: "stateful", timedEvent: "direct" }}
            classNames={{}}
            labels={{ grid: "Week", allDay: "all-day", now: "Now", resizeEnd: (event) => `Resize ${event.title} end`, hour: String }}
            getEventColor={() => "accent"}
          />
          <output aria-label="selected event">{hand.selectedEvent?.title ?? "none"}</output>
          <output aria-label="pointer downs">{pointerDowns}</output>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("grid", { name: "Week" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.getByText("all-day")).toBeTruthy();
    expect(screen.getByRole("presentation", { name: "Now" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resize Holiday end" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resize Standup end" })).toBeTruthy();

    const standup = screen.getByRole("button", { name: "Standup" });
    fireEvent.pointerDown(standup);
    expect(screen.getByLabelText("pointer downs").textContent).toBe("1");
    await user.click(standup);
    expect(screen.getByLabelText("selected event").textContent).toBe("Standup");
    expect(screen.getByText("09:00")).toBeTruthy();
  });
});
