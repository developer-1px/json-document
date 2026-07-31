# json-document Docs

json-document v3는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수
있는 implementation-neutral JSON 편집 API와 headless JSON Document입니다.
루트 package는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 하며 Zod,
React, selection, clipboard, history를 필수 계약에 넣지 않습니다.

```txt
stateless JSON Patch
  |-> local implementation -----\
  |                               > same six-member JSON Document
  `-> collaboration engine -----/    |-> optional history/text authoring
                                     `-> optional native-input DOM lease
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
- immutable document value, patch validation, atomic commit, change notification

DOM, focus, keyboard, geometry, system clipboard, filesystem, network, formula,
CRDT와 OT는 host 또는 adapter 책임입니다.

## 핵심 개념

| 개념 | 뜻 |
| --- | --- |
| JSON value | 편집 대상이 되는 직렬화 가능한 상태 |
| JSON Pointer | 한 위치를 정확히 가리키는 주소. 예: `/lists/0/cards/0/title` |
| JSONPath | 여러 위치를 찾는 query. 결과는 Pointer 목록 |
| JSON Patch | ordered atomic mutation 형식 |
| Stateless JSON Patch | 현재 document instance 없이 JSON Patch를 적용하는 함수 |
| JSON Document | 현재 document value에 read, validation, commit, notification을 연결한 여섯-member port |
| validation | Candidate document를 commit 전에 검사하는 implementation-neutral callback |
| Host adapter | selection, clipboard, history, DOM과 고수준 편집 동사를 소유하는 별도 계층 |

전체 canonical concept, 접두어·접미어·동사·boolean 규칙은
[Concept and Naming Standard](https://github.com/developer-1px/json-document/blob/main/docs/standard/concept-and-naming-standard.md)가
정의합니다. Public API는 canonical identifier만 제공합니다.

가장 중요한 경계는 query와 mutation을 섞지 않는 것입니다.

```txt
검색: JSONPath -> Pointer[]
변경: Pointer -> JSON Patch
검증: JSON candidate -> validation result
상태: immutable document value
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

if (document.validatePatch(patch).ok) {
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
validatePatch
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

## Core와 host

| 표면 | 상태 | 책임 |
| --- | --- | --- |
| `@interactive-os/json-document` | v3 Kernel | Stateless JSON Patch와 여섯-member JSON Document |
| `@interactive-os/json-document-collaboration` | optional companion | 같은 JSON Document 뒤의 transport-free causal engine |
| `@interactive-os/json-document-contenteditable-collaboration` | optional companion | collaborative string의 native-input DOM lease |

패키지는 `/session`과 `/react`를 공개하지 않습니다. 구현 간 교환 가능한 코드는
루트 `JSONDocument` 여섯 member에만 의존하고, 편집 UX와 framework lifecycle은
host 또는 별도 adapter가 소유합니다. Local-only consumer는 Core만 설치하며,
collaboration engine으로 바꿔도 editor가 사용하는 `JSONDocument` API는
변하지 않습니다.

## Host adapter와 companion

Host adapter는 공개 `JSONDocument`만 입력으로 받고 제품 의도를 Pointer와
JSON Patch로 번역합니다. Selection, history, clipboard, persistence, focus와
remote protocol은 Core member를 늘리지 않고 adapter 쪽에 둡니다.
Collaboration companion도 transport, authentication, presence, persistence를
소유하지 않습니다. Adapter와 companion은 Core와 독립적으로 version과
compatibility를 검증합니다.

`@interactive-os/editable`은 DOM과 Input Events 정규화를 담당하는 별도 companion
예시입니다. `JSONDocument`는 canonical headless JSON state로 남고, editable은
contenteditable lifecycle을 소유하며, 문서별 의미는 adapter가 연결합니다.
이 companion은 json-document v3 release catalog에 포함되지 않습니다.

## 자주 쓰는 작업

| 하고 싶은 일 | 먼저 보는 API |
| --- | --- |
| 현재 값 읽기 | `document.value`, `document.at(pointer)` |
| 여러 위치 찾기 | `document.query(jsonPath)` |
| 변경 가능성 확인 | `document.validatePatch(operations)` |
| 상태 변경 | `document.commit(operations, options?)` |
| 변경 구독 | `document.subscribe(listener)` |
| instance 없는 patch 적용 | `applyPatch(value, operations)` |
| Pointer 조합과 추적 | `buildPointer`, `appendSegment`, `parentPointer`, `trackPointer` |
| selection, clipboard, undo/redo | host 또는 별도 adapter |

성공한 mutation의 `change.applied`는 실제 적용된 canonical operation입니다.
실패는 throw 대신 `{ ok: false, code, reason?, pointer? }` result로 표현됩니다.

## 이걸로 할 수 있는 것들

- Form과 settings editor: validation으로 commit 가능한 JSON 구조 제한
- Data grid: cell과 row 변경을 ordered JSON Patch로 표현
- Outliner와 block docs: tree command를 Pointer와 Patch로 환원
- Slide와 whiteboard: object property와 layer state를 headless JSON으로 관리
- 저장과 협업 adapter: subscribed canonical change를 외부 log로 전달

제품별 selection, clipboard, history는 host 또는 별도 adapter에서
조합합니다. Core JSON Document는 그 기능을 필수 member로 요구하지 않습니다.
