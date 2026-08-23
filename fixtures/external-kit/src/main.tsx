import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Database, DatabaseOperationError, createDatabaseResource, createDatabaseView, type DatabaseFilterGroup, type DatabaseOperations, type DatabaseViewDocument } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";
import * as z from "zod/v4";
import "./styles.css";

const taskSchema = z.object({ id: z.string(), title: z.string(), owner: z.string(), points: z.number(), status: z.enum(["backlog", "progress", "done"]), shipped: z.boolean() });
type Task = z.infer<typeof taskSchema>;
const resource = createDatabaseResource<Task>({ id: "delivery-tasks", schema: taskSchema, getRowId: (row) => row.id, createDraft: () => ({ title: "", owner: "", points: 0, status: "backlog", shipped: false }) });
const allTasks = createDatabaseView("all", "All delivery", ["title", "owner", "points", "status", "shipped"], "shared");
const triageBase = createDatabaseView("triage", "My triage", ["status", "title", "owner", "points", "shipped"]);
const triageView: DatabaseViewDocument = { ...triageBase, projection: { ...triageBase.projection, filter: { id: "triage:root", conjunction: "and", items: [{ id: "open", propertyId: "status", operator: "not-equals", value: "done" }] }, columns: [{ propertyId: "status", visible: true, width: 150, pinned: "start" }, { propertyId: "title", visible: true, width: 300 }, { propertyId: "owner", visible: true, width: 150 }, { propertyId: "points", visible: true, width: 110 }, { propertyId: "shipped", visible: true, width: 120 }] } };

let serverRows = Array.from({ length: 240 }, (_, index): Task => ({ id: `task-${index + 1}`, title: ["Triage customer feedback", "Polish billing settings", "Publish changelog", "Archive legacy exports"][index % 4]! + (index < 4 ? "" : ` ${index + 1}`), owner: ["Ada", "Lin", "Mina", "Theo"][index % 4]!, points: (index % 8) + 1, status: ["backlog", "progress", "done"][index % 3] as Task["status"], shipped: index % 3 === 2 }));
let failureMode: "none" | "network" | "conflict" = "none";
let sequence = serverRows.length + 1;

const operations: DatabaseOperations<Task> = {
  async query(request) {
    await latency(request.signal);
    let rows = [...serverRows];
    const search = request.view.projection.search.trim().toLowerCase();
    if (search) rows = rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(search)));
    rows = rows.filter((row) => matchesGroup(row, request.view.projection.filter));
    for (const sort of [...request.view.projection.sorts].reverse()) rows.sort((left, right) => compare(left[sort.propertyId as keyof Task], right[sort.propertyId as keyof Task]) * (sort.direction === "ascending" ? 1 : -1));
    const offset = Number(request.cursor ?? 0);
    const page = rows.slice(offset, offset + request.pageSize);
    return { rows: page, total: rows.length, ...(offset + page.length < rows.length ? { nextCursor: String(offset + page.length) } : {}) };
  },
  async create(input) {
    await latency();
    if (!input.title) throw new DatabaseOperationError("validation", "Record needs a title", { title: "Enter a title" });
    const row: Task = { id: `task-${sequence++}`, title: input.title, owner: input.owner ?? "Unassigned", points: input.points ?? 0, status: input.status ?? "backlog", shipped: input.shipped ?? false };
    serverRows = [row, ...serverRows];
    return { row, version: "1" };
  },
  async update(id, patch) {
    await latency();
    if (failureMode === "network") { failureMode = "none"; throw new DatabaseOperationError("network", "Connection lost. Local change was rolled back."); }
    if (failureMode === "conflict") { failureMode = "none"; throw new DatabaseOperationError("conflict", "This record changed on the server. Refresh before retrying."); }
    if (patch.title === "") throw new DatabaseOperationError("validation", "Title is required", { title: "Enter a title" });
    const current = serverRows.find((row) => row.id === id);
    if (!current) throw new DatabaseOperationError("conflict", "Record no longer exists");
    const row = { ...current, ...patch };
    serverRows = serverRows.map((candidate) => candidate.id === id ? row : candidate);
    return { row, version: String(Date.now()) };
  },
  async delete(id) { await latency(); serverRows = serverRows.filter((row) => row.id !== id); },
  async deleteMany(ids) {
    await latency();
    const results = ids.map((id) => id === "task-2" ? { id, ok: false, message: "Protected by retention policy" } : { id, ok: true });
    if (results.every((result) => result.ok)) serverRows = serverRows.filter((row) => !ids.includes(row.id));
    return results;
  },
};

function AdminApp() {
  const [view, setView] = useState(allTasks);
  const [saved, setSaved] = useState(0);
  return <main><h1>Delivery database</h1><p>Host schema and CRUD operations.</p>
    <Database.Admin<Task>
      className="company-database"
      resource={resource} operations={operations} defaultView={allTasks} view={view} views={[allTasks, triageView]}
      onViewChange={setView} onSaveView={async () => { setSaved((value) => value + 1); }} pageSize={50}
      toolbar={<div className="failure-controls" aria-label="Failure scenarios"><button type="button" onClick={() => { failureMode = "network"; }}>Next save: network failure</button><button type="button" onClick={() => { failureMode = "conflict"; }}>Next save: conflict</button><output data-testid="saved-views">{saved} views saved</output></div>}
      renderCell={{ status: (props) => <select data-testid="custom-status" aria-label={`Status ${props.record.id}`} value={String(props.value)} onChange={(event) => props.commit(event.currentTarget.value)}><option value="backlog">Backlog</option><option value="progress">In progress</option><option value="done">Done</option></select> }}
    />
  </main>;
}

function matchesGroup(row: Task, group: DatabaseFilterGroup): boolean {
  if (group.items.length === 0) return true;
  const results = group.items.map((item) => "propertyId" in item ? matchesRule(row, item.propertyId, item.operator, item.value) : matchesGroup(row, item));
  return group.conjunction === "and" ? results.every(Boolean) : results.some(Boolean);
}
function matchesRule(row: Task, propertyId: string, operator: string, expected: unknown): boolean {
  const actual = row[propertyId as keyof Task];
  if (operator === "equals") return String(actual) === String(expected);
  if (operator === "not-equals") return String(actual) !== String(expected);
  if (operator === "contains") return String(actual).toLowerCase().includes(String(expected).toLowerCase());
  if (operator === "greater-than") return Number(actual) > Number(expected);
  if (operator === "greater-than-or-equal") return Number(actual) >= Number(expected);
  if (operator === "less-than") return Number(actual) < Number(expected);
  if (operator === "less-than-or-equal") return Number(actual) <= Number(expected);
  return actual === "" || actual === null || actual === undefined;
}
function compare(left: unknown, right: unknown): number { return typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right)); }
async function latency(signal?: AbortSignal) { await new Promise<void>((resolve, reject) => { const timer = window.setTimeout(resolve, 35); signal?.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true }); }); }
const root = window.document.querySelector("#root");
if (root === null) throw new Error("Missing root element");
createRoot(root).render(<AdminApp />);
