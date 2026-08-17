# json-document Implementation Shape Standard

상태: Canonical

이 문서는 현재 `json-document` repository에서 package 내부 책임을 배치하는
유일한 사람 작성 정본이다. `standards/repository-naming.md`가 **무엇을 어떤
이름으로 부르는가**를 정한다면, 이 문서는 **그 책임을 어느 module과 public
entrypoint에 두는가**를 정한다.

이 문서는 runtime 동작, public TypeScript API, package `exports`, wire 형식과
dependency direction을 변경하지 않는다. Source 이동은 각 구현 이슈가 별도로
소유한다.

## 목표

좋은 구현 모양은 repository 사용자가 새 규칙을 배우지 않고도 다음 질문에
답하게 한다.

1. 이 책임을 어느 package에서 찾는가?
2. 이 package 안에서 어느 module이 책임을 소유하는가?
3. 어느 경로가 public이고 어느 경로가 implementation detail인가?
4. 새 책임이 생겼을 때 flat source를 유지하는가, folder로 승격하는가?

동일한 변경 이유는 같은 이름과 모양을 사용한다. Domain 의미가 다른 책임은
겉모양을 맞추기 위해 합치지 않는다.

## 권위와 우선순위

구조 판단은 다음 순서를 따른다.

1. Normative standard 또는 platform contract가 정한 경계
2. `package.json`의 배포·peer dependency 경계
3. `standards/repository-naming.md`의 canonical concept와 이름
4. 같은 이유로 함께 바뀌는 domain responsibility
5. 이 문서의 package 내부 배치 문법

낮은 순위의 모양이 높은 순위의 계약을 바꾸지 않는다. 특히 내부 파일을
정리하기 위해 public export를 추가하거나 domain concept를 합치지 않는다.

## 기본 모형

```text
repository
|-- package                         # 독립 배포·dependency 경계
|   |-- public entrypoint           # package.json exports가 허용한 계약
|   `-- responsibility module      # 하나의 변경 이유를 소유하는 내부 경계
|       `-- local implementation    # 그 책임에서만 쓰는 세부사항
|-- standards                       # repository·versioned normative contract
|-- docs                            # 외부 사용자를 위한 설명
`-- site                            # route-owned product surface와 shared UI
```

Package는 같은 도구를 쓴다는 이유가 아니라 독립 배포, 외부 peer 격리 또는
대체 가능한 runtime 경계 때문에 존재한다. Folder와 file은 독립 package가 될
필요는 없지만 서로 다른 변경 이유를 가진 책임을 표현한다.

## 책임 분류

모든 source module은 다음 중 하나의 주책임을 가진다.

| 책임 | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| Public facade | 허용한 value·type의 re-export | Runtime 구현, compatibility 외 새 의미 |
| Orchestration | 이미 정의된 책임의 순서와 lifecycle 조립 | Foundation algorithm, platform event 해석 |
| Domain model | Domain value, invariant, vocabulary | UI lifecycle, 외부 framework contract |
| Domain operation | Domain state transition과 plan | Package assembly, DOM event normalization |
| Foundation | 표준에 닻을 둔 순수 algorithm·value primitive | Product/domain policy |
| Adapter | Platform/model contract 변환 | Domain state와 product command 의미 |
| Binding | 두 public model 사이의 지속 synchronization | 대상 model의 내부 구현 |
| Connector | 외부 생태계 native entry와 package integration | 공통 Connector runtime interface |
| Runtime state | 한 lifecycle이 소유하는 mutable state | 다른 profile의 선택적 세부 상태 |
| Validation | State를 바꾸지 않는 입력·candidate 검사 | Transformation과 normalization |
| Test support | Production-shaped fixture와 test host | 배포 public API |

한 module에 여러 역할이 보이더라도 같은 이유로 항상 함께 바뀌고 독립 경계를
만들 수 없다면 하나의 책임으로 유지한다. 표의 행마다 파일을 하나씩 만들지
않는다.

## 배치 결정

새 code나 기존 code를 배치할 때 다음 순서로 결정한다.

```text
책임의 owner package가 하나인가?
|-- 아니오 -> package public contract와 dependency direction부터 결정한다.
`-- 예
    |
    +-- 기존 responsibility module과 같은 이유로 바뀌는가?
    |   |-- 예 -> 그 module 가까이에 둔다.
    |   `-- 아니오
    |       |
    |       +-- 독립 입력·출력과 검증을 가진 책임인가?
    |       |   |-- 예 -> 책임 이름의 module을 만든다.
    |       |   `-- 아니오 -> 호출 owner의 local implementation으로 둔다.
    |       |
    |       `-- 같은 책임의 파일이 둘 이상 함께 움직이는가?
    |           |-- 예 -> 책임 이름의 folder로 승격한다.
    |           `-- 아니오 -> flat file을 유지한다.
    |
    `-- 외부 소비자가 알아야 하는가?
        |-- 예 -> 기존 public entrypoint에서 명시적으로 export한다.
        `-- 아니오 -> package 내부 경로로 유지한다.
```

## Flat source 유지

다음 조건을 모두 만족하면 package `src/`의 flat file을 유지한다.

- 각 file의 변경 이유가 이름으로 구분된다.
- 한 책임을 이해하기 위해 여러 directory를 왕복하지 않는다.
- 내부 dependency direction이 import만으로 읽힌다.
- 같은 책임에 딸린 private file 군집이 없다.
- 새 folder가 public concept처럼 오해될 이유가 더 크다.

File 수와 LOC는 승격 조건이 아니다. 작은 package와 하나의 native contract만
번역하는 Connector는 구현을 `index.ts`에 둘 수 있다. 다만 `index.ts` 안에서
독립적으로 검증되는 두 책임이 생기면 구현을 책임 module로 옮기고
`index.ts`는 facade로 남긴다.

## Responsibility folder 승격

다음 중 하나가 성립하고 분리 뒤 dependency가 한 방향으로 유지될 때 folder로
승격한다.

- 하나의 file이 독립 입력·출력·검증을 가진 변경 이유를 둘 이상 소유한다.
- 같은 책임의 implementation, local type, fixture가 항상 함께 움직인다.
- Package root의 서로 다른 책임이 같은 generic file name을 경쟁한다.
- 외부 platform 또는 runtime profile의 세부사항을 다른 domain code에서 숨겨야
  한다.

Folder 이름은 `utils`, `common`, `shared`, `misc`, `helpers`, `types` 같은 재사용
주장이 아니라 책임 이름을 사용한다. `shared`는 site처럼 실제 repository-owned
공유 surface가 이미 정본인 곳에서만 category로 사용할 수 있다.

승격 뒤의 최소 모양은 다음과 같다.

```text
responsibility/
|-- index.ts          # 필요할 때만 local facade
|-- <responsibility>.ts
`-- <specific-detail>.ts
```

`model.ts`, `types.ts`, `utils.ts`를 모든 folder에 기계적으로 만들지 않는다.
하위 file은 실제 책임 이름이 있을 때만 생긴다.

## Public entrypoint

Public surface는 `package.json`의 `exports`가 정한다.

```text
package.json exports
|-- "."              -> src/index.ts 또는 대응 build output
`-- "./<subpath>"    -> src/<subpath>-index.ts 또는 대응 entry
```

규칙은 다음과 같다.

- `index.ts`와 `<subpath>-index.ts`는 허용한 public symbol을 명시적으로 export한다.
- Package 내부 code는 public barrel을 역으로 import하지 않는다.
- 내부 source path는 다른 package의 계약이 아니다.
- 새 subpath는 독립 vocabulary와 lifecycle을 가진 public capability일 때만 만든다.
- 단순히 file이 크거나 import 문을 줄이기 위해 subpath를 만들지 않는다.
- Compatibility alias는 canonical entry에서 선언하고 내부 구현 이름으로
  전파하지 않는다.
- 하나의 native integration만 가진 작은 Connector는 `index.ts`가 facade와
  구현을 함께 맡을 수 있다. 두 번째 독립 책임이 생기면 facade와 구현을
  분리한다.

## Dependency direction

책임 이동은 기존 package graph를 보존한다.

```text
Foundation / Selection
        ^
        |
Kernel public contract
        ^
        |
Editing / Domain / Collaboration
        ^
        |
Adapter / Connector
        ^
        |
Site / Host product
```

정확한 dependency는 package별 contract가 결정한다. 이 그림은 낮은 수준 package가
상위 integration의 세부사항을 알지 않는다는 방향만 나타낸다. Collaboration은
Kernel의 대체 구현이며 Editing의 하위 구현이 아니다. Selection은 dependency-free
foundation으로 유지한다.

## Test와 benchmark 배치

- 배포 source는 `src/`, package contract test는 `tests/`, 성능 기준선은
  `benchmarks/`가 소유한다.
- Test file은 검증하는 public/domain responsibility 이름을 사용한다.
- Test support가 여러 suite에서 같은 host contract를 제공하면
  `tests/support/`에 둔다.
- Production source는 test support를 import하지 않는다.
- Source 이동 때 test를 source folder로 기계적으로 옮기지 않는다.

## 현재 package 분류

아래 표는 현재 15개 library package를 이 문서의 모형으로 빠짐없이 분류한다.
`후속`은 이 RFC가 source를 이동하지 않고 별도 이슈가 책임짐을 뜻한다.

| Package path | 정본 모형 | 현재 판단 |
| --- | --- | --- |
| `packages/json-document` | Layered Kernel | `application/domain/foundation`과 root facade 유지 |
| `packages/json-document-selection` | Responsibility family | `core/interaction/ports`와 selection family folder 유지 |
| `packages/json-document-editing` | Domain family | Domain 응집은 유지하고 내부 책임 단면 정렬은 후속 #414 |
| `packages/json-document-react` | Single-native Connector | 하나의 React subscription/lifecycle entry로 flat 유지 |
| `packages/json-document-react-hook-form` | Single-native Connector | RHF lifecycle이 하나인 동안 flat 유지; 독립 binding이 생기면 분리 |
| `packages/json-document-ajv` | Single-native Connector | 하나의 validator translation으로 flat 유지 |
| `packages/json-document-zod` | Composite Connector | validator와 Database translation을 책임 file로 분리한 현재 모양 유지 |
| `packages/json-document-tanstack-table` | Single-native Connector | 하나의 Table/Sheet binding으로 flat 유지 |
| `packages/json-document-web` | Adapter family | keyboard/clipboard/input/modifier 책임 file과 root facade 유지 |
| `packages/json-document-contenteditable` | Composite Adapter | React entry, binding, DOM adapter 책임 분리 유지 |
| `packages/json-document-rich-text` | Composite Domain | schema/model/validation/topology 경계 유지; editor 책임 분리는 후속 #415 |
| `packages/json-document-rich-text-web` | Adapter family | clipboard와 contenteditable 책임 file, root facade 유지 |
| `packages/json-document-rich-text-react` | Composite Connector | React render surface와 render store 책임 분리 유지 |
| `packages/json-document-collaboration` | Profiled runtime | root/history/text public entry와 책임 module 유지; profile 의미를 합치지 않음 |
| `packages/contenteditable-collaboration` | Composite Adapter | lease, DOM adapter, public type 책임 분리 유지 |

## 정본 예시

### Single-native Connector

```text
json-document-ajv/
|-- package.json
|-- src/
|   `-- index.ts       # public contract와 하나의 native translation
`-- tests/
    `-- ajv-connector.test.ts
```

독립 책임이 하나이므로 file을 나누지 않는다.

### Adapter family

```text
json-document-web/
`-- src/
    |-- index.ts       # public facade
    |-- keyboard.ts
    |-- clipboard.ts
    |-- input.ts
    `-- modifiers.ts
```

Platform event family마다 변경 이유와 contract가 다르므로 책임 file을 둔다.

### Composite Domain

```text
json-document-rich-text/
`-- src/
    |-- index.ts       # public facade
    |-- model.ts
    |-- schema.ts
    |-- validation.ts
    |-- topology.ts
    `-- <domain responsibility>/
```

마지막 folder는 실제로 둘 이상의 local file이 같은 독립 책임을 가질 때만
생긴다. 미리 빈 구조를 만들지 않는다.

## 구조 변경 점검

Source를 이동하는 이슈는 다음을 모두 증명한다.

1. 이동 전과 후의 responsibility tree
2. 각 새 module의 독립 변경 이유
3. 남은 dependency와 순환 부재
4. `package.json` exports와 public symbol 보존
5. 관련 unit, conformance, build, package smoke 또는 browser 검증

다음은 구조 변경의 근거가 아니다.

- File이 길다.
- 다른 package가 folder를 사용한다.
- 같은 이름의 작은 helper가 둘 이상 있다.
- 미래에 재사용할 수 있을 것 같다.
- 모든 package가 같은 모양이면 보기 좋다.

## 변경 절차

새 구조 문법이나 예외는 먼저 이 문서를 변경한다. 단일 구현의 편의를 위해
정본을 우회하지 않는다. Naming 변경이 함께 필요하면
`standards/repository-naming.md`를 먼저 통과한다. Public API, runtime 동작 또는
versioned protocol 변경은 각 contract의 별도 승인과 검증을 사용한다.
