import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/v4";
import { createDatabaseEditor } from "@interactive-os/json-document-editing";
import { databaseDocumentFromZod } from "@interactive-os/json-document-zod";
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
  it("uses the supplied editor and the canonical private table surface", () => {
    const translated = databaseDocumentFromZod(schema, records);
    if (!translated.ok) throw new Error(translated.code);
    const editor = createDatabaseEditor(translated.value);
    const { container } = render(<DatabaseHand editor={editor} viewId={translated.value.views[0]!.id} />);
    expect(container.querySelectorAll("[data-database-table-surface]")).toHaveLength(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Status a" }), { target: { value: "done" } });
    expect((editor.snapshot.value as typeof translated.value).records[0]?.values.status).toBe("done");
  });

  it("emits a controlled document from the document profile", () => {
    const translated = databaseDocumentFromZod(schema, records);
    if (!translated.ok) throw new Error(translated.code);
    const onDocumentChange = vi.fn();
    render(<DatabaseHand document={translated.value} viewId={translated.value.views[0]!.id} onDocumentChange={onDocumentChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Status a" }), { target: { value: "done" } });
    expect(onDocumentChange).toHaveBeenCalledWith(
      expect.objectContaining({ records: expect.arrayContaining([expect.objectContaining({ id: "a", values: expect.objectContaining({ status: "done" }) })]) }),
      expect.objectContaining({ origin: "cell.commit" }),
    );
  });

  it("renders typed admin cells and emits host records", () => {
    const onRecordsChange = vi.fn();
    render(<DatabaseHand schema={schema} records={records} onRecordsChange={onRecordsChange} />);

    fireEvent.doubleClick(screen.getByRole("gridcell", { name: "backlog" }));
    const status = screen.getByRole("combobox", { name: "Status a" });
    fireEvent.change(status, { target: { value: "done" } });
    fireEvent.blur(status);
    expect(onRecordsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "a", status: "done" })]),
      expect.objectContaining({ origin: "cell.commit", updates: [{ recordId: "a", patch: { status: "done" } }] }),
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

  it("reports selected rows and composes native clipboard paste", () => {
    const onSelectionChange = vi.fn();
    const onRecordsChange = vi.fn();
    render(<DatabaseHand schema={schema} records={records} onSelectionChange={onSelectionChange} onRecordsChange={onRecordsChange} />);
    const title = screen.getByRole("gridcell", { name: "Alpha" });
    fireEvent.click(title);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"]);
    const clipboard = { getData: (type: string) => type === "text/plain" ? "Pasted" : "", setData: vi.fn() };
    fireEvent.paste(title.closest(".jd-database__viewport")!, { clipboardData: clipboard });
    expect(onRecordsChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: "a", title: "Pasted" })]), expect.objectContaining({ origin: "cell.commit" }));
  });

  it("uses structural focus for navigation and Escape cancels cell editing", async () => {
    const onRecordsChange = vi.fn();
    render(<DatabaseHand schema={schema} records={records} onRecordsChange={onRecordsChange} />);
    const title = screen.getByRole("gridcell", { name: "Alpha" });
    fireEvent.click(title);
    title.focus();
    fireEvent.keyDown(title.closest(".jd-database__viewport")!, { key: "ArrowRight" });
    await waitFor(() => expect(document.activeElement?.getAttribute("data-property-id")).toBe("points"));

    fireEvent.click(title);
    title.focus();
    fireEvent.keyDown(title.closest(".jd-database__viewport")!, { key: "Enter" });
    const input = screen.getByRole("textbox", { name: "Title a" });
    fireEvent.change(input, { target: { value: "Draft" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("gridcell", { name: "Alpha" })));
    expect(onRecordsChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    const blurredDraft = screen.getByRole("textbox", { name: "Title a" });
    fireEvent.change(blurredDraft, { target: { value: "Blurred draft" } });
    fireEvent.blur(blurredDraft);
    expect(screen.getByRole("gridcell", { name: "Alpha" })).toBeTruthy();
    expect(onRecordsChange).not.toHaveBeenCalled();

    fireEvent.click(title);
    title.focus();
    fireEvent.keyDown(title.closest(".jd-database__viewport")!, { key: "Enter" });
    const committed = screen.getByRole("textbox", { name: "Title a" });
    fireEvent.change(committed, { target: { value: "Committed" } });
    fireEvent.keyDown(committed, { key: "Enter" });
    expect(onRecordsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "a", title: "Committed" })]),
      expect.objectContaining({ origin: "cell.commit" }),
    );
  });

  it("starts editing from typing and moves across cells after commit", async () => {
    const onRecordsChange = vi.fn();
    render(<DatabaseHand schema={schema} records={records} onRecordsChange={onRecordsChange} />);
    const title = screen.getByRole("gridcell", { name: "Alpha" });
    fireEvent.click(title);
    title.focus();
    fireEvent.keyDown(title.closest(".jd-database__viewport")!, { key: "Z" });
    const input = screen.getByRole("textbox", { name: "Title a" });
    expect(input.getAttribute("value")).toBe("Z");
    fireEvent.keyDown(input, { key: "Tab" });
    await waitFor(() => expect(document.activeElement?.getAttribute("data-property-id")).toBe("points"));
    expect(onRecordsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "a", title: "Z" })]),
      expect.objectContaining({ origin: "cell.commit" }),
    );
  });
});
