# json-document

json-document는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수 있는
implementation-neutral JSON 편집 API와 headless JSON Document입니다.

v3 root는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 합니다. React와
Zod 같은 외부 생태계는 Root에 넣지 않고 independently versioned 공식
Connector로 제공합니다.

```txt
stateless JSON Patch
  |-> local implementation -----\
  |                               > same six-member JSON Document
  `-> collaboration engine -----/    |-> optional headless editing
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
| 빠른 사용 예제 | [docs/public/quickstart.md](docs/public/quickstart.md) |
| Core 개념 이해 | [docs/public/overview.md](docs/public/overview.md) |
| Core 공개 API | [docs/public/api.md](docs/public/api.md) |
| Connector | [docs/public/connectors.md](docs/public/connectors.md) |
| Connector Live Demo | [공식 Connector catalog](https://developer-1px.github.io/json-document/connectors) |
| 문서 구조 | [docs/README.md](docs/README.md) |
| 변경 기록 | [docs/changelog.md](docs/changelog.md) |
| 개념·이름 정본 | [standards/repository-naming.md](standards/repository-naming.md) |
| v3 JSON Document profile | [standards/json-document-v3/profile.md](standards/json-document-v3/profile.md) |
| v3 공개 표면 manifest | [standards/json-document-v3/public-surface.json](standards/json-document-v3/public-surface.json) |

## 코드 지도

| 위치 | 역할 |
| --- | --- |
| [packages/json-document](packages/json-document) | 배포되는 v3 Kernel |
| [packages/json-document-editing](packages/json-document-editing) | headless transaction, structural selection, clipboard, history와 Document·Order·Sheet·Object·Tree slice |
| [packages/json-document-selection](packages/json-document-selection) | DOM-free key·range·mask family, topology/geometry port와 semantic interaction controller |
| [packages/json-document-react](packages/json-document-react) | React subscription과 Document editor lifecycle Connector |
| [packages/json-document-react-hook-form](packages/json-document-react-hook-form) | React Hook Form draft lifecycle을 canonical submit과 history에 연결하는 Connector |
| [packages/json-document-zod](packages/json-document-zod) | Zod validation issue를 JSON Pointer 진단으로 번역하는 Connector |
| [packages/json-document-tanstack-table](packages/json-document-tanstack-table) | TanStack Table visible model을 Sheet 편집 topology로 번역하는 Connector |
| [packages/json-document-web](packages/json-document-web) | Web ClipboardEvent, text-control input과 modifier state를 editing contract로 번역하는 Connector |
| [packages/json-document-collaboration](packages/json-document-collaboration) | transport-free causal collaboration engine |
| [packages/contenteditable-collaboration](packages/contenteditable-collaboration) | collaborative string을 위한 optional native-input DOM lease |
| [site](site) | 공개 문서와 Document·Sheet demo, structural Selection Lab |

v3 Kernel인 `@interactive-os/json-document`는 dependency-free Core로 남습니다.
Editing, collaboration과 Connector package는 독립 version과 release lifecycle을
가집니다. Selection, clipboard, history는 editing companion이 제공하는 headless
lifecycle 위에서 도메인별 모델을 조합합니다. External framework와 schema의 반복
glue는 공식 Connector가 맡고, persistence와 제품별 UI 의미는 host가 소유합니다.
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

편집 제품이 계속 소유하는 것:

- rendering, DOM focus, keyboard, drag/drop UI와 geometry hit-test
- DOM focus, system clipboard와 제품별 interaction policy
- formula engine과 제품별 grid projection 정책
- product command 이름, layout, route, remote protocol

공식 Connector가 제공하는 것:

- React external-store subscription과 component lifecycle
- React Hook Form draft/dirty/touched lifecycle과 atomic canonical submit의 번역
- 외부 schema/table/platform contract와 public json-document contract의 번역
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
