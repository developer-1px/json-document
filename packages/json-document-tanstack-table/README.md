# @interactive-os/json-document-tanstack-table

Official TanStack Table v8 Connector for the headless Sheet editor from
`@interactive-os/json-document-editing`.

```ts
import { createTable, getCoreRowModel } from "@tanstack/table-core";
import { createSheetEditor } from "@interactive-os/json-document-editing";
import { createTableDocumentBinding } from "@interactive-os/json-document-tanstack-table";

const editor = createSheetEditor(initialSheet);
const binding = createTableDocumentBinding({ editor });
const table = createTable({
  ...binding.tableOptions,
  getCoreRowModel: getCoreRowModel(),
  state: {},
  onStateChange: () => undefined,
  renderFallbackValue: null,
});

binding.commitCell({ rowId: "row-1", columnId: "status", value: "Done" });
```

The Connector projects canonical Sheet rows and columns into TanStack's native
table options, preserves stable row identity, and translates the final visible
row and column order into `SheetTopology` for range selection and clipboard
operations. The Sheet editor continues to own canonical JSON, selection,
clipboard, and history. TanStack Table or the host owns sorting, filtering,
pagination, column visibility/order, rendering, and DOM focus.

Supported peers:

- `@interactive-os/json-document-editing >=0.1.0-rc.0 <1`
- `@tanstack/table-core ^8.21.3`

TanStack Table v9 beta, formulas, merged cells, and virtualization are outside
this package contract.
