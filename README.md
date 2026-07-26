# json-document

json-document는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수 있는
provider-neutral JSON 편집 protocol과 headless document projection입니다.

v2 root는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 하며 Zod, React,
selection, clipboard, history를 필수 계약에 넣지 않습니다.

```txt
Pure Protocol
  |-> Document Projection -> host adapter
  `-> Candidate Editing Session -> React / rich host adapter
```

공식 사이트: https://developer-1px.github.io/json-document/

## 문서 지도

| 목적 | 위치 |
| --- | --- |
| 프로젝트 이해 | [docs/public/overview.md](docs/public/overview.md) |
| 빠른 사용 예제 | [docs/public/quickstart.md](docs/public/quickstart.md) |
| 공개 API | [docs/public/api.md](docs/public/api.md) |
| 공식 extension 사용법 | [docs/public/extensions.md](docs/public/extensions.md) |
| 제품별 feature 지도 | [docs/public/recipes.md](docs/public/recipes.md) |
| 문서 구조 | [docs/README.md](docs/README.md) |
| 변경 기록 | [docs/changelog.md](docs/changelog.md) |
| v2 Projection 표준 | [docs/standard/v2-projection-profile.md](docs/standard/v2-projection-profile.md) |
| v2 공개 표면 manifest | [docs/standard/v2-public-surface.json](docs/standard/v2-public-surface.json) |
| Candidate Session의 1.x 기준선 | [docs/standard/conformance-profile.md](docs/standard/conformance-profile.md) |

## 코드 지도

| 위치 | 역할 |
| --- | --- |
| [packages/json-document](packages/json-document) | v2 Kernel과 optional Candidate Session |
| [packages/collection](packages/collection) | ordered JSON array item 이동/복제/삭제 |
| [packages/clipboard-web](packages/clipboard-web) | browser clipboard bridge |
| [packages/contenteditable-web](packages/contenteditable-web) | `@interactive-os/json-document-contenteditable-web` DOM contenteditable text-surface adapter |
| [packages/contenteditable-react](packages/contenteditable-react) | `@interactive-os/json-document-contenteditable-react` React wrapper for contenteditable timing |
| [packages/schema-form](packages/schema-form) | schema-backed field descriptor |
| [packages/form-draft](packages/form-draft) | valid JSON commit 전 temporary invalid form input |
| [packages/protected-ranges](packages/protected-ranges) | protected JSON Pointer range edit guard |
| [packages/snippets](packages/snippets) | reusable JSON payload snippet insertion |
| [packages/dirty-state](packages/dirty-state) | clean baseline 대비 dirty state |
| [packages/bulk-edit](packages/bulk-edit) | JSONPath replace-all/delete-all |
| [packages/patch-log](packages/patch-log) | applied patch stream 기록/replay |
| [packages/persist-web](packages/persist-web) | browser storage-like persistence |
| [packages/id-resolver](packages/id-resolver) | stable id를 현재 JSON Pointer로 해석 |
| [packages/patch-preview](packages/patch-preview) | JSON Patch 적용 전 schema-safe dry-run |
| [packages/search-replace](packages/search-replace) | JSON string field 검색/치환 |
| [packages/grouping](packages/grouping) | sibling JSON item structural group/ungroup |
| [packages/proposed-changes](packages/proposed-changes) | JSON Patch 제안 accept/reject review model |
| [packages/comments](packages/comments) | JSON Pointer anchor 기반 review comment |
| [packages/outline](packages/outline) | document outline projection |
| [apps/site](apps/site) | public docs site와 workbench |
| [apps/outliner](apps/outliner) | outliner demo app |
| [apps/mobile-cms](apps/mobile-cms) | mobile CMS demo app |
| [labs/extensions](labs/extensions) | 아직 공식 package가 아닌 extension 실험 |

## 경계

v2 Kernel이 제공하는 최소 계약:

- immutable JSON snapshot
- JSON Pointer read와 JSONPath query
- state를 바꾸지 않는 `canPatch`
- ordered atomic JSON Patch commit
- canonical applied change publication

`@interactive-os/json-document/session`은 Zod 기반 schema 검증, selection,
clipboard, history와 고수준 편집 동사를 제공하는 optional Candidate 표면입니다.

편집 툴이 계속 소유하는 것:

- rendering, DOM focus, keyboard, drag/drop UI
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
