import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/v4";
import {
  Database,
  DatabaseOperationError,
  createDatabaseResource,
  createDatabaseView,
  useDatabase,
  type DatabaseOperations,
} from "../src/index.js";

const schema = z.object({ id: z.string(), title: z.string(), status: z.enum(["open", "done"]) });
type Row = z.infer<typeof schema>;
const resource = createDatabaseResource<Row>({ id: "tasks", schema, getRowId: (row) => row.id, createDraft: () => ({ status: "open" }) });
const view = createDatabaseView("all", "All tasks", ["id", "title", "status"]);
const rows: ReadonlyArray<Row> = [{ id: "a", title: "Alpha", status: "open" }];

afterEach(cleanup);

describe("Database.Provider", () => {
  it("delegates the compound Table profile to the canonical private surface", async () => {
    const { container } = render(<Database.Provider resource={resource} operations={createOperations()} defaultView={view}><Database.Table /></Database.Provider>);
    await waitFor(() => expect(container.querySelectorAll("[data-database-table-surface]")).toHaveLength(1));
  });

  it("loads through the operation contract and exposes serializable view state", async () => {
    const operations = createOperations();
    render(<Database.Provider resource={resource} operations={operations} defaultView={view}><Probe /></Database.Provider>);
    expect(screen.getByTestId("phase").textContent).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("phase").textContent).toBe("ready"));
    expect(screen.getByTestId("rows").textContent).toBe("Alpha");
    expect(operations.query).toHaveBeenCalledWith(expect.objectContaining({ view, pageSize: 50, signal: expect.any(AbortSignal) }));
  });

  it("optimistically updates and rolls back a validation failure", async () => {
    const operations = createOperations({
      update: vi.fn().mockRejectedValue(new DatabaseOperationError("validation", "Title is required", { title: "Required" })),
    });
    let database: ReturnType<typeof useDatabase<Row>> | undefined;
    render(<Database.Provider resource={resource} operations={operations} defaultView={view}><Probe capture={(value) => { database = value; }} /></Database.Provider>);
    await waitFor(() => expect(screen.getByTestId("phase").textContent).toBe("ready"));
    await act(() => database!.update("a", { title: "" }));
    expect(screen.getByTestId("rows").textContent).toBe("Alpha");
    expect(screen.getByTestId("phase").textContent).toBe("error:validation:Required");
  });

  it("restores bulk rows and reports partial failure", async () => {
    const operations = createOperations({
      query: vi.fn().mockResolvedValue({ rows: [...rows, { id: "b", title: "Beta", status: "done" }], total: 2 }),
      deleteMany: vi.fn().mockResolvedValue([{ id: "a", ok: true }, { id: "b", ok: false, message: "Locked" }]),
    });
    let database: ReturnType<typeof useDatabase<Row>> | undefined;
    render(<Database.Provider resource={resource} operations={operations} defaultView={view}><Probe capture={(value) => { database = value; }} /></Database.Provider>);
    await waitFor(() => expect(screen.getByTestId("phase").textContent).toBe("ready"));
    await act(() => database!.remove(["a", "b"]));
    expect(screen.getByTestId("rows").textContent).toBe("Alpha,Beta");
    expect(screen.getByTestId("phase").textContent).toContain("error:partial");
  });

  it("ignores a stale query after the controlled view changes", async () => {
    const first = deferred<{ rows: ReadonlyArray<Row>; total: number }>();
    const second = deferred<{ rows: ReadonlyArray<Row>; total: number }>();
    const operations = createOperations({ query: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise) });
    const doneView = { ...view, id: "done", name: "Done" };
    const rendered = render(<Database.Provider resource={resource} operations={operations} defaultView={view} view={view}><Probe /></Database.Provider>);
    rendered.rerender(<Database.Provider resource={resource} operations={operations} defaultView={view} view={doneView}><Probe /></Database.Provider>);
    await act(() => second.resolve({ rows: [{ id: "b", title: "Latest", status: "done" }], total: 1 }));
    await waitFor(() => expect(screen.getByTestId("rows").textContent).toBe("Latest"));
    await act(() => first.resolve({ rows, total: 1 }));
    expect(screen.getByTestId("rows").textContent).toBe("Latest");
  });
});

function Probe(props: { readonly capture?: (database: ReturnType<typeof useDatabase<Row>>) => void }) {
  const database = useDatabase<Row>();
  props.capture?.(database);
  return <><output data-testid="phase">{database.status.phase}{database.status.failure ? `:${database.status.failure}` : ""}{database.status.fieldErrors?.title ? `:${database.status.fieldErrors.title}` : ""}</output><output data-testid="rows">{database.rows.map((row) => row.title).join(",")}</output></>;
}

function createOperations(overrides: Partial<DatabaseOperations<Row>> = {}): DatabaseOperations<Row> & { query: ReturnType<typeof vi.fn> } {
  return {
    query: vi.fn().mockResolvedValue({ rows, total: rows.length }),
    create: vi.fn().mockImplementation(async (input) => ({ row: { id: "new", title: "New", status: "open", ...input } })),
    update: vi.fn().mockImplementation(async (id, patch) => ({ row: { ...rows.find((row) => row.id === id)!, ...patch } })),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as DatabaseOperations<Row> & { query: ReturnType<typeof vi.fn> };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((accept) => { resolve = accept; });
  return { promise, resolve };
}
