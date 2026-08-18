# Connectors

JSONDocument와 editor를 만든 다음에는 제품에서 이미 사용하는 도구와 연결해야
합니다. React 화면은 document 변경을 구독해야 하고, Zod나 Ajv의 검사 결과는
JSON Pointer를 가리켜야 합니다. 정렬된 TanStack Table은 현재 보이는 행과 열을
Sheet editor에 전달해야 합니다.

Connector는 이런 번역을 패키지로 제공합니다. 대상 도구의 API 모양을
유지하면서 JSON Document 또는 Editing의 공개 API에 연결하므로 제품마다 같은
연결 코드를 다시 만들지 않아도 됩니다.

## 패키지 선택하기

| 연결할 도구 | 패키지 | 제공하는 연결 |
| --- | --- | --- |
| React | `@interactive-os/json-document-react` | document와 editor 구독 |
| React Hook Form | `@interactive-os/json-document-react-hook-form` | form draft와 commit |
| Ajv | `@interactive-os/json-document-ajv` | Ajv error와 document validation |
| Zod | `@interactive-os/json-document-zod` | Zod validation과 Database 변환 |
| TanStack Table | `@interactive-os/json-document-tanstack-table` | visible table과 Sheet editing |

필요한 Connector만 연결 대상 라이브러리와 함께 설치하면 됩니다. 지원하는
버전은 각 패키지 README에서 확인할 수 있고, 실제 동작은 사이트의
[Connector catalog](/connectors)에서 실행할 수 있습니다.

## React에서 변경 구독하기

React 컴포넌트에서 `document.value`를 그리려면 document의 변경 알림을 React
구독으로 바꿔야 합니다. `useReactConnector`는 현재 값을 돌려주고 컴포넌트가
화면에 있는 동안 구독을 유지합니다.

```tsx
import { useReactConnector } from "@interactive-os/json-document-react";

function DocumentView({ document }) {
  const value = useReactConnector(document);

  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
```

| API | 사용할 때 |
| --- | --- |
| `useReactConnector(document)` | JSONDocument의 현재 값을 렌더링할 때 |
| `useJSONDocumentValue(document)` | document value 구독만 필요할 때 |
| `useEditingSnapshot(source)` | EditingSession이나 DocumentEditor 상태를 렌더링할 때 |
| `useDocumentEditor(initial, options?)` | mounted component가 editor lifecycle을 가질 때 |
| `useEditing({ source, selectedKeys, onSelect, keyboard? })` | 선택 표기, press, 표면 키보드를 같은 질의/핸들러로 붙일 때 |

`useEditing`은 마크업을 그리지 않습니다. host가 `getIsSelected()`와
`getPressHandler()`를 자기 요소에 붙이고, 장르 Intent는 `onSelect`에서
번역합니다. [/connectors/react](/connectors/react) 데모는 구독 뒤 document
value를 다시 렌더링합니다.

## React Hook Form의 draft 제출하기

사용자가 폼에 입력 중인 값은 document에 아직 적용되지 않은 초안입니다.
React Hook Form이 초안과 입력 상태, 필드 오류를 관리하고, Connector는 검사를
통과한 submit을 하나의 document 변경으로 적용합니다.

```tsx
const binding = useReactHookFormConnector<ProfileForm>(document, {
  errorName: ({ pointer }) => pointer === "/profile/name"
    ? "profile.name"
    : "root.canonical",
});

return <form onSubmit={binding.submit}>...</form>;
```

한 번의 submit은 폼 전체 값을 root replace로 적용합니다. 여러 필드가
바뀌어도 History에는 항목 하나가 생깁니다. document 검사가 실패하면 값과
History는 유지되고, `errorName`이 JSON Pointer를 폼 필드 이름으로 바꿉니다.

undo, redo 또는 외부 commit으로 document 값이 바뀌면 Connector가 `reset`을
호출해 폼을 새 값에 맞춥니다. Selection만 달라진 경우에는 입력 중인 초안을
유지합니다. [/connectors/react-hook-form](/connectors/react-hook-form) 데모에서
submit과 reset을 차례로 실행해 볼 수 있습니다.

## Ajv validator 연결하기

Ajv로 이미 compile한 validator가 있다면 `createAjvValidator`로
`JSONDocumentOptions.validate`에 맞는 함수를 만듭니다.

```ts
const validateSchema = ajv.compile(schema);
const validate = createAjvValidator(validateSchema, {
  code: "schema_violation",
});

const document = createJSONDocument(initial, { validate });
```

검사가 실패하면 첫 Ajv error의 `instancePath`와 message가 JSON Pointer를 가진
실패 결과로 바뀝니다. 성공하면 검사한 JSON을 그대로 document에 적용합니다.
Ajv가 검사 중에 기본값을 넣거나 타입을 바꾸도록 설정돼 있어도 그 변형은
document에 들어가지 않습니다.

JSON Schema draft, format, custom keyword는 Ajv를 만들 때 구성합니다. document
검사가 동기식이므로 여기 연결하는 validator도 동기식이어야 합니다.
[/connectors/ajv](/connectors/ajv)에서 성공과 실패 결과를 확인할 수 있습니다.

## Zod schema 사용하기

Zod Connector는 schema를 validator로 연결하거나, object schema와 record를
Database document로 바꿀 수 있습니다.

```ts
const validate = createZodValidator(schema, {
  code: "schema_violation",
});
const document = createJSONDocument(initial, { validate });
```

`createZodValidator`는 첫 Zod issue의 path를 JSON Pointer로 바꿉니다. root
issue의 Pointer는 `""`입니다. Zod transform이 만든 값은 검사 결과로만
사용하고 document에는 검사할 때 받은 값을 적용합니다.

```ts
const translated = databaseDocumentFromZod(rowSchema, records);

if (translated.ok) {
  const database = createDatabaseEditor(translated.value);
}
```

`databaseDocumentFromZod`는 object schema의 string, number, boolean, enum
field를 Database property로 만들고 record 배열을 옮깁니다. `id` string field는
record ID로 사용합니다. 변환할 수 없는 nested object, array, date가 있으면
어느 타입에서 멈췄는지 실패 결과로 알려 줍니다.

[/connectors/zod](/connectors/zod)에서는 schema에서 만든 Database를,
[/connectors/zod/validate](/connectors/zod/validate)에서는 commit validation을
실행해 볼 수 있습니다.

## TanStack Table의 화면 순서 사용하기

TanStack Table이 정렬하고 필터한 뒤의 행 순서는 JSON 저장 순서와 다를 수
있습니다. `createTanStackTableConnector`는 현재 table row model과 visible leaf
column을 `SheetTopology`로 바꾸고 Sheet editor의 셀 편집에 연결합니다.

```ts
const binding = createTanStackTableConnector(document);

const table = createTable({
  ...binding.tableOptions,
  getCoreRowModel: getCoreRowModel(),
});

binding.commitCell({ rowId: row.id, columnId: column.id, value });
binding.fillSelected(table, "Ready");
```

선택, fill, copy와 paste는 정렬·필터·column ordering 뒤에 화면에서 보이는
순서를 따릅니다. document value와 Selection, Clipboard, History는 Sheet editor가
계속 관리합니다. sorting, filtering, pagination과 column state는 TanStack
Table과 제품이 관리합니다.

이 Connector는 `@tanstack/table-core`를 사용합니다. React 화면에서는
TanStack의 React adapter와 json-document React Connector를 함께 조합합니다.
[/connectors/tanstack-table](/connectors/tanstack-table) 데모는 화면 순서가
편집 결과에 반영되는 모습을 보여줍니다.

키보드, clipboard, contenteditable 같은 플랫폼 계약은
[Adapters](adapters.md)에서 연결합니다.

## 각 구성 요소가 맡는 값

| 구성 요소 | 맡는 값과 동작 |
| --- | --- |
| JSON Document | 현재 JSON 값, read, validation, commit, subscription |
| Editing | transaction, Selection, Clipboard, History |
| Adapter | 플랫폼 계약과 공개 API 사이의 변환 |
| Connector | 이름 있는 라이브러리 생태계와 공개 API 사이의 번역 |
| 제품 | UI, 제품별 의미, 입력과 외부 상태 조립 |

Connector를 바꾸어도 JSON Document와 Editing은 같은 입력을 같은 의미로
처리합니다.

문서에서 사용한 `JSONDocument`의 전체 시그니처와 Pointer helper는 마지막
[API Reference](api.md)에서 찾을 수 있습니다.
