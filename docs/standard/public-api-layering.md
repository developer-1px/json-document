# Public API 레이어링

## 의도

`json-document`의 1차 public API는 document facade를 중심으로 둔다. 앱 코드는 가능한 한 `createJSONDocument`, `useJSONDocument`, `doc.*`만 기억하고, JSON Patch, JSON Pointer helper, selection detail, text-surface adapter 같은 저수준 도구는 advanced entrypoint에서 가져온다.

## 레이어 지도

```txt
App code
└─ Document facade
   └─ Domain capability
      └─ Foundation primitive
```

## Entrypoint

| Entrypoint | 역할 | 의도한 caller |
| --- | --- | --- |
| `@interactive-os/json-document` | core document facade와 호환 root | 앱 코드 |
| `@interactive-os/json-document/react` | core document facade의 React adapter | React 앱 코드 |
| `@interactive-os/json-document/patch` | JSON Patch helper와 patch result type | 고급 adapter 코드 |
| `@interactive-os/json-document/pointer` | JSON Pointer helper, sibling range, pointer tracking | 고급 adapter 코드 |
| `@interactive-os/json-document/selection` | Selection type surface | 고급 editor 코드 |
| `@interactive-os/json-document/text-surface` | Text editing adapter helper | rich text/contenteditable adapter |
| `@interactive-os/json-document/schema` | Schema inspection type | schema-driven UI adapter |
| `@interactive-os/json-document/clipboard` | Clipboard capability type | clipboard adapter와 extension 코드 |

root package는 1.x 동안 기존 low-level export를 호환성 때문에 유지한다. 새 예시는 low-level helper를 직접 쓸 때 advanced subpath를 우선한다.

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
