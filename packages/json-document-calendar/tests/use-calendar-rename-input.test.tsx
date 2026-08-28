import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { createCalendarEditor, type CalendarDocument } from "@interactive-os/json-document-editing";
import { useCalendarHand, useCalendarRenameInput } from "../src/index.js";

const initial: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [],
};

afterEach(cleanup);

describe("useCalendarRenameInput", () => {
  test("focuses a created title and commits Enter through RenameSession", async () => {
    const user = userEvent.setup();
    const editor = createCalendarEditor(initial, { createId: () => "draft" });
    render(<CalendarRenameHarness editor={editor} />);

    await user.click(screen.getByRole("button", { name: "Create" }));
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(document.activeElement).toBe(input);
    await user.clear(input);
    await user.type(input, "Planning{Enter}");

    expect(editor.selectedEvents[0]?.title).toBe("Planning");
  });

  test("routes Escape cancellation and the created-event policy through RenameSession", async () => {
    const user = userEvent.setup();
    const editor = createCalendarEditor(initial, { createId: () => "draft" });
    render(<CalendarRenameHarness editor={editor} />);

    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.keyboard("{Escape}");

    expect((editor.snapshot.value as CalendarDocument).events).toEqual([]);
  });
});

function CalendarRenameHarness({ editor }: { readonly editor: ReturnType<typeof createCalendarEditor> }) {
  const hand = useCalendarHand(editor, { defaultTitle: "Event" });
  const title = useCalendarRenameInput(hand);
  return <>
    <button onClick={() => hand.createInterval("2026-08-03T10:00", "2026-08-03T11:00", { title: "Event" })}>Create</button>
    {hand.selectedEvent === null ? null : <input aria-label="Title" {...title} />}
  </>;
}
