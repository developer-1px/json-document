# json-document API

`@interactive-os/json-document`의 공개 시그니처입니다.
왜 이 계약이 있는지는 [왜 json-document인가](overview.md)를 보면 됩니다.

```txt
@interactive-os/json-document
|-- createJSONDocument
|-- applyPatch
|-- Pointer helpers
`-- JSONDocument
```

주소는 JSON Pointer입니다. 여러 곳을 찾을 때만 JSONPath를 쓰고, 결과는
Pointer 배열입니다. `validatePatch`는 검사만 하고, `commit`만 상태를
바꿉니다. 실패는 `{ ok: false, code }`입니다.

## 시작

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const document = createJSONDocument({
  id: "c1",
  title: "Draft",
});

const result = document.commit([
  { op: "replace", path: "/title", value: "Ready" },
]);

if (result.ok) {
  result.change.applied;
  document.value;
}
```

## 작업별 진입점

| 작업 | API | 결과 |
| --- | --- | --- |
| 현재 값 | `document.value` | `JSONValue` |
| 한 위치 | `document.at(pointer)` | `ReadResult` |
| 여러 위치 | `document.query(jsonPath)` | `QueryResult` |
| patch 검사 | `document.validatePatch(operations)` | `JSONPatchValidationResult` |
| 상태 변경 | `document.commit(operations, options?)` | `JSONDocumentCommitResult` |
| 변경 구독 | `document.subscribe(listener)` | unsubscribe function |
| document 없이 patch | `applyPatch(value, operations)` | `JSONPatchResult` |
| Pointer 조립 | `buildPointer`, `appendSegment`, `parentPointer` | `Pointer` |
| 변경 뒤 추적 | `trackPointer` | `Pointer \| null` |

## JSONDocument

```ts
interface JSONDocument {
  readonly value: JSONValue;
  at(pointer: Pointer): ReadResult;
  query(jsonPath: string): QueryResult;
  validatePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchValidationResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(
    listener: (change: JSONAppliedChange) => void,
  ): () => void;
}
```

`createJSONDocument(initial, options?)`로 만듭니다.
`JSONDocumentOptions.validate`가 있으면 처음 값과 이후 candidate를
`commit` 전에 검사합니다.

## value

`value`는 지금 document의 JSON입니다. 처음 넘긴 객체, patch, metadata를
밖에서 바꿔도 document는 바뀌지 않습니다.

```ts
const initial = { nested: { count: 1 } };
const document = createJSONDocument(initial);

initial.nested.count = 99;
document.value; // { nested: { count: 1 } }
```

같은 버전에서 객체 identity를 재사용할 수는 있지만, 그 identity에
의존하지 마세요.

## at

JSON Pointer 한 곳을 읽습니다.

```ts
const result = document.at("/cards/0/title");

if (result.ok) {
  result.path;
  result.value;
} else {
  result.code;
  result.pointer;
}
```

없는 위치와 잘못된 Pointer는 throw 대신 failure입니다.

## query

JSONPath를 받아 Pointer 배열을 돌려줍니다.

```ts
const result = document.query("$..cards[?(@.status=='todo')]");

if (result.ok) {
  result.pointers;
}
```

JSONPath 문자열을 patch의 `path`나 `from`에 넣지 않습니다.

## Pointer

루트 Pointer는 빈 문자열 `""`입니다. 문서 전체를 바꾸려면 `path: ""`를
씁니다.

```ts
document.commit([
  { op: "replace", path: "", value: { title: "New" } },
]);
```

문자열을 Pointer로 바꿀 때는 parse와 build를 같이 씁니다.

```ts
import {
  buildPointer,
  tryParsePointer,
  type Pointer,
} from "@interactive-os/json-document";

function asPointer(path: string): Pointer | null {
  const segments = tryParsePointer(path);
  return segments === null ? null : buildPointer(segments);
}
```

`parsePointer`는 잘못된 문법에서 throw하고, `tryParsePointer`는 `null`을
돌려줍니다. `appendSegment`는 Pointer 뒤에 칸을 하나 붙이고,
`parentPointer`는 한 단계 위를 돌려줍니다.

## applyPatch

document 없이 RFC 6902 batch를 적용합니다.

```ts
import { applyPatch } from "@interactive-os/json-document";

const result = applyPatch(
  { title: "Draft", tags: [] },
  [
    { op: "add", path: "/tags/-", value: "docs" },
    { op: "replace", path: "/title", value: "Ready" },
  ],
);

if (result.ok) {
  result.value;
  result.change.applied;
}
```

JSON이 아니면 `not_serializable`입니다. 입력은 바뀌지 않습니다. 성공한
`change.applied`는 `/-`를 실제 index로 바꾼 `JSONPatchOperation`
목록입니다.

## validatePatch와 commit

두 메서드는 같은 규칙으로 patch를 읽습니다.

```ts
const operations = [
  { op: "replace", path: "/title", value: "Ready" },
] as const;

const validation = document.validatePatch(operations);

if (validation.ok) {
  const committed = document.commit(operations, {
    metadata: {
      origin: "title-field",
      requestId: "r1",
    },
  });

  if (committed.ok) {
    committed.change;
    document.value;
  }
}
```

`JSONDocumentCommitOptions.metadata`는 `JSONChangeMetadata`입니다.
성공한 `commit`은 `JSONAppliedChange`를 돌려주고, 새 값은
`document.value`에서 읽습니다. 목록은 전부 적용되거나 아무것도
적용되지 않습니다. 실패와 값이 그대로인 commit은 `subscribe`
listener를 부르지 않습니다.

한 listener의 예외는 다른 listener 전달을 막거나, `commit` 밖으로
나가거나, 성공 result를 바꾸지 않습니다.

`trackPointer`는 이 변경을 지나며 Pointer가 어디로 옮겼는지 따라갑니다.

## subscribe

```ts
const unsubscribe = document.subscribe((change) => {
  change.applied;
  change.metadata;
});

unsubscribe();
```

listener는 이미 적용된 `JSONAppliedChange`를 받습니다. 구독을 끊은 뒤에는
더 이상 호출되지 않습니다.

## Validation

`validate`는 특정 schema 객체를 요구하지 않습니다. 결과는
`JSONPatchValidationResult`입니다.

```ts
import * as z from "zod";
import { createJSONDocument } from "@interactive-os/json-document";
import { createZodValidator } from "@interactive-os/json-document-zod";

const Schema = z.object({
  title: z.string().min(1),
});

const acceptedDocument = createJSONDocument(
  { title: "Draft" },
  { validate: createZodValidator(Schema) },
);
```

처음 값과 commit candidate를 notification 전에 검사합니다. callback이
파싱해서 만든 값은 state에 들어가지 않습니다. 값을 정규화하려면 그 내용을
JSON Patch에 적습니다.

## Result

공개 Result는 `ok`로 나눕니다.

```ts
type Failure = {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: Pointer;
};
```

새 `code`와 선택 diagnostic field가 생길 수 있습니다. 키 집합을 고정하지
마세요.

## 공개 root

Root가 공개하는 symbol은 21개입니다.

```txt
values
  applyPatch, createJSONDocument
  appendSegment, buildPointer, parentPointer, parsePointer
  trackPointer, tryParsePointer

types
  JSONValue, Pointer, JSONPatchOperation
  JSONAppliedChange, JSONPatchResult, JSONDocumentCommitResult
  JSONPatchValidationResult, JSONChangeMetadata
  JSONDocumentOptions, JSONDocumentCommitOptions
  ReadResult, QueryResult, JSONDocument
```

선택, 클립보드, 실행 취소는 `@interactive-os/json-document-editing`이
이 API 위에서 조합합니다. React나 Zod는 [Connectors](connectors.md)입니다.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import { createSheetEditor } from "@interactive-os/json-document-editing";

const document = createJSONDocument({
  columns: [{ id: "status", label: "Status" }],
  rows: [{ id: "task-1", cells: { status: "Draft" } }],
});
const editor = createSheetEditor(document);

editor.dispatch({
  type: "cell.commit",
  rowId: "task-1",
  columnId: "status",
  value: "Ready",
});
```
