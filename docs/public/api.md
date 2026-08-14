# API Reference

앞 문서에서 사용한 `@interactive-os/json-document`의 공개 API를 작업별로
정리합니다.

## 문서 만들기

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const document = createJSONDocument({
  id: "c1",
  title: "Draft",
});
```

`createJSONDocument(initial, options?)`는 입력 JSON을 복사해 새
`JSONDocument`를 만듭니다. `options.validate`를 넘기면 처음 값과 이후
`commit`으로 적용할 값을 같은 함수로 검사합니다.

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

## 현재 값 읽기

`document.value`는 현재 JSON 값입니다. document를 만들 때 넘긴 객체와
`commit`에 사용한 operation이나 metadata를 나중에 수정해도 현재 값은
달라지지 않습니다.

```ts
const initial = { nested: { count: 1 } };
const document = createJSONDocument(initial);

initial.nested.count = 99;
console.log(document.value); // { nested: { count: 1 } }
```

다음 변경이 적용되기 전까지 객체 identity가 재사용될 수 있습니다. 값의 변경
여부는 identity 대신 `commit` 결과와 구독 알림으로 확인합니다.

## 한 위치 읽기

`at(pointer)`는 JSON Pointer가 가리키는 값을 읽습니다.

```ts
const result = document.at("/cards/0/title");

if (result.ok) {
  console.log(result.path);
  console.log(result.value);
} else {
  console.log(result.code);
  console.log(result.pointer);
}
```

주소가 없거나 Pointer 문법이 잘못되면 실패 결과가 돌아옵니다.

## 여러 위치 찾기

`query(jsonPath)`는 JSONPath와 일치하는 위치를 Pointer 배열로 돌려줍니다.

```ts
const result = document.query("$..cards[?(@.status=='todo')]");

if (result.ok) {
  console.log(result.pointers);
}
```

찾은 값을 바꿀 때는 결과의 Pointer를 JSON Patch `path`나 `from`에
사용합니다.

## Pointer 만들고 추적하기

Root Pointer는 빈 문자열 `""`입니다. `path: ""`인 replace operation은 문서
전체를 바꿉니다.

```ts
document.commit([
  { op: "replace", path: "", value: { title: "New" } },
]);
```

문자열을 Pointer로 검사하고 다시 만들 때는 `tryParsePointer`와
`buildPointer`를 함께 사용할 수 있습니다.

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

`parsePointer`는 잘못된 문법에서 throw합니다. `tryParsePointer`는 같은 경우
`null`을 돌려줍니다. `appendSegment`는 Pointer에 segment를 하나 추가하고,
`parentPointer`는 부모 위치를 돌려줍니다.

`trackPointer(pointer, operations)`는 patch가 적용된 뒤 같은 값이 이동한
위치를 계산합니다. 값이 제거됐거나 더 이상 한 위치로 추적되지 않으면
`null`입니다.

## 문서 없이 patch 적용하기

`applyPatch(value, operations)`는 document 상태를 만들지 않고 RFC 6902
operation을 적용합니다.

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
  console.log(result.value);
  console.log(result.change.applied);
}
```

입력 값과 operation은 유지됩니다. 입력이 JSON으로 직렬화될 수 없으면
`not_serializable` failure가 돌아옵니다. 성공한 `change.applied`에서는 array
append 경로 `/-`가 실제 index로 바뀝니다.

## Patch 검사하고 commit하기

`validatePatch(operations)`는 현재 document에 operation을 적용할 수 있는지
검사합니다. 성공해도 현재 값과 구독자는 바뀌지 않습니다.

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
    console.log(committed.change);
    console.log(document.value);
  }
}
```

`commit(operations, options?)`은 모든 operation을 순서대로 적용합니다. 중간
operation이나 validator가 실패하면 document는 요청 전 값을 유지합니다.
성공하면 결과에 `JSONAppliedChange`가 들어가고 새 값은 `document.value`에서
읽을 수 있습니다.

`JSONDocumentCommitOptions.metadata`에는 `JSONChangeMetadata`를 넘길 수
있습니다. document는 metadata를 적용된 change와 함께 구독자에게 전달합니다.

## 변경 구독하기

`subscribe(listener)`는 성공해서 값이 달라진 commit을 전달합니다.

```ts
const unsubscribe = document.subscribe((change) => {
  console.log(change.applied);
  console.log(change.metadata);
});

document.commit([
  { op: "replace", path: "/title", value: "Published" },
]);

unsubscribe();
```

구독을 끊은 뒤에는 listener가 호출되지 않습니다. 한 listener에서 발생한
예외는 다른 listener의 호출과 `commit` 결과에 영향을 주지 않습니다.

## Validator 연결하기

`JSONDocumentOptions.validate`는 적용할 JSON을 받아
`JSONPatchValidationResult`를 돌려주는 동기 함수입니다. 특정 schema library의
타입을 요구하지 않습니다.

```ts
import * as z from "zod";
import { createJSONDocument } from "@interactive-os/json-document";
import { createZodValidator } from "@interactive-os/json-document-zod";

const Schema = z.object({
  title: z.string().min(1),
});

const document = createJSONDocument(
  { title: "Draft" },
  { validate: createZodValidator(Schema) },
);
```

validator가 허용한 JSON이 document state에 들어갑니다. schema library가
검사 중에 별도의 변환 값을 만들더라도 그 값으로 입력 JSON을 교체하지
않습니다. 정규화가 필요하면 변경 내용을 JSON Patch operation에 포함합니다.

## Result 읽기

공개 Result는 `ok`로 성공과 실패를 구분합니다.

```ts
type Failure = {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: Pointer;
};
```

`code`로 실패 종류를 처리하고, 제공된 경우 `reason`과 `pointer`를 진단에
사용합니다. minor version에서 새 `code`나 선택 diagnostic field가 추가될 수
있으므로 failure 객체의 키 집합을 고정하지 않습니다.

## 작업별 진입점

| 작업 | API | 결과 |
| --- | --- | --- |
| 현재 값 | `document.value` | `JSONValue` |
| 한 위치 읽기 | `document.at(pointer)` | `ReadResult` |
| 여러 위치 찾기 | `document.query(jsonPath)` | `QueryResult` |
| patch 검사 | `document.validatePatch(operations)` | `JSONPatchValidationResult` |
| 상태 변경 | `document.commit(operations, options?)` | `JSONDocumentCommitResult` |
| 변경 구독 | `document.subscribe(listener)` | unsubscribe function |
| document 없이 patch 적용 | `applyPatch(value, operations)` | `JSONPatchResult` |
| Pointer 만들기 | `buildPointer`, `appendSegment`, `parentPointer` | `Pointer` |
| Pointer parse | `parsePointer`, `tryParsePointer` | segments 또는 `null` |
| patch 뒤 위치 추적 | `trackPointer` | `Pointer | null` |

## 공개 export

Package root는 다음 21개 symbol을 공개합니다.

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

Selection, Clipboard, History와 Intent는
`@interactive-os/json-document-editing`에서 이 API 위에 조합합니다. 외부 도구와
연결하는 패키지는 [Adapters](adapters.md)와 [Connectors](connectors.md)에서
찾을 수 있습니다.
