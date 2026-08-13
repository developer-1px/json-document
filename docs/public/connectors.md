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

실제로 canonical state를 읽거나 구독하거나 변경하는 stateful Connector의 공식
진입점은 다음 문법을 공유합니다.

```ts
createXxxConnector(document, options)
useXxxConnector(document, options) // React Hook일 때
```

첫 번째 인자는 공유할 `JSONDocument`, 두 번째 인자는 대상 생태계의 options이며,
반환값은 대상 생태계의 native binding입니다. Validator, codec, modifier translator처럼
document에 직접 연결되지 않는 순수 함수는 이 문법을 흉내 내지 않고 책임에 맞는
이름을 유지합니다.

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
@interactive-os/json-document-react-hook-form
@interactive-os/json-document-ajv
@interactive-os/json-document-zod
@interactive-os/json-document-tanstack-table
@interactive-os/json-document-web
```

외부 runtime은 `peerDependency`입니다. 각 Connector는 Kernel 및 companion과
lockstep이 아닌 독립 version을 가지며 README에 지원하는 양쪽 version 범위를
기록합니다. Root subpath에 Connector를 넣지 않으므로 Core-only consumer는
React, React Hook Form, Ajv, Zod, TanStack Table 또는 Web Connector를 설치하지 않습니다.

공식 Connector로 승격하려면 public contract만 사용하고, 대상 생태계의 native
API를 유지하며, contract test, connector-specific Live Demo와 browser acceptance를
가져야 합니다. 구현되지 않은 Connector는 catalog에 planned 상태로만 표시하며
가짜 Live Demo를 제공하지 않습니다.

## React Connector

`@interactive-os/json-document-react`는 React의 external-store와 component
lifecycle을 연결합니다.

```tsx
import { useReactConnector } from "@interactive-os/json-document-react";

function DocumentView({ document }) {
  const value = useReactConnector(document);

  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
```

| API | 책임 |
| --- | --- |
| `useReactConnector(document)` | React Connector의 공식 document 진입점 |
| `useJSONDocumentValue(document)` | 여섯-member JSON Document value를 React에 구독 |
| `useEditingSnapshot(source)` | EditingSession 또는 DocumentEditor snapshot을 React에 구독 |
| `useDocumentEditor(initial, options?)` | 한 mounted component가 소유하는 DocumentEditor 생성 |

Connector는 UI component를 제공하거나 selection을 해석하지 않습니다.
공식 site의 `/connectors/react`에서 세 hook의 실제 subscription, 편집과 canonical
JSON 반영을 확인할 수 있습니다.

## React Hook Form Connector

`@interactive-os/json-document-react-hook-form`은 React Hook Form의 form lifecycle과
공유 `JSONDocument`의 canonical transaction과 내부 form history를 연결합니다.

```tsx
const binding = useReactHookFormConnector<ProfileForm>(document, {
  errorName: ({ pointer }) => pointer === "/profile/name"
    ? "profile.name"
    : "root.canonical",
});

return <form onSubmit={binding.submit}>...</form>;
```

RHF가 draft, dirty, touched, field registration과 field error를 소유합니다. 유효한
submit은 전체 form value를 하나의 root replace transaction으로 적용하므로 여러
field 변경도 undo 한 번으로 복구됩니다. Canonical validation이 거절하면 document와
history는 바뀌지 않으며 Host가 JSON Pointer를 field name으로 번역할 수 있습니다.
매 canonical value 변경은 `reset`으로 RHF에 동기화되므로 undo, redo와 외부 commit
뒤에는 dirty, touched와 error도 canonical 기준으로 초기화됩니다. Selection-only
publication은 form을 reset하지 않습니다.

Connector는 object-shaped canonical JSON만 받으며 field UI, product schema,
draft validation, live typing commit 또는 persistence를 소유하지 않습니다. 공식
site의 `/connectors/react-hook-form` Record Detail Demo는 React와 Zod Connector를
함께 조합해 이 경계를 보여줍니다.

## Ajv Connector

`@interactive-os/json-document-ajv`는 호출자가 구성하고 컴파일한 Ajv validator를
동기 JSON Document validation provider로 번역합니다.

```ts
const validateSchema = ajv.compile(schema);
const validate = createAjvValidator(validateSchema, {
  code: "schema_violation",
});

const document = createJSONDocument(initial, { validate });
```

첫 Ajv error의 message와 `instancePath`를 `JSONPatchValidationResult`와 JSON
Pointer로 옮깁니다. Validator는 항상 candidate의 mutable clone을 검사하므로
`removeAdditional`, `useDefaults`, `coerceTypes`가 만든 결과는 canonical JSON이나
applied JSON Patch operations에 들어가지 않습니다.

Connector는 Ajv instance, JSON Schema draft, format, custom keyword와 option을
구성하지 않습니다. Core validation contract가 동기이므로 async validator는
연결 시 거절합니다. JSON Schema에서 Database document나 UI를 만드는 일도 범위가
아닙니다. 공식 site의 `/connectors/ajv`에서 invalid commit 보존과 Ajv 변형 결과
비채택을 확인할 수 있습니다.

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

## TanStack Table Connector

`@interactive-os/json-document-tanstack-table`은 framework-specific
renderer가 아니라 `@tanstack/table-core`를 대상으로 합니다.

```ts
const binding = createTanStackTableConnector(document);

const table = createTable({
  ...binding.tableOptions,
  getCoreRowModel: getCoreRowModel(),
});

binding.commitCell({ rowId: row.id, columnId: column.id, value });
binding.fillSelected(table, "Ready");
```

`TanStackTableConnector`는 stable row identity와 controlled row data를 TanStack
options로 제공하고 cell commit을 Sheet intent와 JSON Patch로 연결합니다. 최종
visible row model과 visible leaf column order는 `SheetTopology`로 번역되므로 정렬,
필터링과 column ordering 뒤에도 rectangular multi-range selection, selection fill과
primary-range clipboard가 화면 순서를 따릅니다. Canonical JSON, selection,
clipboard와 history는 Sheet editor가 계속
소유합니다. Sorting, filtering, pagination과 column state는 TanStack과 host가
소유하며 formula, merged cell과 virtualization은 Connector 범위가 아닙니다.

React에서 사용할 때 TanStack의 React adapter와 json-document React Connector를
조합합니다. 따라서 Table Connector 자체는 계속 headless입니다. 공식 site의
`/connectors/tanstack-table`에서 정렬·필터·column ordering 이후의 visible-order
selection, multi-range fill, copy/paste, undo/redo와 canonical JSON 반영을 확인할 수 있습니다.

## Web Platform Connector

`@interactive-os/json-document-web`은 browser-native clipboard와 input shape를
Editing companion과 Selection companion의 public contract로 번역합니다.

```ts
const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  cut: () => editor.cut()?.result ?? { ok: false },
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});

surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("cut", (event) => clipboard.cut(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));
```

Document와 Sheet codec은 structured MIME과 `text/plain` projection을 함께
기록하고, paste에서는 유효한 structured payload만 소비합니다. cut은 clipboard
기록이 가능할 때만 Editing 제거를 실행합니다. 임의의 외부 plain text를 block이나
cell로 해석하는 정책은 Host가 소유합니다. 실패하거나 Editing이 거절한 cut/paste는
`preventDefault()`를 호출하지 않아 native fallback을 보존합니다.

`selectionOperationFromModifiers`는 Web modifier를 `replace`, `extend`, `toggle`로
번역하고, `textInputFromControl`은 native text control의 value와 caret을 관찰합니다.
Connector는 event target, shortcut, focus, geometry, accessibility wiring, native text
selection 또는 IME lifecycle을 소유하지 않습니다. 공식 site의 `/connectors/web`에서
실제 ClipboardEvent, modifier selection과 text-control editing을 확인할 수 있습니다.

공식 Document와 Sheet Live Demo는 이 native event 경계를 직접 사용합니다. TanStack
Table Live Demo에서는 visible topology를 소유하는 Table Connector와 native clipboard를
소유하는 Web Connector가 동일한 Sheet editing contract 위에서 독립적으로 조합됩니다.
