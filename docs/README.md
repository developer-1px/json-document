# 문서 구조

이 디렉터리는 외부 사용자에게 공개할 문서 원천만 보관한다.
릴리스 과정, 검토 루프, 과거 판단 기록은 Git issue와 version history에 남기고
현재 문서 트리에는 복제하지 않는다.

```txt
docs
|-- changelog.md              # 사용자 영향 중심 변경 기록
|-- evaluate.mjs              # 공개 문서 구조·내용 검증
`-- public
|   |-- overview.md            # JSON Document: Why / How / What
|   |-- api.md                 # JSON Document: 레퍼런스
|   |-- quickstart.md          # JSON Document: 사용 시작
|   |-- concepts.md            # JSON Document: 읽기 → 편집 → 확장 지도
|   |-- selection.md           # Editing: 구조 선택
|   |-- history.md             # Editing: 로컬 undo/redo
|   |-- clipboard.md           # Editing: 구조화된 payload
|   |-- topology.md            # Editing: 화면 줄과 선택
|   |-- intent.md              # Editing: Intent 시그니처
|   |-- intent-guide.md        # Editing: Intent 따라 하기
|   |-- collaboration.md       # JSON Document: 같은 계약의 협업 구현
|   |-- hands.md               # Hands: 장르의 손
|   |-- order.md               # Hands: 한 줄 목록
|   |-- object.md              # Hands: 키 선택 객체
|   |-- tree.md                # Hands: 보이는 나무
|   |-- adapters.md            # Adapters: 공식 플랫폼 변환
|   |-- connectors.md          # Connectors: 공식 라이브러리 생태계 연결
|   |-- react-editing.md       # Connectors: React 선택·커서 질의
|   `-- llms.txt               # machine-readable 공개 문서
```

사이트의 문서 탐색은 공개 컨셉 트리를 사용한다. 파일은 `public/`의 평평한 책임
폴더에 유지하고, 별도 중첩 폴더를 개념으로 추가하지 않는다.

```txt
JSON Document
|-- Why
|-- Quickstart
|-- Concepts
`-- API

Collaboration
|-- Replica
|-- Lifecycle
|-- Collaborative History
`-- Text
    `-- native-input DOM lease

Editing
|-- Intent guide
|-- Intent
|-- Topology
|-- Selection
|-- Clipboard
`-- History

Hands
|-- Document
|-- Order
|-- Object
|-- Sheet
|-- Tree
|-- Kanban
`-- Database

Adapter
|-- Keyboard
|-- Clipboard adapter
`-- Contenteditable

Connector
|-- React
|-- React Hook Form
|-- Ajv
|-- Zod
`-- TanStack Table

어포던스
|-- 고르기
|-- 접기
|-- 드래그
`-- 되돌리기
```

## 규범 우선순위

Repository 전체의 개념과 이름 정본은
`standards/repository-naming.md`, package 내부 책임 배치 정본은
`standards/repository-implementation-shape.md`, browser event부터 model
reconciliation까지의 DOM 편집 정본은 `standards/dom-editing-lifecycle.md`입니다.
현재 v3 portable root의 compatibility 정본은 `standards/json-document-v3/profile.md`,
`standards/json-document-v3/public-surface.json`, 그리고 profile이
지정한 conformance vector와 language binding입니다. 이름 정본은 stable v3
identifier나 동작을 바꾸지 않으며, 과거 version 문서는 v3 exact
21-symbol·six-member 계약을 확장하지 않습니다.

## 책임 기준

| 위치 | 책임 | 독자 |
| --- | --- | --- |
| `changelog.md` | 사용자 영향 중심 변경 기록 | 외부 사용자, 릴리스 확인자 |
| `public/` | 사용법과 프로젝트 이해를 위한 공식 문서 원천 | 외부 사용자, LLM, 사이트 방문자 |

## 작성 원칙

- 본문은 한글로 쓴다.
- 코드 식별자, 명령어, 파일 경로, 표준명은 원문을 유지한다.
- public 문서는 usage와 프로젝트 이해만 다룬다.
- 페이지마다 할 일 하나만 쓴다. overview는 Why/How/What 배경,
  api는 시그니처 레퍼런스, quickstart는 실습, selection은 구조
  선택, history는 로컬 undo/redo, clipboard는 구조화된 payload,
  topology는 화면 줄과 선택, intent는 편집 Intent 시그니처,
  intent-guide는 Intent 따라 하기, adapters는 플랫폼 변환,
  connectors는 연결 방법이다. react-editing은 React에서 선택과 커서를
  그리는 사용법이다.
  concepts는 읽기 → 편집 → 확장 전체 지도다. JSON Document 섹션에서 시작한다.
  collaboration은 같은 JSON Document의 다른 구현이다. hands는
  Editing 위 장르의 손이다. order·object·tree는 그 손의
  나머지 slice다.
- 배경 문서는 왜 만들었는지부터 쓴다. 컨셉 페이지는 그 아이디어를
  한 문서 위에서 만져보게 한다. 레퍼런스는 호출과 계약부터 쓴다.
- 새 개념은 독자가 그 개념을 필요로 하는 상황을 본 뒤에 이름 붙인다.
- 초안을 쓴 뒤 선언 전 사용, 선제 부정, 메타 안내와 중복을 제거하고
  앞뒤 페이지를 이어 읽는다.
- 무엇을 하는지로 정의한다. 소유하지 않는 것의 목록으로 시작하지 않는다.
- 같은 아키텍처 다이어그램과 패키지 카탈로그를 페이지마다 복제하지 않는다.
- 이름·구현 모양 정본과 profile은 `standards/`에 두고 public 가이드에서 인용하지
  않는다.
- 릴리스 history, 검토 loop, maintainer-only gate는 public 문서에 쓰지 않는다.
- 내부 구현 경로는 public 문서에 쓰지 않는다.
- 새 문서는 기존 책임 폴더 중 하나에 들어가야 한다.
- 새 책임 폴더가 필요하면 먼저 이 파일의 책임 표를 갱신한다.
- 새 public concept와 이름은
  `standards/repository-naming.md`의 admission과 문법을 먼저
  통과해야 한다.
