# Applications

Application은 navigation, workflow, runtime과 제품 정책을 소유하는 완성된 제품
표면입니다. Artifact는 Application과 같은 앱이 아니라, 그 안에서 사람이 만들고
수정하며 agent와 주고받는 콘텐츠입니다.

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

[AI Agent Application](/applications/ai-agent)은 session runtime에 Composer,
Markdown, AG-UI와 A2UI projection을 조합합니다.

```text
AI Agent Application
├─ Composer · Mention Hands
├─ Markdown · Rich Text projection
├─ AG-UI → A2UI integration
└─ App-owned · session navigation, runtime connection, shell, policy
```

두 Application은 showcase가 아니라 책임을 발견하고 canonical API가 실제 제품에서
다시 소비되는지 검증하는 production composition root입니다. 개발 순환은
[How We Build](/docs/how-we-build)에서 설명합니다.
