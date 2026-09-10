# json-document

JSON을 읽고, 찾고, 고치고, 구독하는 작은 API입니다.

주소는 JSON Pointer, 검색은 JSONPath, 변경은 JSON Patch입니다.

v3 표준 상태는 Stable입니다. 현재 source release version은 `3.0.0`이며 npm에는
아직 배포되지 않았습니다. reference와 독립 구현이 같은 conformance suite를
통과했고, form·table/data-grid·outliner/tree·rich text·storage/collaboration
pressure gate까지 검증했습니다.

- 공식 사이트: https://developer-1px.github.io/json-document/
- 표준 profile: `standards/json-document-v3/profile.md`

## 설치

Core만 쓸 때 필수 dependency가 없습니다. `3.0.0`이 npm에 배포된 뒤 다음
명령을 사용합니다.

```sh
npm install @interactive-os/json-document@3.0.0
```

## 60초 시작

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const document = createJSONDocument({
  title: "Draft",
  tasks: [{ id: "a", done: false }],
});

const validation = document.validatePatch([
  { op: "replace", path: "/tasks/0/done", value: true },
]);

if (validation.ok) {
  const result = document.commit([
    { op: "replace", path: "/tasks/0/done", value: true },
  ], {
    metadata: { origin: "task-toggle" },
  });

  if (result.ok) {
    result.change.applied;
    document.value;
  }
}
```

Document의 필수 member는 여섯 개뿐입니다.

| Member | 책임 |
| --- | --- |
| `value` | immutable current document value |
| `at(pointer)` | 정확한 JSON Pointer 한 곳 읽기 |
| `query(jsonPath)` | JSONPath를 Pointer 배열로 환원 |
| `validatePatch(operations)` | state를 바꾸지 않는 patch validation |
| `commit(operations, options?)` | 유일한 stateful mutation |
| `subscribe(listener)` | change notification 구독 |

subscriber는 state가 commit된 뒤 호출된다. 한 subscriber의 예외는 `commit`
밖으로 전파되거나 성공 result를 바꾸지 않으며, 뒤 subscriber의 전달도 막지
않는다.

실패는 throw 대신 `{ ok: false, code, reason?, pointer? }` result로 돌아옵니다.
새 error code와 optional field가 추가될 수 있으므로 consumer는 exact key 집합에
의존하지 않아야 합니다.

## Validation

Core는 특정 schema object를 받지 않습니다. Validator를 `validate`
callback으로 연결합니다. 반환된 parse value를 받지 않으므로 commit-time
transform이 state에 몰래 들어갈 수 없습니다.

```ts
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document";

const Schema = z.object({
  title: z.string(),
  tasks: z.array(z.object({ id: z.string(), done: z.boolean() })),
});

const document = createJSONDocument(
  { title: "Draft", tasks: [] },
  {
    validate(candidate) {
      const result = Schema.safeParse(candidate);
      return result.success
        ? { ok: true }
        : {
            ok: false,
            code: "schema_violation",
            reason: JSON.stringify(result.error.issues),
          };
    },
  },
);
```

Initial value와 patch payload, metadata, exposed document value/change는 document가
소유합니다. caller reference나 subscriber가 committed state를 우회해 바꿀 수
없습니다.

## 공개 root

Root의 공개 계약은 `public-contract.json`으로 검사합니다.

```txt
values
  applyPatch, createJSONDocument
  appendSegment, buildPointer, parentPointer, parsePointer
  isJSONValue, jsonEqual, parseArrayIndex, readPointer, trackPointer, tryParsePointer

types
  JSONValue, Pointer, JSONPatchOperation
  JSONAppliedChange, JSONPatchResult, JSONDocumentCommitResult
  JSONPatchValidationResult, JSONChangeMetadata
  JSONDocumentOptions, JSONDocumentCommitOptions
  ReadResult, QueryResult, JSONDocument
```

`JSONDocument`는 application-owned structural contract입니다. Selection,
history와 clipboard는 optional editing companion이 조합하고, framework binding은
독립 Connector가 이 여섯 member를 사용합니다. Root package는 `/session`이나
`/react` subpath를 공개하지 않습니다.

## 순수 core

`isJSONValue(value: unknown): value is JSONValue`는 Core의 JSON tree 제약을
검사합니다. 값을 복제하거나 정규화하지 않습니다. 유한하지 않은 숫자, 희소 배열,
접근자·symbol 속성, 비표준 객체, 순환 또는 공유 객체 참조는 거절합니다.
도메인 schema의 추가 조건은 각 도메인이 검사합니다.

`readPointer(value: JSONValue, pointer: Pointer): ReadResult`는 `document.at`과
동일한 주소 해석을 값에 직접 적용합니다. 일반 Pointer와 URI fragment를 지원하고,
실패는 `invalid_pointer` 또는 `path_not_found`로 반환합니다. 입력은 이미 유효한
JSON이어야 하며, 반환한 값은 원본 참조입니다. 입력을 복제·동결하거나 소유하지
않으므로 immutable snapshot을 읽을 때도 참조 동일성이 유지됩니다.

```ts
import { isJSONValue, readPointer } from "@interactive-os/json-document";

const input: unknown = { "a/b~": [{ title: "Draft" }] };
if (isJSONValue(input)) {
  const result = readPointer(input, "#/a~1b~0/0/title");
  // { ok: true, path: "#/a~1b~0/0/title", value: "Draft" }
}
```

실행 가능한 Usage와 구현 source는 site의 `/connectors/react`에서 확인할 수
있습니다. 이 stateless API는 `JSONDocument`의 여섯 멤버를 늘리지 않습니다.

`applyPatch`는 schema, session, UI 없이 ordered atomic JSON Patch를 적용합니다.

```ts
import { applyPatch } from "@interactive-os/json-document";

const initial = { title: "draft", tags: [] };

const r = applyPatch(initial, [
  { op: "add", path: "/tags/-", value: "docs" },
  { op: "replace", path: "/title", value: "final" },
]);

if (r.ok) {
  r.value;
  r.change.applied;
}
```

성공한 `applied`는 `/-`를 실제 index로 바꾸고 RFC operation field만 보존합니다.
실패하면 partial value나 partial applied patch를 노출하지 않습니다.

## 직렬화

State, operation, metadata와 change는 JSON입니다.

```ts
import * as z from "zod";

const Schema = z.object({ title: z.string() });
const state = { title: "draft" };

const json = JSON.stringify(state);
const restored = JSON.parse(json);
const safe = Schema.safeParse(restored);
```

Operation batch는 `application/json-patch+json`으로 전송할 수 있습니다.

```ts
const operations = [
  { op: "replace", path: "/title", value: "final" },
];
const body = JSON.stringify(operations);

body satisfies string;
```

## 생태계와 Host 경계

Form, data-grid, outliner, rich text, persistence/collaboration extension은 여섯
member `JSONDocument`를 포트로 받습니다. 문서 고유 모델·의미 연산·Projection은
Document Type, 선택·작업·History는 Editing, 플랫폼 입력과 DOM lifecycle은
Adapter의 책임입니다. 이 기능을 Core나 Host에 재구현하지 않습니다.

React, Zod와 TanStack Table 같은 외부 생태계의 반복되는 integration은 Root가
아니라 `@interactive-os/json-document-<target>` 공식 Connector가 제공합니다.
Host는 제품 정책 값·copy·fixture·layout, 정본 모듈의 조합·실행 순서와
구체 외부 인스턴스 주입을 소유합니다.

현재 package 배치와 목표 책임의 수렴은 구별합니다. Document Type 후보와
Official Hands Profile의 전체 완료는 아직 TBD이며 Core v3의 Stable 계약을
확장하지 않습니다.

- [Concept Map](../../docs/public/concepts.md)
- [Building Blocks](../../docs/public/building-blocks.md)
- [Document Types · TBD](../../docs/public/document-types.md)
