# json-document API

이 문서는 v3 루트 Kernel의 정본 API를 설명합니다.

```txt
@interactive-os/json-document
|-- createJSONDocument
|-- applyPatch
|-- Pointer helpers
`-- six-member JSONDocument
```

## 기준

- Portable Core는 `@interactive-os/json-document`만 import합니다.
- Core state, patch payload와 metadata는 JSON data입니다.
- 정확한 주소와 mutation target은 JSON Pointer입니다.
- JSONPath는 query 전용이며 결과를 Pointer 배열로 돌려줍니다.
- `validatePatch`는 side effect 없는 validation이고 `commit`만 state를 변경합니다.
- 실패는 boolean `ok`와 stable string `code`를 가진 Result입니다.

## 작업별 진입점

| 작업 | Core 진입점 | 결과 |
| --- | --- | --- |
| 현재 snapshot 읽기 | `document.value` | immutable JSON value |
| 한 위치 읽기 | `document.at(pointer)` | `ReadResult` |
| 여러 위치 찾기 | `document.query(jsonPath)` | `QueryResult` |
| patch 가능성 확인 | `document.validatePatch(operations)` | `JSONPatchValidationResult` |
| state 변경 | `document.commit(operations, options?)` | `JSONDocumentCommitResult` |
| 변경 구독 | `document.subscribe(listener)` | unsubscribe function |
| instance 없는 patch | `applyPatch(value, operations)` | `JSONPatchResult` |
| Pointer 조합 | `buildPointer`, `appendSegment`, `parentPointer` | `Pointer` |
| 변경 뒤 Pointer 추적 | `trackPointer` | `Pointer | null` |

Selection, clipboard, history와 high-level edit verb는 editing companion 또는
제품 domain이 `JSONDocument` 위에서 소유합니다. 외부 생태계 연결은 공식
Connector가 제공할 수 있습니다.

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

Core만 사용할 때 Zod와 React는 필요하지 않습니다.

## JSONDocument

공개 `JSONDocument`는 application-owned structural contract이며 필수 member가
정확히 여섯 개입니다.

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

추가 member가 있는 구현체도 이 여섯 member의 의미를 바꾸면 안 됩니다.

## value와 ownership

`value`는 현재 immutable document value입니다. Initial value, patch payload,
metadata, 이전 snapshot, read result와 published change는 caller의 mutable
reference와 격리됩니다.

```ts
const initial = { nested: { count: 1 } };
const document = createJSONDocument(initial);

initial.nested.count = 99;
document.value; // { nested: { count: 1 } }
```

같은 revision에서 object identity를 재사용할 수 있지만 consumer가 그 identity에
의존하면 안 됩니다.

## at

`at`은 정확한 JSON Pointer 한 곳을 읽습니다.

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

존재하지 않는 위치와 잘못된 Pointer는 throw 대신 failure Result입니다.

## query

`query`는 RFC 9535 JSONPath를 받아 deterministic Pointer 배열을 반환합니다.

```ts
const result = document.query("$..cards[?(@.status=='todo')]");

if (result.ok) {
  result.pointers;
}
```

JSONPath를 patch의 `path`나 `from`으로 넘기지 않습니다.

## Pointer 경계

Root document Pointer는 빈 문자열 `""`입니다. JSON Patch로 root 전체를
바꾸려면 `path: ""`를 사용합니다.

```ts
document.commit([
  { op: "replace", path: "", value: { title: "New" } },
]);
```

외부 plain string을 Pointer로 정규화할 때는 parse와 build를 조합합니다.

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

`parsePointer`는 잘못된 syntax를 throw하며, `tryParsePointer`는 `null`을
반환합니다. Patch나 document method는 expected Pointer failure를 Result로
바꿉니다.

## applyPatch

`applyPatch`는 schema provider, mutable session, UI 없이 ordered RFC 6902
batch를 적용하는 stateless JSON Patch 함수입니다.

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

공개 `applyPatch`는 외부 JSON 경계입니다. Non-JSON state나 payload는
`not_serializable` failure가 되며 input은 변경되지 않습니다. 성공한
`change.applied`는 `/-`를 concrete index로 바꾸고 RFC operation field만 남긴
canonical sequence입니다.

## validatePatch와 commit

두 method는 같은 JSON, Pointer, Patch와 validation 의미를 사용합니다.

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

`validatePatch`는 state와 subscriber를 바꾸지 않습니다. `commit`은 batch 전체를
동기적·원자적으로 적용합니다. 실패와 state-equivalent no-op은 change notification을
만들지 않습니다.

성공 commit은 post-commit snapshot을 중복 반환하지 않습니다.

## subscribe

```ts
const unsubscribe = document.subscribe((change) => {
  change.applied;
  change.metadata;
});

unsubscribe();
```

Subscriber는 이미 publish된 `JSONAppliedChange`를 받습니다. Unsubscribe 뒤의
변경은 전달되지 않습니다.

## Validation

`createJSONDocument`의 `validate` option은 특정 schema object를 요구하지 않는
implementation-neutral validation boundary입니다.

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

Initial state와 commit candidate 모두 commit notification 전에 검사됩니다. Callback이
parse한 변환값은 Core state로 채택되지 않으며, normalization이 필요하면 그
변경을 JSON Patch에 명시합니다.

Canonical concept와 result는 validation과 `JSONPatchValidationResult`입니다.
Naming 기준은
[Concept and Naming Standard](https://github.com/developer-1px/json-document/blob/main/standards/repository-naming.md)를
따릅니다.

## Result

공개 Result는 `ok`로 분기합니다.

```ts
type Failure = {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: Pointer;
};
```

새 error code와 optional diagnostic field가 추가될 수 있습니다. Consumer는
exact key 집합이나 exhaustive code union에 의존하지 않습니다.

## 공개 root

Root는 21개 public symbol만 공개합니다.

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

## Connector와 host

Root package는 `/session`이나 `/react` subpath를 공개하지 않습니다. Selection,
clipboard와 history는 optional editing companion이 조합합니다. React subscription
같은 반복되는 외부 integration은 `@interactive-os/json-document-react` 같은 독립
Connector package가 제공합니다. Schema introspection, DOM lifecycle과 제품별 UI
의미는 해당 Connector 또는 host의 명시적인 책임으로 남습니다.

Connector 개념, 패키지 정책, 제공되는 Zod와 TanStack Table API는
[Connectors](connectors.md)를 참고합니다.

## Editing companion

`@interactive-os/json-document-editing`은 renderer나 DOM을 소유하지 않는 별도
package입니다. 공통 `EditingSession` lifecycle 위에 Document, Order, Sheet,
Object와 Tree domain slice를 제공합니다.

```ts
import { createSheetEditor } from "@interactive-os/json-document-editing";

const editor = createSheetEditor({
  columns: [{ id: "status", label: "Status" }],
  rows: [{ id: "task-1", cells: { status: "Draft" } }],
});

editor.dispatch({
  type: "cell.commit",
  rowId: "task-1",
  columnId: "status",
  value: "Ready",
});

editor.dispatch({
  type: "selection.fill",
  value: "Ready",
});
```

`SheetEditor`는 stable row·column identity, primary range를 포함한 복수의
anchor/focus rectangular range, primary-range JSON/TSV clipboard, selection fill,
cell commit과 selection-restoring undo/redo를 제공합니다. Document와 Sheet는
같은 range-set 상태 전이를 사용하지만 선택 대상을 열거하는 topology와 JSON Patch
계획은 각각 소유합니다. Cell commit, fill과 paste는 canonical JSON Pointer와
ordered JSON Patch로 환원됩니다. Sorting, filtering, pagination, formula, DOM
focus와 renderer는 SheetEditor의 책임이 아닙니다.

Structural selection은 하나의 보편 엔진으로 합치지 않고 두 family로 나뉩니다.

```txt
range-set transition
  |-- Document ordered points
  |-- Order stable item IDs
  |-- Sheet row axis × column axis
  `-- Tree host-projected visible order

set-selection transition
  `-- Object stable IDs
```

Tree의 expand/collapse 상태와 visible order projection은 host가 소유하고,
`TreeEditor`는 전달받은 topology에 맞춰 range를 정규화하고 hierarchy mutation을
JSON Patch로 계획합니다. Object marquee의 pointer geometry와 hit-test도 host가
소유하며 `ObjectEditor`에는 hit된 stable ID만 전달합니다. 값 변경 history는
selection을 함께 복구합니다. Native text caret/range는 structural selection
family에 포함되지 않습니다.
