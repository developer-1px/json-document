# @interactive-os/json-document-database

Enterprise React Database Hands for existing schemas and CRUD APIs. The host
owns data, authorization, and business rules; the package owns the interaction
quality of querying, projecting, editing, and recovering from failures.

```tsx
import { Database, createDatabaseResource, createDatabaseView } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";

const resource = createDatabaseResource({
  id: "tasks",
  schema: taskSchema,
  getRowId: (task) => task.id,
  createDraft: () => ({ status: "backlog" }),
});
const view = createDatabaseView("all", "All tasks", ["title", "owner", "status"], "shared");

<Database.Workspace resource={resource} operations={taskOperations} defaultView={view} />
```

`Database.Workspace` is the shortest preset. Products that own their composition
can use the same behavior as individual Hands:

The workspace follows a sheet interaction model: arrow keys move structural
cell focus, Enter/F2 or double-click starts editing, Enter commits text and
number drafts and moves vertically, Tab commits and moves horizontally, and
typing replaces the selected cell immediately. Escape or blur discards drafts.
New record is an attached row affordance that appends `createDraft()` to the
grid. A record panel is opt-in.

```tsx
<Database.Provider resource={resource} operations={taskOperations} defaultView={view}>
  <ProductHeader />
  <Database.RecordActions />
  <Database.ViewToolbar />
  <Database.StatusBar />
  <Database.Table renderCell={{ status: ProductStatus }} />
  <Database.Pagination />
  <Database.RecordPanel />
</Database.Provider>
```

The serializable view document includes compound filters, multi-sort, grouping,
column visibility/order/width/pinning, and personal/shared/locked ownership.
The operations contract supports cursor queries, create/update/delete, bulk
partial results, optimistic mutation, rollback, validation errors, conflicts,
retry, request cancellation, and stale response rejection.

The original `DatabaseHand` remains as a compatibility preset for controlled
in-memory records. It is not the primary contract for API-backed products.

This package does not implement a backend, authentication, authorization
policy, database migration, formula runtime, or product business rules.
