# json-document

json-document는 문서, 표, 슬라이드, 캔버스, 노트 편집기가 함께 쓸 수 있는
provider-neutral JSON 편집 protocol과 headless document projection입니다.

v2 root는 JSON, JSON Pointer, JSONPath, JSON Patch만 전제로 하며 Zod, React,
selection, clipboard, history를 필수 계약에 넣지 않습니다.

```txt
Pure Protocol -> Document Projection -> host adapter
```

공식 사이트: https://developer-1px.github.io/json-document/

## 문서 지도

| 목적 | 위치 |
| --- | --- |
| 프로젝트 이해 | [docs/public/overview.md](docs/public/overview.md) |
| 빠른 사용 예제 | [docs/public/quickstart.md](docs/public/quickstart.md) |
| 공개 API | [docs/public/api.md](docs/public/api.md) |
| 문서 구조 | [docs/README.md](docs/README.md) |
| 변경 기록 | [docs/changelog.md](docs/changelog.md) |
| v2 Projection 표준 | [docs/standard/v2-projection-profile.md](docs/standard/v2-projection-profile.md) |
| v2 공개 표면 manifest | [docs/standard/v2-public-surface.json](docs/standard/v2-public-surface.json) |
| 1.x 기록 | [archive/v1/docs](archive/v1/docs) |

## 코드 지도

| 위치 | 역할 |
| --- | --- |
| [packages/json-document](packages/json-document) | 배포되는 v2 Kernel |
| [apps/site](apps/site) | v2 Core 공개 문서 사이트 |
| [archive/v1](archive/v1) | 배포·workspace·검증에서 분리된 1.x 기록 |

이 저장소가 배포하는 package는 `@interactive-os/json-document` 하나입니다.
Selection, history, clipboard, persistence와 DOM lifecycle은 host adapter가
여섯-member `JSONDocument` 위에서 조합합니다. DOM과 Input Events 정규화가
필요한 제품은 별도 수명 주기를 가진 companion `@interactive-os/editable`을
검토할 수 있으며, companion은 이 저장소의 배포물이나 v2 Core API가 아닙니다.

## 경계

v2 Kernel이 제공하는 최소 계약:

- immutable JSON snapshot
- JSON Pointer read와 JSONPath query
- state를 바꾸지 않는 `canPatch`
- ordered atomic JSON Patch commit
- canonical applied change publication

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
