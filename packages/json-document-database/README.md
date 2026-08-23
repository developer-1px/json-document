# @interactive-os/json-document-database

A batteries-included React Database Hand for small and medium admin surfaces.
It turns a Zod object schema and records into an accessible editable grid while
keeping persistence and product rules in the host.

```tsx
import { DatabaseHand } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";
import * as z from "zod/v4";

const task = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["backlog", "progress", "done"]),
  points: z.number(),
  shipped: z.boolean(),
});

<DatabaseHand schema={task} records={tasks} onRecordsChange={setTasks} />;
```

The default Hand includes typed cell editors, selection, keyboard navigation,
record creation and deletion, sorting, filtering, column visibility, and local
undo/redo. Customize colors with the `--jd-db-*` CSS variables, append product
actions with `toolbar`, or replace individual property cells with `renderCell`.

The Hand intentionally does not own data fetching, authorization, server-side
pagination, routing, or record detail screens.
