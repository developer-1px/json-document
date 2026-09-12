# 문서 구조

이 디렉터리는 외부 사용자에게 공개할 문서 원천과 생성된 owner API reference를
보관한다. 릴리스 과정·검토 루프·과거 판단은 Git issue와 version history에 남긴다.

```text
docs
├─ public/                    # 한국어 개념·계약·사용법, llms.txt
├─ api-reference/             # owner package별 생성 reference와 등록표
├─ changelog.md               # 사용자 영향 중심 변경 기록
├─ evaluate.mjs               # 문서·등록·증거 연결 검사
└─ public-contract-checks.mjs  # 원천·Pages·live의 공통 공개 계약 검사
```

## 사이트의 읽기 구조

탐색 섹션은 `site/src/app/site-layers.ts`, 페이지 제목·URL·문서 원천의 연결은
`site/site-routes.json`의 `documentSource`가 소유한다. `doc-pages.ts`는 그 원천을
읽고, Markdown 링크도 같은 등록표에서 사이트 URL을 찾는다. 별도 파일명→URL
카탈로그를 유지하지 않는다. 아래는 개념 수준의 지도이며 leaf 페이지 목록을
복제한 탐색 정본이 아니다.

```text
Introduction
├─ Why
├─ Architecture
└─ How We Build
Foundation
├─ Overview
├─ JSON Document Protocol
├─ Document Types · TBD
│  └─ 후보별 관찰된 schema·목표 owner·완료 증거
├─ Editing Protocol
│  └─ Intent · Topology · Selection · Clipboard · History
└─ Collaboration
   └─ Replica · Lifecycle · History · Text
Building Blocks
├─ Overview
├─ Adapter
├─ Connector
├─ Affordance
└─ UI Primitives
Hands
└─ 현재 Usage와 Official Hands Profile · TBD
Artifact
└─ Content Prototype · TBD
Applications
└─ 제품 조합과 제품에서 발견한 책임
```

읽기 순서는 필수 package dependency chain이 아니다. Collaboration은 같은
JSONDocument의 대체 구현이고 Adapter와 Connector는 독립적으로 선택한다.
API reference는 각 owner package의 위치에 유지한다. 탐색 분류는 owner의
책임 종류나 새 runtime 계층이 아니다. Core 안내를 전체 package catalog처럼
별도의 Reference 섹션에 중복 노출하지 않는다.

## 규범 우선순위

Repository 전체의 개념과 이름 정본은
`standards/repository-naming.md`, package 내부 책임 배치 정본은
`standards/repository-implementation-shape.md`, browser event부터 model
reconciliation까지의 DOM 편집 정본은 `standards/dom-editing-lifecycle.md`다.
현재 v3 portable root의 compatibility 정본은 `standards/json-document-v3/profile.md`,
`standards/json-document-v3/public-surface.json`, 지정된 conformance vector와
language binding이다. 이름 정본은 Stable v3 identifier나 동작을 바꾸지 않는다.

EditingSession의 확정된 공통 의미는 `standards/editing-session.md`가 소유한다.
ES 규칙과 현재 TypeScript binding·local History 정책은 구별하며 각 규칙을
owner의 행동 테스트에 연결한다. 이 확정은 전체 Hands의 Stable 선언이 아니다.

편집 문법의 안정화 설계는 `standards/editing-grammar.md`의 Design Draft다.
공통 규칙·Profile 선택·입력 owner·적합성 증거를 연결하지만 기존 Stable
계약의 권위를 변경하지 않는다. API reference와 Usage를 대체하지 않는다.

## 현재 계약과 TBD

- Core v3 Stable, EditingSession 공통 의미, 개별 package API의 범위를 구분한다.
- Document Type은 책임 이름과 경계가 정해졌더라도 후보별 owner 수렴이 남으면
  `TBD`를 유지한다. schema나 API가 존재한다는 이유만으로 완료 처리하지 않는다.
- Official Hands는 지원 입력·실패·선택 복원·History와 조합 적합성의 미확정
  경계 및 완료 증거를 표시한다.
- Artifact visual prototype은 시각 가설의 증거다. 실제 문서·Hands 연결이나
  파일 호환성이 없는 경우 제목·설명에서 `TBD`로 드러낸다.
- TBD는 막연한 미래 목록이 아니라 현재 증거, 목표 책임, 남은 완료 조건을 담는다.

## 책임과 검증

| 원천 | 책임 |
| --- | --- |
| `public/` | 외부 사용자와 사이트 방문자의 개념·계약·Usage |
| `public/llms.txt` | 같은 목표와 현재 계약을 요약한 기계 판독 문서 |
| `api-reference/packages.mjs` | owner package의 source entrypoint와 사이트 탐색 분류 |
| `api-reference/*.md` | package root와 공개 subpath에서 생성한 API reference |
| `changelog.md` | 사용자 영향 중심 변경 기록 |

`package.json#exports`의 TypeScript 진입점과 API 등록을 비교해 subpath 누락을
검출한다. `docs:evaluate`는 원천 등록과 상대 파일 링크, ES 규칙의 행동 증거
연결을 확인한다. API 생성 검사는 등록된 파일의 self-consistency만으로 끝내지 않는다.

문서의 목차는 실제 렌더러가 만든 heading과 ID에서 읽는다. site 테스트는 실제
본문 링크와 목차 대상의 존재, 목표 탐색·제목·TBD 경로를 검증한다.
문자열이나 링크의 존재는 의미 적합성을 대신하지 않으며 package/browser 검증을
함께 봐야 한다.

문서 원천·Pages·live의 공통 계약은 `public-contract-checks.mjs`가 소유한다.
Root symbol 수는 Core `public-contract.json`에서 읽는다.

## 작성 원칙

- 본문은 한글로 쓰고 코드 식별자·명령어·경로·표준명은 원문을 유지한다.
- 페이지마다 책임 하나를 설명하고 인접 owner의 설명과 시그니처는 연결한다.
- 새로운 개념은 책임과 필요성이 드러난 뒤 이름 붙인다.
- 같은 아키텍처 다이어그램과 package 목록을 여러 문서에 복제하지 않는다.
- 표준·명명·구현 배치 정본은 `standards/`에 두며 public 가이드는 사용자 계약과
  사용법을 설명한다. 내부 경로·검토 루프·maintainer-only gate를 본문에 노출하지 않는다.
- 재사용 모델·연산·입력 해석·projection·UI를 Host 책임으로 설명하지 않는다.
  Host는 조합·실행 순서·제품 정책 값·copy·fixture·layout·구체 인스턴스를 소유한다.
- 새 public 개념과 이름은 정본 naming admission을 먼저 통과해야 한다.
