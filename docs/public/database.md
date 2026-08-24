# Database

Database Hands는 이미 존재하는 resource schema와 CRUD API 위에 완성된 database
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

## 가장 짧은 Database workspace

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

<Database.Workspace resource={resource} operations={taskOperations} defaultView={view} />
```

`operations`는 특정 REST 형태가 아닙니다. 기존 REST, GraphQL, RPC 또는 local
store를 `query`, `create`, `update`, `delete`, `deleteMany`에 연결합니다. Hands는
cursor pagination, request cancellation, stale response 거부, optimistic update,
rollback, validation, conflict, retry와 bulk partial failure를 일관된 UI 상태로
만듭니다.

기본 Workspace는 Sheet 방식으로 동작합니다. 방향키는 셀 선택을 이동하고,
Enter/F2 또는 더블클릭은 셀 편집을 시작합니다. 텍스트와 숫자는 Enter로
commit한 뒤 세로로, Tab으로 commit한 뒤 가로로 이동합니다. 선택 상태에서
문자를 입력하면 그 문자부터 즉시 편집합니다. Escape 또는 blur는 draft를
버리고 같은 셀 선택으로 돌아옵니다. New record는 toolbar 명령이 아니라
grid 끝에 붙은 행 affordance이며 `createDraft()`를 마지막 행으로 추가합니다.
Record panel이 필요한 제품만 조합형 Hand로 붙입니다.

## 자유로운 Experience 구성

Workspace preset과 composable Hands는 같은 provider와 동작을 공유합니다.

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
preset으로 유지됩니다. 실제 API-backed database의 중심 계약은
`Database.Provider`와 `Database.Workspace`입니다.

Hands는 backend, 인증, 권한 정책, database migration, formula runtime 또는
제품 업무 규칙을 대신 구현하지 않습니다.

## Editing Database API

Canonical JSON 기반 editor와 saved-view domain transition은
`@interactive-os/json-document-editing`에 있습니다.

```ts
import {
  createDatabaseEditor,
  nextDatabasePropertySort,
} from "@interactive-os/json-document-editing";

const editor = createDatabaseEditor(document);
const sort = nextDatabasePropertySort(view.sort, propertyId);
editor.dispatch({ type: "view.configure", viewId: view.id, sort });
```

- `createDatabaseEditor(source)`: selection, cell/record/view Intent, clipboard, history
- `nextDatabasePropertySort(sort, propertyId)`: ascending → descending → unsorted 전이

DOM event, pointer capture, header menu 좌표, renderer와 업무 property policy는 이 API의
책임이 아닙니다.

## Live Demo

```live-demo
/demo/database
```
