# UI Builder compositions

UI Builder renders the registered catalogue through the canonical React APIs. It never evaluates user HTML, CSS or JavaScript. `UIComponentComposition` is the Canvas adapter; `UIComponentSurface` supplies it with resolved content, the same runtime interaction contract used by leaf controls, and `renderChildren(ids)`.

## Composition contract

`childIds` is an ordered list of component IDs on the same page. The project validator rejects missing references, cycles and multiple owners. ProductShell also accepts `props.toolbarIds` and `props.inspectorIds`, preserving the public shell's own toolbar, canvas and inspector slots. ToolbarRegion maps `props.placement` to `start`, `center` or `end`. ContextualControls delegates hover/focus/selection disclosure to its canonical affordance API.

Popover, Dialog and Disclosure delegate focus, opening and dismissal to their owning primitives. Their state changes use `onPropsChange`, allowing local storage to retain the approved configuration. Menu maps each `items` index to `props.targetPageIds` or a configured action. A menu without a connected action must not be presented as a completed workflow.

ChatBubble preserves incoming/outgoing direction; ChatActivity represents actual transient work. FileDropRegion hands File metadata to the runtime: filenames and canonical `formatFileSize` output are local intake feedback, not a cloud upload. DragHandle, ControlHandle and ResizeHandle deliver canonical gesture events to the owning object command adapter.

## Record and calendar content

Table and detail-list consume the runtime's canonical DatabaseHand projection, supplied as `collection`. The Canvas adapter does not copy selection, filtering or record models. Select `collection.tableId` and ordered `collection.fieldIds` to keep each record's related fields together.

`detail-list`는 선택된 레코드의 속성을 읽는 영역이다. 필드명과 값을 definition list로 표시하며 선택 버튼이나 선택 배경을 만들지 않는다. 선택된 레코드가 없으면 `항목을 선택하세요.`를 표시한다. 레코드를 바꾸는 행동은 `record-list`의 `SelectableItem`이 소유한다.

Calendar-month, calendar-time and calendar-event-inspector require a valid `props.calendar` CalendarDocument. They use CalendarEditor, CalendarHand and CalendarPointerInteractions. Every document update is returned through `onPropsChange({calendar})`. Missing data produces a connection request, never fabricated product events. `props.visibleDate` controls the displayed period; time grids use `props.days` for day/week views. `calendarPresentation` and `calendar-presentation.css` own occurrence layout and tokens.

## Manual and agent configuration

`UIBuilderComponentConfigurationControls` reads `uiComponentCatalog.propertySchema` and exposes typed Field, Check and Choice controls. Composition and collection selectors call `applyUIBuilderComponentConfiguration`, the same atomic, validated public command used by agent configuration tools. Hosts key the control by component ID so selecting another component resets its draft. Structured object input is handled through its domain editor or the validated agent tool, never an arbitrary code editor.


빈 `record-list` 컬렉션은 기존 content caption으로 `표시할 항목이 없습니다.` 상태를 전달한다.
검색 결과가 비었는데 이전 선택 레코드가 남아 있는 것처럼 렌더링하지 않는다.

card의 빈 상태는 등록된 props.emptyMessage로 지정한다. 기본값은 안내 없음이며
빈 제목·빈 본문의 의미 없는 DOM을 생성하지 않는다. 업무 피드의 브리핑/결과 Usage는
각 과업의 다음 행동을 지정하고 업무 설명에는 결과 안내를 넣지 않는다.

관련 조작의 가로 배치는 기존 Toolbar/ToolbarGroup과 design-system.css의
정본 규칙을 소비한다. Toolbar는 공통 간격·중앙 정렬·줄바꿈을, ToolbarGroup은
관련 조작의 가로 인접 배치를 제공한다. 카탈로그의 related-controls recipe가
이 의미를 생성 도구에 전달하며 direction/columns 같은 미등록 props는 필요하지 않다.

UIComponentInteraction.dismissBoundary는 등록 Popover의 공개 dismissBoundary
API에 전달된다. UIBuilderRuntimeHand는 자신의 콘텐츠 surface를 경계로 제공해
빌더 모드·데이터 컨트롤로 이동해도 제품의 펼침 상태가 사라지지 않도록 한다.
전체 카탈로그 Popover Usage에서 미리보기→디자인 전환의 내용·좌표·크기와
펼친 자식의 실제 위치 선택을 확인했다.

등록 Dialog도 interaction.dismissBoundary를 공개 Primitive에 전달한다. 전체
카탈로그에서 열린 Dialog를 디자인 모드로 전환한 뒤 펼침·내용·viewport rect가
같음을 확인했다. UIScreenEditLayer는 실제 이동량이 0이면 transform을 생략해
fixed overlay의 containing block을 불필요하게 바꾸지 않는다. 열린 모달의
부모 이동·resize는 이 전환 검증과 별개다.

## Product record presentation

StatusBadge, PropertyEditor, ResultPanel 및 ProductInspector는 UI Primitives의 정본을
사용한다. record-list feed는 IssueRow를 사용하며 명시한 역할 fieldId로 제목·요약·
식별자·상태·담당자·업데이트를 연결한다. 임의 HTML 카드나 별도 선택 모델은 없다.
속성의 labels는 기존 자식 레이블에서 투영하거나 명시하며, 입력은 기존 runtime
binding을 사용한다. ResultPanel actionCount와 Inspector footerCount는 기존 childIds
끝의 행동을 본문과 분리한다. [Usage](/demo/ui-primitives#design-system-record-workflow).
