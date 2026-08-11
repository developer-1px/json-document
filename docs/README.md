# 문서 구조

이 디렉터리는 외부 사용자에게 공개할 문서 원천과 최소 표준 문서만 보관한다.
릴리스 과정, 검토 루프, 과거 판단 기록은 Git issue와 version history에 남기고
현재 문서 트리에는 복제하지 않는다.

```txt
docs
|-- changelog.md              # 사용자 영향 중심 변경 기록
|-- public
|   |-- overview.md            # 프로젝트 이해
|   |-- quickstart.md          # 사용 시작
|   `-- api.md                 # 공개 API
`-- standard
    |-- concept-and-naming-standard.md # 전체 repository 개념·이름 정본
    |-- v3-json-document-profile.md # 현재 v3 root compatibility profile
    `-- v3-public-surface.json   # v3 공개 binding
```

## 규범 우선순위

Repository 전체의 개념과 이름 정본은
`concept-and-naming-standard.md`입니다. 현재 v3 portable root의 compatibility
정본은 `v3-json-document-profile.md`, `v3-public-surface.json`, 그리고 profile이
지정한 conformance vector와 language binding입니다. 이름 정본은 stable v3
identifier나 동작을 바꾸지 않으며, 과거 version 문서는 v3 exact
21-symbol·six-member 계약을 확장하지 않습니다.

## 책임 기준

| 위치 | 책임 | 독자 |
| --- | --- | --- |
| `changelog.md` | 사용자 영향 중심 변경 기록 | 외부 사용자, 릴리스 확인자 |
| `public/` | 사용법과 프로젝트 이해를 위한 공식 문서 원천 | 외부 사용자, LLM, 사이트 방문자 |
| `standard/` | Repository 개념·이름 정본과 v3 root compatibility 정본 | 표준화 검토자, 대체 구현 작성자 |

## 작성 원칙

- 본문은 한글로 쓴다.
- 코드 식별자, 명령어, 파일 경로, 표준명은 원문을 유지한다.
- public 문서는 usage와 프로젝트 이해만 다룬다.
- 릴리스 history, 검토 loop, maintainer-only gate는 public 문서에 쓰지 않는다.
- 내부 구현 경로는 public 문서에 쓰지 않는다.
- 새 문서는 기존 책임 폴더 중 하나에 들어가야 한다.
- 새 책임 폴더가 필요하면 먼저 이 파일의 책임 표를 갱신한다.
- 새 public concept와 이름은
  `standard/concept-and-naming-standard.md`의 admission과 문법을 먼저
  통과해야 한다.
