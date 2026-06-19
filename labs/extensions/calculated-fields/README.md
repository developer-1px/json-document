# @interactive-os/json-document-calculated-fields

Lab calculated field extension for `@interactive-os/json-document` documents.

Use it to test whether formula-like derived values can stay outside core while
still using public reads, schema checks, and patch execution.

## 1.0 status

1.0에서는 lab으로 유지한다. Core API 변경도 없고 official 승격도 보류한다.

이 package가 맡는 책임은 "현재 document를 읽어 host-defined computed value를
schema-safe patch batch로 동기화한다"까지다. Formula language, dependency graph,
recalculation scheduler, circular dependency policy는 아직 product마다 다르게
잡힐 가능성이 크므로 official surface로 얼리지 않는다.

```ts
import { createCalculatedFields } from "@interactive-os/json-document-calculated-fields";

const computed = createCalculatedFields(doc, [
  {
    path: "/stats/total",
    compute: ({ value }) => value.items.length,
  },
]);

computed.sync();
```

## Scope

- Let host code define calculated field functions.
- Read current target values through `doc.at`.
- Validate computed values with `doc.schema.accepts`.
- Preflight replacement patches with `doc.canPatch`.
- Apply replacements with `doc.patch`.

## Non-goals

- No formula language, dependency graph, spreadsheet engine, toggle-value detection, or
  scheduler.
- No rendered formula editor, validation panel, keyboard, focus, or recalculation
  UI.
- No automatic background sync; hosts decide when to call `sync`.
- No plugin registration; this package composes functions and does not call
  `doc.use(...)`.
- No `@interactive-os/json-document` internal imports.

## Friction report

The public facade is enough for simple calculated fields. Host code owns formulas,
dependencies, and timing. The extension computes values, validates them with the
schema helper, and applies a normal replacement patch batch.

This keeps formula systems out of core while preserving schema-valid document
state.
