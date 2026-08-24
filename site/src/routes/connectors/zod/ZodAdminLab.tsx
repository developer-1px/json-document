import { useRef, useState } from "react";
import { DatabaseHand } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";
import * as z from "zod/v4";
import { Inspector } from "../../../shared/ui/inspector";
import { classes, ui } from "../../../shared/ui/styles";

export const databaseTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string(),
  points: z.number(),
  status: z.enum(["backlog", "progress", "done"]),
  shipped: z.boolean(),
});

type DatabaseTask = z.infer<typeof databaseTaskSchema>;

const initialTasks: ReadonlyArray<DatabaseTask> = [
  { id: "t1", title: "Triage inbox", owner: "Ada", points: 1, status: "backlog", shipped: false },
  { id: "t2", title: "Replace settings form", owner: "Ada", points: 5, status: "progress", shipped: false },
  { id: "t3", title: "Publish changelog", owner: "Lin", points: 2, status: "done", shipped: true },
];

export function ZodDatabaseLab() {
  const [tasks, setTasks] = useState(initialTasks);
  const nextRecord = useRef(4);
  return (
    <section aria-label="Zod database" className="grid gap-4">
      <div className="grid gap-1">
        <p className={ui.text.label}>DatabaseHand</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>The table is the workspace</h2>
        <p className={classes("m-0", ui.text.meta)}>
          A Zod object schema and record array become a ready-to-use database. The host owns records; the Hand owns editing behavior.
        </p>
      </div>
      <DatabaseHand
        schema={databaseTaskSchema}
        records={tasks}
        onRecordsChange={setTasks}
        createRecord={() => ({
          id: `t${nextRecord.current++}`,
          title: "New task",
          owner: "Unassigned",
          points: 0,
          status: "backlog" as const,
          shipped: false,
        })}
        labels={{ ariaLabel: "Database records" }}
      />
      <Inspector label="Inspect host records" items={[
        { label: "Host records", testId: "zod-admin-records", value: tasks },
      ]} />
    </section>
  );
}
