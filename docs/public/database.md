# Database

Database는 typed property와 레코드를 집는 편집기입니다. 저장된 Table
view가 순서·숨김·너비·정렬·필터를 가지고, editor는 그 view를 보이는
격자로 투사합니다.

헤더에서 열을 옮기고 접고 정렬하고 너비를 바꿉니다. 칸에서는 타입에 맞는
값을 고칩니다. 그 결과는 canonical JSON의 view와 record에 남습니다.

## React Admin

`@interactive-os/json-document-database`는 Zod object와 record 배열을 바로
사용할 수 있는 admin table로 만듭니다. 선택·키보드·typed cell·정렬·필터·열
숨김·history는 Hand가 소유하고, record 저장과 권한은 host가 소유합니다.

```bash
npm i @interactive-os/json-document-database zod
```

```tsx
import { DatabaseHand } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";

<DatabaseHand
  schema={taskSchema}
  records={tasks}
  onRecordsChange={setTasks}
/>
```

기본 UI를 그대로 사용할 수 있습니다. 제품 디자인에는 `--jd-db-*` CSS
variable과 `className`을 사용하고, 특정 property 표현은 `renderCell`, 부가
action은 `toolbar`로 바꿉니다. Grid의 DOM·ARIA·focus shell은 Hand가 유지합니다.

```tsx
<DatabaseHand
  schema={taskSchema}
  records={tasks}
  onRecordsChange={setTasks}
  renderCell={{ status: StatusCell }}
  toolbar={<ExportAction />}
/>
```

이 package는 client-side admin surface입니다. server pagination,
virtualization, authorization, routing과 record detail은 host의 책임입니다.

## Live Demo

```live-demo
/demo/database
```
