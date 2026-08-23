# Database

Database Hands는 이미 존재하는 resource schema와 CRUD API 위에 완성된 admin
UX를 놓습니다. 데이터·권한 정책·업무 규칙은 host가 소유하고, Hands는 query,
projection, editing, async failure와 접근성 품질을 소유합니다.

```text
Host
├─ Resource schema
├─ CRUD operations
├─ Authorization capabilities
└─ View persistence
          │
          ▼
Database Hands
├─ Property
├─ Record
├─ View / Projection
└─ Table
```

## 가장 짧은 Admin

```bash
npm i @interactive-os/json-document-database zod
```

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

<Database.Admin resource={resource} operations={taskOperations} defaultView={view} />
```

`operations`는 특정 REST 형태가 아닙니다. 기존 REST, GraphQL, RPC 또는 local
store를 `query`, `create`, `update`, `delete`, `deleteMany`에 연결합니다. Hands는
cursor pagination, request cancellation, stale response 거부, optimistic update,
rollback, validation, conflict, retry와 bulk partial failure를 일관된 UI 상태로
만듭니다.

## 자유로운 Experience 구성

Admin preset과 composable Hands는 같은 provider와 동작을 공유합니다.

```tsx
<Database.Provider resource={resource} operations={taskOperations} defaultView={view}>
  <ProductHeader />
  <Database.RecordActions />
  <Database.ViewToolbar />
  <Database.StatusBar />
  <Database.Table renderCell={{ status: StatusCell }} />
  <Database.Pagination />
  <Database.RecordPanel />
</Database.Provider>
```

View document는 직렬화 가능합니다. compound filter, multi-sort, grouping,
column visibility/order/width/pinning과 `personal | shared | locked` ownership을
가집니다. `view/onViewChange` controlled 방식으로 URL이나 host store가 정본이
될 수 있고, `defaultView`만 주면 Hand가 내부 상태를 소유합니다.

기존 `DatabaseHand`의 `records/onRecordsChange` API는 in-memory compatibility
preset으로 유지됩니다. 실제 API-backed admin의 중심 계약은
`Database.Provider`와 `Database.Admin`입니다.

Hands는 backend, 인증, 권한 정책, database migration, formula runtime 또는
제품 업무 규칙을 대신 구현하지 않습니다.

## Live Demo

```live-demo
/demo/database
```
