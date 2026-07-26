# json-document Docs

json-document v2는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수
있는 provider-neutral JSON 편집 protocol과 headless document projection입니다.
루트 package는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 하며 Zod,
React, selection, clipboard, history를 필수 계약에 넣지 않습니다.

```txt
Pure Protocol
  |-> Document Projection -> host adapter
  `-> Candidate Editing Session -> React / rich host adapter
```

## 배경

편집 제품의 UI는 서로 달라도 JSON 상태를 읽고, 변경 가능성을 확인하고,
ordered patch를 원자적으로 적용하고, 변경을 구독하는 흐름은 반복됩니다.
이 최소 의미를 제품별 controller와 분리하면 저장, 협업, 렌더링 adapter가 같은
계약을 공유할 수 있습니다.

Core는 다음만 소유합니다.

- RFC 8259 JSON data
- RFC 6901 JSON Pointer
- RFC 9535 JSONPath query
- RFC 6902 JSON Patch
- immutable snapshot, capability result, atomic commit, publication

DOM, focus, keyboard, geometry, system clipboard, filesystem, network, formula,
CRDT와 OT는 host 또는 extension 책임입니다.

## 핵심 개념

| 개념 | 뜻 |
| --- | --- |
| JSON value | 편집 대상이 되는 직렬화 가능한 상태 |
| JSON Pointer | 한 위치를 정확히 가리키는 주소. 예: `/lists/0/cards/0/title` |
| JSONPath | 여러 위치를 찾는 query. 결과는 Pointer 목록 |
| JSON Patch | ordered atomic mutation 형식 |
| Pure Protocol | 현재 document instance 없이 JSON Patch를 적용하는 함수 |
| Document Projection | 현재 snapshot에 read, probe, commit, publication을 연결한 여섯-member port |
| acceptance | candidate state를 publish 전에 검사하는 provider-neutral callback |
| Editing Session | selection, clipboard, history와 고수준 편집 동사를 가진 Candidate 선택 표면 |

가장 중요한 경계는 query와 mutation을 섞지 않는 것입니다.

```txt
검색: JSONPath -> Pointer[]
변경: Pointer -> JSON Patch
검증: JSON candidate -> acceptance result
상태: immutable JSON snapshot
```

## 기본 사용 흐름

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const document = createJSONDocument({
  id: "c1",
  title: "Write docs",
  status: "todo",
});

const patch = [
  { op: "replace", path: "/status", value: "doing" },
] as const;

if (document.canPatch(patch).ok) {
  const result = document.commit(patch, {
    metadata: { origin: "status-control" },
  });

  if (result.ok) {
    result.change.applied;
    document.value;
  }
}
```

`JSONDocument`의 필수 member는 여섯 개입니다.

```txt
value
at
query
canPatch
commit
subscribe
```

순수 변환만 필요하면 document를 만들지 않습니다.

```ts
import { applyPatch } from "@interactive-os/json-document";

const result = applyPatch(
  { title: "Draft" },
  [{ op: "replace", path: "/title", value: "Ready" }],
);

if (result.ok) {
  result.value;
  result.change.applied;
}
```

## Core와 Editing Session

| 표면 | 상태 | 책임 |
| --- | --- | --- |
| `@interactive-os/json-document` | v2 Kernel | Pure Protocol과 여섯-member Projection |
| `@interactive-os/json-document/session` | Candidate | Zod 기반 rich editing, selection, clipboard, history |
| `@interactive-os/json-document/react` | Candidate | 현재 Editing Session을 React lifecycle에 연결 |

`/session`과 `/react`는 v2 portable Core 적합성에 필요하지 않은 선택 표면입니다.
Candidate 기간에는 이름과 세부 signature가 바뀔 수 있으므로, 구현 간 교환 가능한
코드는 루트 `JSONDocument` 여섯 member에만 의존합니다.

## 자주 쓰는 작업

| 하고 싶은 일 | 먼저 보는 API |
| --- | --- |
| 현재 값 읽기 | `document.value`, `document.at(pointer)` |
| 여러 위치 찾기 | `document.query(jsonPath)` |
| 변경 가능성 확인 | `document.canPatch(operations)` |
| 상태 변경 | `document.commit(operations, options?)` |
| 변경 구독 | `document.subscribe(listener)` |
| instance 없는 patch 적용 | `applyPatch(value, operations)` |
| Pointer 조합과 추적 | `buildPointer`, `appendSegment`, `parentPointer`, `trackPointer` |
| selection, clipboard, undo/redo | Candidate Editing Session |

성공한 mutation의 `change.applied`는 실제 적용된 canonical operation입니다.
실패는 throw 대신 `{ ok: false, code, reason?, pointer? }` result로 표현됩니다.

## 이걸로 할 수 있는 것들

- Form과 settings editor: acceptance로 publish 가능한 JSON 구조 제한
- Data grid: cell과 row 변경을 ordered JSON Patch로 표현
- Outliner와 block docs: tree command를 Pointer와 Patch로 환원
- Slide와 whiteboard: object property와 layer state를 headless JSON으로 관리
- 저장과 협업 adapter: subscribed canonical change를 외부 log로 전달

제품별 selection, clipboard, history가 필요하면 Candidate Session 또는 작은
extension을 조합합니다. Core Projection은 그 기능을 필수 member로 요구하지
않습니다.
