import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DatabaseHand, type DatabaseHandCellRenderProps } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";
import * as z from "zod/v4";
import "./styles.css";

const taskSchema = z.object({
  id: z.string(), title: z.string(), owner: z.string(), points: z.number(),
  status: z.enum(["backlog", "progress", "done"]), shipped: z.boolean(),
});
type Task = z.infer<typeof taskSchema>;
const initialTasks: ReadonlyArray<Task> = [
  { id: "task-1", title: "Triage customer feedback", owner: "Ada", points: 3, status: "backlog", shipped: false },
  { id: "task-2", title: "Polish billing settings", owner: "Lin", points: 5, status: "progress", shipped: false },
  { id: "task-3", title: "Publish August changelog", owner: "Mina", points: 2, status: "done", shipped: true },
  { id: "task-4", title: "Archive legacy exports", owner: "Theo", points: 1, status: "backlog", shipped: false },
];

function StatusCell(props: DatabaseHandCellRenderProps<Task>) {
  return <select className={`status status--${props.value}`} data-testid="custom-status" aria-label={`Status ${props.record.id}`} value={String(props.value)} onChange={(event) => props.commit(event.currentTarget.value)}>
    <option value="backlog">Backlog</option><option value="progress">In progress</option><option value="done">Done</option>
  </select>;
}

function AdminApp() {
  const [tasks, setTasks] = useState(initialTasks);
  const [changes, setChanges] = useState(0);
  return <main>
    <header className="admin-header">
      <div><p className="eyebrow">Operations / Tasks</p><h1>Delivery database</h1><p>Schema-driven admin UI with host-owned data and branding.</p></div>
      <div className="metric"><strong>{tasks.length}</strong><span>records</span></div>
    </header>
    <DatabaseHand className="company-database" schema={taskSchema} records={tasks}
      onRecordsChange={(records) => { setTasks(records); setChanges((value) => value + 1); }}
      renderCell={{ status: (props) => <StatusCell {...props} /> }}
      toolbar={<span className="environment">Production data</span>}
      labels={{ newRecord: "Add task", deleteRecord: "Delete task" }} />
    <footer><span>Host persistence boundary</span><output data-testid="change-count">{changes} changes proposed</output></footer>
  </main>;
}

const root = window.document.querySelector("#root");
if (root === null) throw new Error("Missing root element");
createRoot(root).render(<AdminApp />);
