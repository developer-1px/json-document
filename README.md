# json-document

json-document는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수 있는
implementation-neutral JSON 편집 API와 headless JSON Document입니다.

v3 root는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 합니다. 브라우저
플랫폼 계약은 공식 Adapter로, React와 Zod 같은 외부 생태계는 independently
versioned 공식 Connector로 제공합니다.

```txt
stateless JSON Patch
  |-> local implementation -----\
  |                               > same six-member JSON Document
  `-> collaboration engine -----/    |-> optional headless editing
                                     |-> optional official Adapters
                                     |-> optional official Connectors
                                     |-> optional history/text authoring
                                     `-> optional native-input DOM lease
```

로컬 전용 사용자는 Core만 설치합니다. 협업으로 전환해도 편집기가 받는
`JSONDocument` 포트는 바뀌지 않고, causal merge와 native-input DOM lease만
독립 package로 추가합니다.

공식 사이트: https://developer-1px.github.io/json-document/

## 문서 지도

| 목적 | 위치 |
| --- | --- |
| 빠른 사용 예제 | [Intent guide](docs/public/intent-guide.md) |
| 목표 구조와 TBD | [Architecture](docs/public/architecture.md), [Foundation](docs/public/foundation.md) |
| JSON Document 개념 | [docs/public/overview.md](docs/public/overview.md) |
| JSON Document Protocol | [docs/public/api.md](docs/public/api.md) |
| Editing Protocol | [docs/public/editing.md](docs/public/editing.md) |
| Document Types · TBD | [후보와 완료 조건](docs/public/document-types.md) |
| Official Hands · TBD | [Profile의 목표와 현재 증거](docs/public/official-hands.md) |
| Building Blocks | [독립적인 네 책임](docs/public/building-blocks.md) |
| 편집 개념 | [docs/public/selection.md](docs/public/selection.md), [history](docs/public/history.md), [clipboard](docs/public/clipboard.md), [topology](docs/public/topology.md) |
| Adapter | [docs/public/adapters.md](docs/public/adapters.md) |
| Connector | [docs/public/connectors.md](docs/public/connectors.md) |
| Adapter Live Demo | [공식 Adapter catalog](https://developer-1px.github.io/json-document/adapters) |
| Connector Live Demo | [공식 Connector catalog](https://developer-1px.github.io/json-document/connectors) |
| 문서 구조 | [docs/README.md](docs/README.md) |
| 변경 기록 | [docs/changelog.md](docs/changelog.md) |
| 개념·이름 정본 | [standards/repository-naming.md](standards/repository-naming.md) |
| 구현 모양 정본 | [standards/repository-implementation-shape.md](standards/repository-implementation-shape.md) |
| DOM 편집 lifecycle 정본 | [standards/dom-editing-lifecycle.md](standards/dom-editing-lifecycle.md) |
| v3 JSON Document profile | [standards/json-document-v3/profile.md](standards/json-document-v3/profile.md) |
| v3 공개 표면 manifest | [standards/json-document-v3/public-surface.json](standards/json-document-v3/public-surface.json) |

## 코드 지도

| 위치 | 역할 |
| --- | --- |
| [packages/json-document](packages/json-document) | 배포되는 v3 Kernel |
| [packages/json-document-editing](packages/json-document-editing) | headless transaction, structural selection, clipboard, history와 Document·Order·Sheet·Object·Tree·Database slice |
| [packages/json-document-ui-primitives-react](packages/json-document-ui-primitives-react) | 표준화된 Hands 행동과 디자인 시스템을 갖춘 minimalist React UI Primitives |
| [packages/json-document-selection](packages/json-document-selection) | DOM-free key·range·mask family, topology/geometry port와 semantic interaction controller |
| [packages/json-document-web](packages/json-document-web) | official keyboard adapter, ClipboardEvent, text-control input과 modifier state를 editing contract로 번역하는 Adapter |
| [packages/json-document-contenteditable](packages/json-document-contenteditable) | local JSONDocument 문자열을 leased contenteditable React root에 붙이는 Adapter |
| [packages/json-document-react](packages/json-document-react) | React subscription과 Document editor lifecycle Connector |
| [packages/json-document-react-hook-form](packages/json-document-react-hook-form) | React Hook Form draft lifecycle을 canonical submit과 history에 연결하는 Connector |
| [packages/json-document-ajv](packages/json-document-ajv) | Ajv validator 결과를 JSON Pointer 진단으로 번역하는 Connector |
| [packages/json-document-zod](packages/json-document-zod) | Zod object를 Database document로, Zod issue를 JSON Pointer 진단으로 번역하는 Connector |
| [packages/json-document-tanstack-table](packages/json-document-tanstack-table) | TanStack Table visible model을 Sheet 편집 topology로 번역하는 Connector |
| [packages/json-document-collaboration](packages/json-document-collaboration) | transport-free causal collaboration engine |
| [packages/contenteditable-collaboration](packages/contenteditable-collaboration) | collaborative string을 위한 optional native-input DOM lease |
| [site](site) | 공개 문서와 Document·Sheet·Database demo, structural Selection Lab |

v3 Kernel인 `@interactive-os/json-document`는 dependency-free Core로 남습니다.
Editing, Adapter, Connector와 collaboration package는 독립 version과 release
lifecycle을 가집니다. Selection, clipboard, history는 editing companion이
제공하는 headless lifecycle 위에서 도메인별 모델을 조합합니다. 플랫폼 계약은
공식 Adapter가 맡고, external framework와 schema의 반복 glue는 공식 Connector가
맡습니다. Host는 조합·실행 순서·제품 정책 값·copy·fixture·layout과 구체
persistence 인스턴스 주입을 소유합니다. 재사용 모델·연산·투영·UI 행동은 각
정본 모듈에 둡니다. Document Type 후보와 Official Hands의 전체 Profile은
아직 TBD이며 기존 package/API의 존재만으로 완료를 선언하지 않습니다.
일반 DOM과 Input Events 정규화가 필요한 제품은 별도 수명 주기의
`@interactive-os/editable`도 검토할 수 있습니다.

## 경계

v3 Kernel이 제공하는 최소 계약:

- immutable document value
- JSON Pointer read와 JSONPath query
- state를 바꾸지 않는 `validatePatch`
- ordered atomic JSON Patch commit
- canonical applied change notification

optional editing companion이 제공하는 것:

- atomic editing transaction과 selection publication
- clipboard와 undo/redo coordination
- range-set과 set-selection transition family
- Document·Order·Sheet·Object·Tree domain slice와 selection-restoring history

Application/Host가 소유하는 것:

- 정본 모듈의 조합과 실행 순서
- 제품의 권한·기본값·copy·fixture·layout·route
- 구체 persistence·network 인스턴스와 제품별 정책 값의 주입

문서 의미·formula·grid projection은 해당 의미 owner에, DOM focus·keyboard·
clipboard·geometry 관찰은 Adapter에, 조작 수명주기와 재사용 UI는 Affordance·
Connector·UI Primitives에 둡니다. Core 밖의 책임이 모두 Host 책임은 아닙니다.

공식 Adapter가 제공하는 것:

- KeyboardEvent chord를 semantic command로 번역
- ClipboardEvent를 copy, cut, paste에 연결
- contenteditable root를 JSON Document string pointer에 연결

공식 Connector가 제공하는 것:

- React external-store subscription과 component lifecycle
- React Hook Form draft/dirty/touched lifecycle과 atomic canonical submit의 번역
- 외부 schema/table contract와 public json-document contract의 번역
- 대상 peer dependency 격리와 compatibility 범위

## 개발

```sh
npm install
npm run dev
```

자주 쓰는 확인:

```sh
npm run docs:evaluate
npm test -w @interactive-os/json-document
npm run typecheck -w @interactive-os/json-document
npm run build -w @interactive-os/json-document
```

### 검증 운영

1인 개발과 agent의 로컬 검증을 기본으로 합니다. 개발·PR에서는 변경 범위에 맞는
테스트·타입·빌드·브라우저 검증을 수행하고, 실행 명령과 결과를 인계합니다.
실행하지 못한 검사와 실패한 검사는 통과와 구분합니다. 자동 CI가 없다는 사실을
검증 완료로 간주하지 않습니다.

| 시점 | 원격 실행 |
| --- | --- |
| PR 생성·갱신 | 자동 전체 CI 없음 |
| main push | Pages 빌드·배포와 live 확인 |
| 릴리스 tag | 깨끗한 runner에서 기존 패키지 검증 후 publish |
| 필요 시 | 전체 CI와 장시간 collaboration soak 수동 실행 |

전체 검증이 필요하면 기존 명령을 사용합니다. 제품 테스트와 검사 CLI는 유지하며,
변경 영향도 선택기 CLI는 자동 CI의 gate로 사용하지 않습니다.

```sh
npm run verify
npm run release:check
npm run external-kit:verify
npm run test:collaboration:soak
```

원격의 깨끗한 환경에서 확인하려면 GitHub Actions의 해당 workflow에서
`Run workflow`를 선택하거나 아래 명령으로 명시적으로 실행합니다.

```sh
gh workflow run ci.yml --ref main
gh workflow run collaboration-soak.yml --ref main
```
