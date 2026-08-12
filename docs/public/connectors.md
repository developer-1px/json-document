# json-document Connectors

Connector는 이름 붙은 외부 생태계의 native contract와 json-document의 public
contract를 번역하는 공식 optional package입니다. Kernel에 framework나 schema
dependency를 넣지 않으면서도 반복되는 app-local glue를 제품으로 제공합니다.

```txt
external ecosystem native contract
                 |
             Connector
                 |
JSON Document / Editing companion public contract
```

Connector는 공통 TypeScript interface가 아닙니다. React hook, Zod validator와
TanStack Table options는 서로 다른 native API 모양을 유지합니다.

## 경계

| 계층 | 책임 |
| --- | --- |
| Kernel | Canonical JSON state, read, validation, commit, subscription |
| Editing companion | Transaction, selection, clipboard와 history의 headless lifecycle |
| Connector | 외부 생태계와 public contract 사이의 번역 |
| Adapter | 제품 model, intent 또는 platform state의 구체적인 변환 정책 |
| Provider | Network, storage, schema 또는 host port의 실제 구현 |
| Host | UI와 제품별 의미의 최종 조립 |

Connector는 document나 editing semantics를 새로 만들지 않습니다. Connector를
제거하거나 교체해도 canonical JSON, selection topology와 command 의미가 바뀌면
안 됩니다.

## 패키지와 version

공식 Connector는 대상 이름을 붙인 독립 package입니다.

```txt
@interactive-os/json-document-react
@interactive-os/json-document-zod
@interactive-os/json-document-tanstack-table  # planned
```

외부 runtime은 `peerDependency`입니다. 각 Connector는 Kernel 및 companion과
lockstep이 아닌 독립 version을 가지며 README에 지원하는 양쪽 version 범위를
기록합니다. Root subpath에 Connector를 넣지 않으므로 Core-only consumer는
React, Zod 또는 TanStack Table을 설치하지 않습니다.

공식 Connector로 승격하려면 public contract만 사용하고, 대상 생태계의 native
API를 유지하며, contract test, connector-specific Live Demo와 browser acceptance를
가져야 합니다. 구현되지 않은 Connector는 catalog에 planned 상태로만 표시하며
가짜 Live Demo를 제공하지 않습니다.

## React Connector

`@interactive-os/json-document-react`는 React의 external-store와 component
lifecycle을 연결합니다.

```tsx
import {
  useDocumentEditor,
  useEditingSnapshot,
} from "@interactive-os/json-document-react";

function DocumentView() {
  const editor = useDocumentEditor({
    blocks: [{ id: "welcome", text: "Hello" }],
  });
  const snapshot = useEditingSnapshot(editor);

  return <pre>{JSON.stringify(snapshot.value, null, 2)}</pre>;
}
```

| API | 책임 |
| --- | --- |
| `useJSONDocumentValue(document)` | 여섯-member JSON Document value를 React에 구독 |
| `useEditingSnapshot(source)` | EditingSession 또는 DocumentEditor snapshot을 React에 구독 |
| `useDocumentEditor(initial, options?)` | 한 mounted component가 소유하는 DocumentEditor 생성 |

Connector는 UI component를 제공하거나 selection을 해석하지 않습니다.
공식 site의 `/connectors/react`에서 세 hook의 실제 subscription, 편집과 canonical
JSON 반영을 확인할 수 있습니다.

## Zod Connector

`@interactive-os/json-document-zod`의 public surface는 다음 하나입니다.

```ts
const validate = createZodValidator(schema, {
  code: "schema_violation",
});

const document = createJSONDocument(initial, { validate });
```

`createZodValidator`는 Zod `safeParse` 결과와 issue path를
`JSONPatchValidationResult`와 JSON Pointer로 번역합니다. Zod가 parse하며 만든
변환값을 document state로 채택하지 않습니다. Metadata, form field와 schema-driven
UI는 범용 schema-description contract가 생기기 전까지 이 Connector 범위가
아닙니다.

첫 Zod issue의 path는 JSON Pointer escaping을 거쳐 validation failure의
`pointer`가 됩니다. Root issue는 빈 JSON Pointer `""`로 표현합니다. 공식 site의
`/connectors/zod`에서 invalid commit 보존, valid commit과 Zod trim 결과 비채택을
확인할 수 있습니다.

## TanStack Table Connector 설계

Planned `@interactive-os/json-document-tanstack-table`은 framework-specific
renderer가 아니라 `@tanstack/table-core`를 대상으로 합니다.

```ts
const binding = createTableDocumentBinding({
  document,
  rowsPointer: "/rows",
  getRowId: (row) => row.id,
});

binding.rows;
binding.subscribe(listener);
binding.commitCell({ rowId, columnId, value });
```

`TableDocumentBinding`은 stable row identity, controlled row data와 cell commit을
JSON Pointer 및 JSON Patch로 연결합니다. Sorting, filtering, pagination 같은
TanStack state는 host가 필요한 slice만 controlled state로 소유합니다. Rectangular
cell multiselection, formula와 clipboard 의미는 Sheet editing domain의 책임이며
Table Connector가 소유하지 않습니다.

React에서 사용할 때 TanStack의 React adapter와 json-document React Connector를
조합합니다. 따라서 Table Connector 자체는 계속 headless입니다.
