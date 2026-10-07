# Applications

Application은 navigation, workflow, runtime과 제품 정책을 소유하는 완성된 제품
표면입니다. Artifact는 Application과 같은 앱이 아니라, 그 안에서 사람이 만들고
수정하며 agent와 주고받는 콘텐츠입니다.

## Bear

[Bear Application](/applications/bear)은 가운데 Markdown
문서를 보여줍니다. 개발 서버에서는 우하단 채팅으로 본문 추가와 부분 수정을 요청할 수 있습니다. `MarkdownEditingSurface`, `createTextEditor`,
`createJSONDocument`의 public API를 조합하며 입력·선택·문법 표시·Undo는 각
canonical package가 소유합니다. Application은 문서 초기값, 본문과 채팅 배치, 로컬 에이전트 연결을 소유합니다. 문서 도구는 Editing의 `createTextEditorTools`를 사용하며 편집 결과를 Undo로 되돌릴 수 있습니다.
`createWebStoredDocument`로 이 브라우저에 자동 저장하며 새로고침해도 본문이 복원됩니다.
저장 실패와 복원 실패는 화면에 표시합니다. Markdown 저장 링크로 다운로드할 수 있습니다.
개발 서버에서는 파일 이름을 정해 `.local/bear/`에 실제 `.md`를 생성·저장하고 목록에서
불러올 수 있습니다. `BEAR_DOCUMENTS_DIR`로 보관함을 지정할 수 있습니다. 파일 저장은
브라우저 자동 저장과 별개이며, 외부에서 변경된 파일을 바로 덮어쓰지 않습니다.
브라우저 저장소를 지우거나 다른 브라우저/주소를 사용하면 저장된 문서가 공유되지 않습니다.
Undo 이력과 채팅 이력은 현재 페이지 안에서만 유지됩니다.
[작성 예제](/applications/bear?document=ai-native-writing)는 로컬 Codex가 실제 편집 도구로
작성한 「AI native로 글을 쓰는 법」입니다. 내 글과 별도 저장되며 자유롭게 수정할 수 있습니다.

## Calendar

[Calendar Application](/applications/calendar)은 Calendar Document Type, Editing,
Calendar Hand와 UI primitives를 day·week·month·year 제품 경험으로 조합합니다.

```text
Calendar Application
├─ Calendar Document Type · event, recurrence, interval
├─ Calendar Hand · selection, create, move, resize, history
├─ Calendar UI · grids, inspector, date controls
└─ App-owned · navigation, URL state, copy, fixture, layout
```

Calendar라는 이름 아래의 모든 코드를 App이 소유하지 않습니다. 재사용 책임은
각 canonical package에 남고 Application은 제품 조합과 정책만 소유합니다.

## AI Agent

[AI Agent Application](/applications/ai-agent)은 session runtime에 Markdown, AG-UI와 A2UI projection을 조합합니다.
현재 입력은 Host의 textarea와 UI Primitives이며 Composer Hand 연결을 완료한 상태가 아닙니다.

```text
AI Agent Application
├─ 입력 · textarea와 UI Primitives
├─ Markdown React · 응답 표시
├─ AG-UI → A2UI integration
└─ App-owned · session navigation, runtime connection, shell, policy
```

Application은 showcase가 아니라 책임을 발견하고 canonical API가 실제 제품에서
다시 소비되는지 검증하는 production composition root입니다. 개발 순환은
[How We Build](/docs/how-we-build)에서 설명합니다.
