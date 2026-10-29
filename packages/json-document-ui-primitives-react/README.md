# @interactive-os/json-document-ui-primitives-react

Official minimalist React surfaces for common Hands. Primitives own complete
keyboard, pointer, focus, cursor, and semantic markup behavior while hosts own
product data, policy, composition, and visual extension.

Start with [data meaning and read/write mapping](docs/data-presentation.md):
`dataPresentationCatalog` describes the data each expression is for;
`FieldPresentation` separates reading from an active edit. Edit permission alone
does not turn a field into an input. Domain schemas and save commands remain at
their canonical owners.

Public APIs are named by semantic role. Label, icon, chip, inline, and popup are
presentations rather than parallel component owners:

- `Command` executes an action; label-only and icon-only forms share the API.
- `Toggle` changes a persistent binary state; switch and chip forms share the API.
- `Choice` owns single-choice semantics; inline and popup forms share the API.
- `Tabs` owns tab semantics and roving keyboard focus.
- `DisclosureButton` owns expanded and controlled-panel semantics.

The package emits stable `data-ui-*` hooks. Import `design-system.css` for shared
tokens and minimum control presentation. `contentPresentation` supplies the
same typography and content hierarchy for product pages and composed documents.
See the owning [Design system API](docs/design-system.md). Products compose layout
and semantic roles; they do not recreate presentation, focus, or keyboard behavior.
Products may declare the composition-specific exposure grammar through the
public `ControlAffordance` vocabulary; primitives project it as
`data-ui-affordance` without changing their semantic control role.

`SelectableItem`, `GridCell`, and `contentInteractionAttributes` project the
canonical content interaction grammar. Import `content-interaction.css` once,
then map its CSS variables to product tokens. Selection remains a quiet content
contour; the primary member of the selection set becomes control-ready through
low elevation, while `active` and `dragging` continue the same interaction
grammar without changing layout.

Calendar widgets and projections belong to `@interactive-os/json-document-calendar`.
File metadata formatting belongs to `@interactive-os/json-document-file-intake`.
`ProductShell` is composition over the role primitives, not another control role.
Use `toolbarPresentation="floating"` when a product's controls form a distinct
functional layer above edge-to-edge content; the default `attached` presentation
remains part of document flow.

`ChatBubble` owns incoming/outgoing message presentation. Import `chat-bubble.css` once.
See the owning [Chat API](docs/chat.md) and [Usage](/demo/chat).

`ContextualControls` owns pointer, focus, editing, and optional no-hover discovery.
See the [Contextual controls API](docs/contextual-controls.md).

`RecordWorkspace`는 목록·상세·속성의 독립 스크롤과 키보드 복귀를 소유합니다.
`EditableText`는 읽기·편집 draft·저장·취소를 소유합니다.
[작업 공간 API](docs/record-workspace.md)와 [이슈 Usage](/applications/ui-builder?example=issues&new=1)를 참고하세요.

- [Record presentation](docs/record-presentation.md): 업무 항목·상태·속성·결과·사이드 패널.
- [입력 필드](docs/form-fields.md): 레이블·도움말·오류 연결과 숫자 검증의 공통 구성.

- [Product workflow catalog](docs/product-workflow.md): 헤더·탐색·필터·인물·피드백·단계·활동.

페이지·계층 탐색·현재 위치·라우터 링크: [페이지와 탐색](docs/page-navigation.md).

`CodeBlock` / `InlineCode` own the shared code surface and copy command; inject syntax with `renderLine`, document children/attributes with `children` / `preProps`, and the canonical selection binding with `codeRef`. `WaveDots` owns the shared activity dots used by `ChatActivity` and the animation package. See the package [API reference](docs/api-reference.md) and the live [Composer Usage](/demo/composer).

- [Bounded editing and agent handoff — EditingControls](docs/editing-controls.md)
