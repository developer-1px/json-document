# TanStack Table Connector

TanStack Table Connector는 정렬과 필터 뒤의 row model과 visible leaf column을
`SheetTopology`로 바꿉니다. Sheet editor의 selection, fill, copy, paste는
화면에 보이는 순서를 사용합니다.

```ts
const binding = createTanStackTableConnector(document);

const table = createTable({
  ...binding.tableOptions,
  getCoreRowModel: getCoreRowModel(),
});

binding.commitCell({ rowId: row.id, columnId: column.id, value });
```

sorting, filtering, pagination과 column state는 TanStack Table과 제품이
소유합니다.

## Live Demo

```live-demo
/connectors/tanstack-table
```
