import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import {
  calendarOccurrenceTopology,
  createCalendarEditor,
  type CalendarDocument,
} from "@interactive-os/json-document-editing";
import {
  CalendarMonthGrid,
  type CalendarMonthGridHandle,
  useCalendarHand,
  useCalendarPointerInteractions,
} from "../src/index.js";

afterEach(cleanup);

const document: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [
    { id: "holiday", title: "Holiday", start: "2026-05-25", end: "2026-05-27", allDay: true, calendarId: "work", recurrence: null, excludeDates: [] },
    { id: "standup", title: "Standup", start: "2026-05-25T09:00", end: "2026-05-25T09:30", allDay: false, calendarId: "work", recurrence: null, excludeDates: [] },
    { id: "review", title: "Review", start: "2026-05-25T10:00", end: "2026-05-25T10:30", allDay: false, calendarId: "work", recurrence: null, excludeDates: [] },
  ],
};

describe("CalendarMonthGrid", () => {
  test("owns month cells, occurrence selection, overflow, and pointer bindings", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [editor] = useState(() => createCalendarEditor(document));
      const hand = useCalendarHand(editor);
      const baseInteractions = useCalendarPointerInteractions(hand, {
        hourStart: 0,
        hourEnd: 24,
        stepMinutes: 15,
        pixelsPerHour: 72,
      });
      const [pointerDowns, setPointerDowns] = useState(0);
      const interactions = {
        ...baseInteractions,
        monthPointerDown: (..._args: Parameters<typeof baseInteractions.monthPointerDown>) => setPointerDowns((count) => count + 1),
      };
      return (
        <>
          <CalendarMonthGrid
            visibleDate="2026-05-25"
            today="2026-05-25"
            events={hand.paintedEvents}
            weekdays={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
            rowLimit={2}
            hand={hand}
            interactions={interactions}
            selectionTopology={calendarOccurrenceTopology(hand.document, "2026-04-27", "2026-06-08")}
            affordances={{
              dateCell: "content-control",
              event: "direct",
              eventResizeEnd: "direct",
              moreDisclosure: "content-control",
              overflowDate: "content-control",
              overflowEvent: "direct",
            }}
            classNames={{}}
            labels={{
              grid: "Month",
              overflow: (date) => `Events on ${date}`,
              more: (count) => `+${count} more`,
              resizeEnd: (event) => `Resize ${event.title} end`,
            }}
            getEventColor={() => "accent"}
            onNavigateDate={() => undefined}
          />
          <output aria-label="selected event">{hand.selectedEvent?.title ?? "none"}</output>
          <output aria-label="pointer downs">{pointerDowns}</output>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("grid", { name: "Month" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
    expect(screen.getByRole("gridcell", { name: "2026-05-25" }).getAttribute("aria-current")).toBe("date");
    expect(screen.getByRole("button", { name: "Resize Holiday end" })).toBeTruthy();

    const holiday = screen.getByRole("button", { name: "Holiday" });
    fireEvent.pointerDown(holiday);
    expect(screen.getByLabelText("pointer downs").textContent).toBe("1");
    await user.click(holiday);
    expect(screen.getByLabelText("selected event").textContent).toBe("Holiday");

    await user.click(screen.getByRole("button", { name: "+2 more" }));
    expect(screen.getByRole("dialog", { name: "Events on 2026-05-25" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Standup/ })).toBeTruthy();
  });

  test("owns overflow dismissal through its public handle", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [editor] = useState(() => createCalendarEditor(document));
      const hand = useCalendarHand(editor);
      const interactions = useCalendarPointerInteractions(hand, { hourStart: 0, hourEnd: 24, stepMinutes: 15, pixelsPerHour: 72 });
      const handle = useRef<CalendarMonthGridHandle>(null);
      return (
        <>
          <CalendarMonthGrid
            ref={handle}
            visibleDate="2026-05-25"
            today="2026-05-25"
            events={hand.paintedEvents}
            weekdays={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
            rowLimit={2}
            hand={hand}
            interactions={interactions}
            selectionTopology={calendarOccurrenceTopology(hand.document, "2026-04-27", "2026-06-08")}
            affordances={{ dateCell: "content-control", event: "direct", eventResizeEnd: "direct", moreDisclosure: "content-control", overflowDate: "content-control", overflowEvent: "direct" }}
            classNames={{}}
            labels={{ grid: "Month", overflow: (date) => `Events on ${date}`, more: (count) => `+${count} more`, resizeEnd: (event) => `Resize ${event.title} end` }}
            getEventColor={() => "accent"}
            onNavigateDate={() => undefined}
          />
          <button type="button" onClick={() => handle.current?.dismissOverflow()}>Dismiss</button>
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "+2 more" }));
    expect(screen.getByRole("dialog", { name: "Events on 2026-05-25" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("dialog", { name: "Events on 2026-05-25" })).toBeNull();
  });
});
