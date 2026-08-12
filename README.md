# json-document

json-document는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수 있는
implementation-neutral JSON 편집 API와 headless JSON Document입니다.

v3 root는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 하며 Zod, React,
selection, clipboard, history를 필수 계약에 넣지 않습니다.

```txt
stateless JSON Patch
  |-> local implementation -----\
  |                               > same six-member JSON Document
  `-> collaboration engine -----/    |-> optional history/text authoring
                                     `-> optional native-input DOM lease
```

로컬 전용 사용자는 Core만 설치합니다. 협업으로 전환해도 편집기가 받는
`JSONDocument` 포트는 바뀌지 않고, causal merge와 native-input DOM lease만
독립 package로 추가합니다.

공식 사이트: https://developer-1px.github.io/json-document/

## 문서 지도

| 목적 | 위치 |
| --- | --- |
| 프로젝트 이해 | [docs/public/overview.md](docs/public/overview.md) |
| 빠른 사용 예제 | [docs/public/quickstart.md](docs/public/quickstart.md) |
| 공개 API | [docs/public/api.md](docs/public/api.md) |
| 문서 구조 | [docs/README.md](docs/README.md) |
| 변경 기록 | [docs/changelog.md](docs/changelog.md) |
| 개념·이름 정본 | [standards/repository-naming.md](standards/repository-naming.md) |
| v3 JSON Document profile | [standards/json-document-v3/profile.md](standards/json-document-v3/profile.md) |
| v3 공개 표면 manifest | [standards/json-document-v3/public-surface.json](standards/json-document-v3/public-surface.json) |

## 코드 지도

| 위치 | 역할 |
| --- | --- |
| [packages/json-document](packages/json-document) | 배포되는 v3 Kernel |
| [packages/json-document-collaboration](packages/json-document-collaboration) | transport-free causal collaboration engine |
| [packages/contenteditable-collaboration](packages/contenteditable-collaboration) | collaborative string을 위한 optional native-input DOM lease |
| [site](site) | v3 Core 공개 문서 사이트 |

v3 Kernel release는 `@interactive-os/json-document` 하나이며 dependency-free
Core로 남습니다. 두 collaboration package는 독립 version과 release lifecycle을
가진 optional companion입니다. Selection, clipboard, persistence와 제품별 DOM
lifecycle은 host adapter가 여섯-member `JSONDocument` 위에서 조합합니다.
일반 DOM과 Input Events 정규화가 필요한 제품은 별도 수명 주기의
`@interactive-os/editable`도 검토할 수 있습니다.

## 경계

v3 Kernel이 제공하는 최소 계약:

- immutable document value
- JSON Pointer read와 JSONPath query
- state를 바꾸지 않는 `validatePatch`
- ordered atomic JSON Patch commit
- canonical applied change notification

편집 툴이 계속 소유하는 것:

- rendering, DOM focus, keyboard, drag/drop UI
- selection, clipboard, history, framework lifecycle
- grid selection, TSV clipboard, formula engine
- product command 이름, layout, route, remote protocol

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
