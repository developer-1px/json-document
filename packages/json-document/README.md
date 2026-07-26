# json-document

문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수 있는 provider-neutral
JSON 편집 protocol과 headless document projection입니다.

v2 root는 JSON, RFC 6901 JSON Pointer, RFC 9535 JSONPath, RFC 6902 JSON
Patch만 전제로 합니다. UI framework, schema provider, history, selection,
clipboard는 core 계약이 아닙니다.

```txt
Pure Protocol
  |-> Document Projection -> host adapter
  `-> Candidate Editing Session -> React / rich host adapter
```

현재 버전은 `2.0.0-rc.0`입니다. root v2 binding은 구현됐지만, 독립 구현과 다섯
편집 vertical의 conformance gate를 통과하기 전까지 표준 profile은 Candidate로
유지합니다.

- 공식 사이트: https://developer-1px.github.io/json-document/
- 표준 profile: `docs/standard/v2-projection-profile.md`

## 설치

Core만 쓸 때 필수 dependency가 없습니다.

```sh
npm install @interactive-os/json-document@2.0.0-rc.0
```

기존의 Zod 기반 selection, clipboard, history 편집기는 optional Session
binding입니다.

```sh
npm install @interactive-os/json-document@2.0.0-rc.0 zod
```

React는 Session을 사용할 때만 필요합니다.

## 60초 시작

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const document = createJSONDocument({
  title: "Draft",
  tasks: [{ id: "a", done: false }],
});

const capability = document.canPatch([
  { op: "replace", path: "/tasks/0/done", value: true },
]);

if (capability.ok) {
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
| `value` | immutable current snapshot |
| `at(pointer)` | 정확한 JSON Pointer 한 곳 읽기 |
| `query(jsonPath)` | JSONPath를 Pointer 배열로 환원 |
| `canPatch(operations)` | state를 바꾸지 않는 동일 의미 probe |
| `commit(operations, options?)` | 유일한 stateful mutation |
| `subscribe(listener)` | publish된 change 구독 |

실패는 throw 대신 `{ ok: false, code, reason?, pointer? }` result로 돌아옵니다.
새 error code와 optional field가 추가될 수 있으므로 consumer는 exact key 집합에
의존하지 않아야 합니다.

## Schema acceptance

Core는 특정 schema object를 받지 않습니다. provider를 작은 acceptance 함수로
연결합니다. 반환된 parse value를 받지 않으므로 commit-time transform이 state에
몰래 들어갈 수 없습니다.

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
    accepts(candidate) {
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

initial value와 patch payload, metadata, published snapshot/change는 document가
소유합니다. caller reference나 subscriber가 committed state를 우회해 바꿀 수
없습니다.

## 공개 root

Root는 20개 Kernel symbol만 공개합니다.

```txt
values
  applyPatch, createJSONDocument
  appendSegment, buildPointer, parentPointer, parsePointer
  trackPointer, tryParsePointer

types
  JSONValue, Pointer, JSONPatchOperation
  JSONAppliedChange, JSONPatchResult, JSONDocumentCommitResult
  JSONCapabilityResult, JSONChangeMetadata, JSONDocumentCommitOptions
  ReadResult, QueryResult, JSONDocument
```

`JSONDocument`는 application-owned structural contract입니다. Candidate
Session은 아직 이 구조의 subtype이라고 약속하지 않는 별도 변경 경계입니다.

## Editing Session

Selection, clipboard, history, schema introspection과 `insert`, `replace`,
`delete`, `move`, `duplicate`, `copy`, `cut`, `paste`, `undo`, `redo`는 optional
Editing Session입니다.

```ts
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document/session";

const Schema = z.object({
  title: z.string(),
  tasks: z.array(z.object({ id: z.string(), done: z.boolean() })),
});

const session = createJSONDocument(
  Schema,
  { title: "Draft", tasks: [] },
  { history: 100, selection: true },
);

session.insert("/tasks/-", { id: "a", done: false });
session.undo();
```

`/session`은 rich editor 기능의 별도 변경 경계입니다. portable Core consumer는
이 subpath에 의존하지 않습니다.

## React — `useJSONDocument`

```tsx
import { z } from "zod";
import { useJSONDocument } from "@interactive-os/json-document/react";

const Schema = z.object({
  title: z.string(),
});

export function App() {
  const document = useJSONDocument(
    Schema,
    { title: "Draft" },
    { history: 20 },
  );

  return (
    <input
      value={document.value.title}
      onChange={(event) => {
        document.commit([
          { op: "replace", path: "/title", value: event.target.value },
        ]);
      }}
    />
  );
}
```

Root import graph에는 React와 Zod가 없습니다. React hook은 Editing Session
binding에만 연결됩니다.

## 순수 core

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

## Extension과 host 경계

Form, data-grid, outliner, rich text, persistence/collaboration extension은 여섯
member `JSONDocument`를 포트로 받는 것이 권장됩니다. DOM focus, geometry,
keyboard, system clipboard, filesystem, network, formula, CRDT와 OT는 host가
소유합니다.

- GitHub Wiki: https://github.com/developer-1px/json-document/wiki
- Extension guide: https://github.com/developer-1px/json-document/wiki/Labs-and-Extensions
