# @interactive-os/json-document-tanstack-table

Official TanStack Table v8 Connector for the headless Sheet editor from
`@interactive-os/json-document-editing`.

```ts
import { createTable, getCoreRowModel } from "@tanstack/table-core";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTanStackTableConnector } from "@interactive-os/json-document-tanstack-table";

const document = createJSONDocument(initialSheet);
const binding = createTanStackTableConnector(document);
const table = createTable({
  ...binding.tableOptions,
  getCoreRowModel: getCoreRowModel(),
  state: {},
  onStateChange: () => undefined,
  renderFallbackValue: null,
});

binding.commitCell({ rowId: "row-1", columnId: "status", value: "Done" });
binding.fillSelected(table, "Done");
```

The Connector projects canonical Sheet rows and columns into TanStack's native
table options, preserves stable row identity, and translates the final visible
row and column order into `SheetTopology` for range selection and clipboard
operations. The Sheet editor continues to own canonical JSON, selection,
clipboard, and history. TanStack Table or the host owns sorting, filtering,
pagination, column visibility/order, rendering, and DOM focus.

`selectCell` accepts `replace`, `extend`, and `toggle`. `fillSelected` applies
one value to every cell in all selected ranges using the table's current
visible topology, while copy and paste use the primary rectangular range.

`createTableDocumentBinding({ editor })` remains available as the lower-level
binding for hosts that already own a `SheetEditor`.

Supported peers:

- `@interactive-os/json-document-editing >=0.1.0-rc.0 <1`
- `@interactive-os/json-document ^3.0.0`
- `@tanstack/table-core ^8.21.3`

TanStack Table v9 beta, formulas, merged cells, and virtualization are outside
this package contract.
