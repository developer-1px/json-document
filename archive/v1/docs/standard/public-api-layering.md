# Public API 레이어링

## 의도

`json-document`의 public API는 document facade를 중심으로 둔다. 앱 코드는 가능한 한 `createJSONDocument`, `useJSONDocument`, `doc.*`만 기억한다. JSON Patch, JSON Pointer helper, selection detail, text-surface adapter 같은 저수준 도구는 root facade에서만 노출하고, 별도 advanced subpath는 공개 계약으로 두지 않는다.

## 레이어 지도

```txt
src/
├─ application/
│  ├─ document/
│  └─ react-document/
├─ domain/
│  ├─ document/
│  ├─ clipboard/
│  ├─ editing/
│  ├─ schema/
│  ├─ selection/
│  └─ text-surface/
└─ foundation/
   ├─ error/
   ├─ history/
   ├─ json/
   ├─ jsonpath/
   ├─ patch/
   └─ pointer/
```

레이어 의존은 인접 하위 레이어만 허용한다.

```txt
application -> domain -> foundation
```

`application -> foundation`처럼 레이어를 건너뛰는 import는 금지한다. 이 규칙은 방향성 벽이다.

방향성 벽만으로는 추상화 벽이 완전히 봉인되지 않는다. 상위 레이어가 인접 하위 레이어 안의 구현 파일을 직접 import하면, 방향은 맞아도 하위 레이어의 파일 구조와 내부 어휘가 새어 나온다. 그래서 레이어를 crossing할 때는 하위 레이어가 명시한 seam만 통과한다.

```txt
application -> domain/document/index
domain -> foundation/{error,history,json,jsonpath,patch,pointer}/index
```

`npm run layers:check -w @interactive-os/json-document`는 두 가지를 함께 검증한다.

- 첫 번째 path segment는 `application`, `domain`, `foundation` 중 하나다.
- cross-layer import는 인접 하위 레이어의 명시 seam 목록에 포함되어야 한다.

즉 `application`은 `domain/document/index.ts`를 통해서만 domain으로 들어간다. `domain`은 foundation concept index를 통해서만 foundation으로 들어간다. 하위 레이어 내부 파일 이동은 상위 레이어 import 변경을 요구하지 않아야 한다.

## Entrypoint

| Entrypoint | 역할 | 의도한 caller |
| --- | --- | --- |
| `@interactive-os/json-document` | core document facade | 앱 코드 |
| `@interactive-os/json-document/react` | core document facade의 React adapter | React 앱 코드 |

Package export는 source layer가 아니라 routing table이다. `public` 또는 `surface` 폴더를 첫 번째 path segment로 두지 않는다.

## Core Surface

사용자가 먼저 배워야 하는 표면은 다음이다.

```txt
createJSONDocument
useJSONDocument

doc.value
doc.patch
doc.commit

doc.insert
doc.replace
doc.delete
doc.move

doc.can*
doc.at
doc.entries
doc.find

doc.undo
doc.redo
```

## 후속 리팩터링

### `can*`와 실행 planning 공유

`can*`는 edit verb의 병렬 구현으로 자라면 안 된다. 목표 구조는 다음이다.

```txt
operation planner -> can preview
operation planner -> execute/apply/history/selection update
```

이렇게 해야 validation과 execution behavior가 맞물리고, application이 domain detail을 건너뛰어 직접 아는 지점을 줄일 수 있다.

### schema-aware patching을 foundation 위로 이동

`foundation/patch`는 raw JSON Patch primitive 쪽으로 수렴해야 한다. Zod schema validation은 schema-aware domain/application module 책임이다.

호환성 메모: 현재 public `applyPatch`는 schema-aware 함수다. import path나 의미를 바꾸는 것은 breaking change 판단이므로, root export 제거는 major version 또는 deprecation transition을 거쳐야 한다.

### insert와 paste option 어휘 분리

`insert`는 내부적으로 paste와 구현을 공유할 수 있다. 하지만 public option이 paste vocabulary를 자동으로 상속하면 안 된다. `InsertOptions`는 core edit verb에 필요한 범위로 제한하고, paste-specific option은 paste/clipboard surface에서 노출한다.

진행 상태(#214/#219): `JSONDocumentInsertOptions`는 더 이상 `PasteOptions`를 상속하지 않고 자체 필드(`spread`, `trustedPayload`)로 정의된다. `rekey`는 deprecated alias로 1.x에서만 허용되며 2.0에서 제거된다.
