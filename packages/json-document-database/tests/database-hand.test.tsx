import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/v4";
import { DatabaseHand } from "../src/index.js";

const schema = z.object({
  id: z.string(),
  title: z.string(),
  points: z.number(),
  status: z.enum(["backlog", "done"]),
  shipped: z.boolean(),
});

const records = [
  { id: "a", title: "Alpha", points: 1, status: "backlog" as const, shipped: false },
  { id: "b", title: "Beta", points: 2, status: "done" as const, shipped: true },
];

afterEach(cleanup);

describe("DatabaseHand", () => {
  it("renders typed admin cells and emits host records", () => {
    const onRecordsChange = vi.fn();
    render(<DatabaseHand schema={schema} records={records} onRecordsChange={onRecordsChange} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Status a" }), { target: { value: "done" } });
    expect(onRecordsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "a", status: "done" })]),
      expect.objectContaining({ origin: "cell.commit" }),
    );
  });

  it("supports property cell customization without replacing the grid shell", () => {
    render(<DatabaseHand
      schema={schema}
      records={records}
      renderCell={{
        status: ({ value }) => <strong data-testid="custom-status">{String(value).toUpperCase()}</strong>,
      }}
    />);

    expect(screen.getAllByTestId("custom-status")[0]?.textContent).toBe("BACKLOG");
    expect(screen.getByRole("gridcell", { name: "BACKLOG" }).getAttribute("data-property-id")).toBe("status");
  });

  it("keeps record creation in local history while the host accepts changes", () => {
    function Host() {
      const [value, setValue] = useState<ReadonlyArray<(typeof records)[number]>>(records);
      return <DatabaseHand schema={schema} records={value} onRecordsChange={setValue} />;
    }
    render(<Host />);
    const grid = screen.getByRole("grid");
    fireEvent.click(screen.getByRole("button", { name: "New record" }));
    expect(within(grid).getAllByRole("row")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(grid).getAllByRole("row")).toHaveLength(3);
  });
});
