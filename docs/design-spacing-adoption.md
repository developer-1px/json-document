# 간격 전수 적용 기록

2026-10-14, `feat/ui-builder-design-system` 공유 작업 트리.

## 범위와 기준

공개 패키지·사이트·Host·Demo와 외부 소비자 fixture의 CSS, TS/TSX inline style, Tailwind recipe를 대상으로 한다. 배포 산출물(dist), 의존성(node_modules), 테스트 fixture는 실행 UI 정본이 아니므로 수정하지 않는다. 0/auto와 초기화는 관계의 단계가 아니며 유지한다. 문서 모델의 자유 좌표·containerLayout.gap, TextSelectionGap, floating inset 계산 인수는 사용자 데이터/알고리즘이므로 CSS 간격 토큰으로 바꾸지 않는다.

| 관계 | 토큰 | 값 |
| --- | --- | --- |
| 관련 값·라벨·조작 | `--space-related` | 8px |
| 콘텐츠 묶음·표면 inset | `--space-group` | 16px |
| 독립 영역·페이지 | `--space-region` | 32px |

컨트롤 hitbox/track, 글리프 내부의 비례, 도형/시간/계층 좌표, floating 조작 예약 공간은 별도 간격 종류가 아니다. 아래에 유지 위치와 근거를 기록한다. 새 간격 토큰이나 숫자 단계를 추가하지 않았다.

## 정본 소비 위치

아래는 현재 세 토큰을 직접 소비하는 파일과 선언/utility 수다. 전체 파일 수는 완료의 판단 기준이 아니다.

| 파일 | 정본 소비 수 |
| --- | ---: |
| `fixtures/external-kit/src/styles.css` | 2 |
| `packages/json-document-animation-react/styles.css` | 3 |
| `packages/json-document-calendar/src/calendar-presentation.css` | 8 |
| `packages/json-document-calendar/src/date-controls.css` | 7 |
| `packages/json-document-canvas/src/canvas-hand.css` | 4 |
| `packages/json-document-canvas/src/canvas-style-controls.tsx` | 1 |
| `packages/json-document-canvas/src/ui-builder.css` | 13 |
| `packages/json-document-composer-react/src/chat-composer.css` | 3 |
| `packages/json-document-database/styles.css` | 17 |
| `packages/json-document-markdown-web/src/markdown-editor.css` | 3 |
| `packages/json-document-rich-text-suggestion-react/src/mention.tsx` | 3 |
| `packages/json-document-sheet/src/sheet-hand.css` | 2 |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css` | 40 |
| `packages/json-document-ui-primitives-react/src/chat-bubble.css` | 4 |
| `packages/json-document-ui-primitives-react/src/design-system.css` | 49 |
| `packages/json-document-ui-primitives-react/src/design-tokens.css` | 2 |
| `site/src/app/EditorAgentChat.tsx` | 5 |
| `site/src/app/index.css` | 9 |
| `site/src/app/interaction-recording/InteractionRecordingControls.tsx` | 4 |
| `site/src/app/live-demo-registry.tsx` | 3 |
| `site/src/app/routes/__root.tsx` | 7 |
| `site/src/applications/bear/BearApplication.tsx` | 7 |
| `site/src/applications/bear/BearFiles.tsx` | 6 |
| `site/src/applications/sheet/SheetApplication.tsx` | 3 |
| `site/src/applications/sheet/sheet-application.css` | 6 |
| `site/src/applications/ui-builder/UIBuilderApplication.tsx` | 1 |
| `site/src/applications/ui-builder/ui-builder-application.css` | 3 |
| `site/src/routes/adapters/clipboard/ClipboardAdapterLab.tsx` | 7 |
| `site/src/routes/adapters/contenteditable/ContentEditableAdapterLab.tsx` | 8 |
| `site/src/routes/adapters/keyboard/KeyboardAdapterLab.tsx` | 6 |
| `site/src/routes/adapters/virtual-selection/VirtualSelectionAdapterLab.tsx` | 6 |
| `site/src/routes/affordances/handles/InteractionHandleLab.tsx` | 3 |
| `site/src/routes/affordances/handles/interaction-handle-styles.ts` | 2 |
| `site/src/routes/animation-demo/AnimationDemoRoute.tsx` | 3 |
| `site/src/routes/animation-demo/animation-demo-styles.ts` | 9 |
| `site/src/routes/annotation-demo/AnnotationDemoRoute.tsx` | 7 |
| `site/src/routes/annotation-demo/annotation-demo-styles.ts` | 7 |
| `site/src/routes/artifact-viewer/ArtifactViewerRoute.tsx` | 2 |
| `site/src/routes/artifact-viewer/artifact-viewer-styles.ts` | 26 |
| `site/src/routes/calendar-demo/CalendarDemoRoute.tsx` | 7 |
| `site/src/routes/calendar-demo/calendar-demo-navigator.tsx` | 1 |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts` | 40 |
| `site/src/routes/chat-demo/ChatDemoRoute.tsx` | 3 |
| `site/src/routes/collaboration-demo/CollaborationDemoRoute.tsx` | 3 |
| `site/src/routes/connectors/ajv/AjvConnectorLab.tsx` | 8 |
| `site/src/routes/connectors/react-hook-form/ReactHookFormConnectorLab.tsx` | 15 |
| `site/src/routes/connectors/react/ReactConnectorLab.tsx` | 25 |
| `site/src/routes/connectors/tanstack-table/TanStackTableConnectorLab.tsx` | 9 |
| `site/src/routes/connectors/zod/ZodAdminLab.tsx` | 4 |
| `site/src/routes/connectors/zod/ZodConnectorLab.tsx` | 9 |
| `site/src/routes/date-controls-demo/DateControlsDemoRoute.tsx` | 1 |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts` | 13 |
| `site/src/routes/docs/DocumentationPage.tsx` | 6 |
| `site/src/routes/docs/MarkdownViewer.tsx` | 1 |
| `site/src/routes/document-demo/DocumentDemoRoute.tsx` | 4 |
| `site/src/routes/editing-demos/ClipboardDemoRoute.tsx` | 16 |
| `site/src/routes/editing-demos/HistoryDemoRoute.tsx` | 16 |
| `site/src/routes/editing-demos/SelectionDemoRoute.tsx` | 14 |
| `site/src/routes/editing-demos/TopologyDemoRoute.tsx` | 15 |
| `site/src/routes/home/home-styles.ts` | 22 |
| `site/src/routes/kanban-demo/KanbanDemoRoute.tsx` | 4 |
| `site/src/routes/llm-agent-artifact/llm-agent-artifact.css` | 18 |
| `site/src/routes/markdown-caret/MarkdownCaretRoute.tsx` | 4 |
| `site/src/routes/markdown-demo/MarkdownDemoRoute.tsx` | 1 |
| `site/src/routes/object-demo/ObjectDemoRoute.tsx` | 2 |
| `site/src/routes/order-demo/OrderDemoRoute.tsx` | 3 |
| `site/src/routes/rich-text-demo/RichTextDemoRoute.tsx` | 18 |
| `site/src/routes/rich-text-demo/rich-text-styles.ts` | 1 |
| `site/src/routes/sheet-demo/SheetViewsDemoRoute.tsx` | 1 |
| `site/src/routes/showcase/ShowcaseRoute.tsx` | 19 |
| `site/src/routes/tree-demo/TreeDemoRoute.tsx` | 3 |
| `site/src/routes/ui-primitives-catalog/DataPresentationPair.tsx` | 2 |
| `site/src/routes/ui-primitives-catalog/DataPresentationSpecimen.tsx` | 6 |
| `site/src/routes/ui-primitives-catalog/ProductWorkflowSpecimen.tsx` | 1 |
| `site/src/routes/ui-primitives-catalog/UiPrimitivesCatalogRoute.tsx` | 1 |
| `site/src/routes/ui-primitives-catalog/ui-primitives-catalog-styles.ts` | 63 |
| `site/src/routes/viewport-position-demo/ViewportPositionDemoRoute.tsx` | 7 |
| `site/src/routes/viewport-position-demo/viewport-position-demo-styles.ts` | 14 |
| `site/src/routes/widgets/BoardWidgetRoute.tsx` | 3 |
| `site/src/routes/widgets/DocumentWidgetRoute.tsx` | 1 |
| `site/src/routes/widgets/GridWidgetRoute.tsx` | 4 |
| `site/src/routes/widgets/ListboxWidgetRoute.tsx` | 1 |
| `site/src/routes/widgets/ToolbarWidgetRoute.tsx` | 1 |
| `site/src/routes/widgets/TreeWidgetRoute.tsx` | 1 |
| `site/src/routes/widgets/WidgetDemoFrame.tsx` | 10 |
| `site/src/shared/composer/composer.css` | 23 |
| `site/src/shared/demo-workbench/DemoWorkbench.tsx` | 5 |
| `site/src/shared/ui/catalog-demo-page.tsx` | 2 |
| `site/src/shared/ui/inspector.tsx` | 6 |
| `site/src/shared/ui/styles.ts` | 37 |

## 변경한 값

동일 파일의 반복된 old → new 조합을 묶었다. 공개 owner의 표면 inset, 날짜 grid 폭 계산, standalone CSS import, 빌더 title-context 토큰 차감은 소유 모듈에서 조정했다.

| 파일 | 기존 → 정본 |
| --- | --- |
| `packages/json-document-calendar/src/calendar-presentation.css` | `gap: .25rem` → `gap: var(--space-related)`; `gap: .5rem` → `gap: var(--space-related)`; `margin-top: .25rem` → `margin-top: var(--space-related)`; `margin-top: .75rem` → `margin-top: var(--space-group)`; `padding: .5rem` → `padding: var(--space-related)`; `padding: 1rem` → `padding: var(--space-group)` |
| `packages/json-document-canvas/src/canvas-hand.css` | `gap: 0.125rem` → `gap: var(--space-related)`; `padding: 1rem` → `padding: var(--space-group)` |
| `packages/json-document-canvas/src/canvas-style-controls.tsx` | `gap: 4` → `gap: "var(--space-related)"` |
| `packages/json-document-canvas/src/ui-builder.css` | `gap: 0.25rem` → `gap: var(--space-related)`; `gap: 0.5rem` → `gap: var(--space-related)`; `gap: 0.75rem` → `gap: var(--space-related)`; `margin-bottom: 0.75rem` → `margin-bottom: var(--space-related)` |
| `packages/json-document-composer-react/src/chat-composer.css` | `gap: 0.5rem` → `gap: var(--space-related)` |
| `packages/json-document-database/styles.css` | `gap: 12px` → `gap: var(--space-related)`; `gap: 4px` → `gap: var(--space-related)`; `gap: 8px` → `gap: var(--space-related)`; `margin-left: 6px` → `margin-left: var(--space-related)`; `margin: 12px auto; }
.jd-database__record` → `margin: var(--space-group) auto; }
.jd-database__record`; `margin: 2px 0 0` → `margin: 0`; `padding: 12px;` → `padding: var(--space-group);`; `padding: 32px` → `padding: var(--space-region)` |
| `packages/json-document-markdown-web/src/markdown-editor.css` | `gap: .25rem` → `gap: var(--space-related)`; `padding: .75em 1em` → `padding: var(--space-group)` |
| `packages/json-document-rich-text-suggestion-react/src/mention.tsx` | `gap: 10` → `gap: "var(--space-related)"`; `marginTop: 2` → `marginTop: "var(--space-related)"`; `padding: "8px 10px 6px"` → `padding: "var(--space-related)"` |
| `packages/json-document-sheet/src/sheet-hand.css` | `gap: 2px` → `gap: var(--space-related)`; `margin: 0 0 8px` → `margin: 0 0 var(--space-related)` |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css` | `gap: 0.25rem` → `gap: var(--space-related)`; `gap: 1.25rem` → `gap: var(--space-group)`; `margin-bottom: 1.25rem` → `margin-bottom: var(--space-group)`; `margin-top: -1rem` → `margin-top: calc(var(--space-related) - var(--space-group))`; `margin-top: 1.5rem` → `margin-top: var(--space-group)`; `margin: 0 0 1rem` → `margin: 0 0 var(--space-group)`; `margin: 0 1rem 1rem 4.5rem` → `margin: 0 var(--space-group) var(--space-group) 4.5rem`; `margin: 4rem 0` → `margin: var(--space-region) 0`; `padding-block: 0.5rem` → `padding-block: var(--space-related)`; `padding-inline: 1rem` → `padding-inline: var(--space-group)`; `padding-top: 1rem` → `padding-top: var(--space-group)`; `padding: 1.5rem 1rem` → `padding: var(--space-group)`; `padding: 1rem` → `padding: var(--space-group)`; `padding: 1rem 1.5rem 14rem` → `padding: var(--space-group) var(--space-group) 14rem`; `padding: 2rem` → `padding: var(--space-region)` |
| `packages/json-document-ui-primitives-react/src/chat-bubble.css` | `gap: 0.25rem` → `gap: var(--space-related)`; `gap: 0.5rem` → `gap: var(--space-related)` |
| `packages/json-document-ui-primitives-react/src/design-system.css` | `margin-bottom: .5rem` → `margin-bottom: var(--space-related)` |
| `site/src/app/EditorAgentChat.tsx` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `p-3` → `p-related` |
| `site/src/app/index.css` | `gap-3` → `gap-related`; `mt-1` → `mt-related`; `p-3` → `p-related`; `px-3` → `px-related`; `py-2` → `py-related`; `py-3` → `py-related`; `py-6` → `py-group` |
| `site/src/app/interaction-recording/InteractionRecordingControls.tsx` | `gap-2` → `gap-related`; `px-2` → `px-related` |
| `site/src/app/live-demo-registry.tsx` | `my-4` → `my-group`; `p-4` → `p-group` |
| `site/src/app/routes/__root.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `mr-1` → `mr-related`; `mt-2` → `mt-related`; `px-4` → `px-group`; `py-3` → `py-related` |
| `site/src/applications/bear/BearApplication.tsx` | `gap-3` → `gap-related`; `p-4` → `p-group`; `pt-28` → `pt-region`; `pt-32` → `pt-region`; `px-12` → `px-region`; `px-2` → `px-related`; `px-6` → `px-group` |
| `site/src/applications/bear/BearFiles.tsx` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `mt-2` → `mt-related`; `p-3` → `p-related`; `p-4` → `p-group`; `px-2` → `px-related` |
| `site/src/applications/sheet/SheetApplication.tsx` | `p-4` → `p-group`; `px-2` → `px-related` |
| `site/src/applications/sheet/sheet-application.css` | `gap:16px` → `gap:var(--space-group)`; `padding-inline:8px` → `padding-inline:var(--space-related)`; `padding:8px 16px` → `padding:var(--space-related) var(--space-group)`; `padding:8px 16px 64px` → `padding:var(--space-related) var(--space-group) 64px` |
| `site/src/applications/ui-builder/UIBuilderApplication.tsx` | `p-8` → `p-region` |
| `site/src/routes/adapters/clipboard/ClipboardAdapterLab.tsx` | `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-3` → `mb-related`; `p-3` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/adapters/contenteditable/ContentEditableAdapterLab.tsx` | `gap-1` → `gap-related`; `gap-1.5` → `gap-related`; `gap-2` → `gap-related`; `gap-3` → `gap-related`; `gap-4` → `gap-group`; `p-2` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/adapters/keyboard/KeyboardAdapterLab.tsx` | `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-3` → `mb-related`; `p-3` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/adapters/virtual-selection/VirtualSelectionAdapterLab.tsx` | `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mt-2` → `mt-related`; `p-3` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/affordances/handles/InteractionHandleLab.tsx` | `ml-7` → `ml-region`; `mt-5` → `mt-group`; `p-5` → `p-group` |
| `site/src/routes/affordances/handles/interaction-handle-styles.ts` | `p-3` → `p-related` |
| `site/src/routes/animation-demo/AnimationDemoRoute.tsx` | `gap-2` → `gap-related`; `mt-3` → `mt-related` |
| `site/src/routes/animation-demo/animation-demo-styles.ts` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `gap-8` → `gap-region`; `p-4` → `p-group`; `p-5` → `p-group`; `px-4` → `px-group`; `py-3` → `py-related` |
| `site/src/routes/annotation-demo/AnnotationDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-3` → `gap-related`; `mt-3` → `mt-related`; `p-3` → `p-related` |
| `site/src/routes/annotation-demo/annotation-demo-styles.ts` | `gap-1` → `gap-related`; `gap-1.5` → `gap-related`; `mx-1` → `mx-related`; `p-3` → `p-related`; `px-2` → `px-related`; `px-3` → `px-related`; `py-2.5` → `py-related` |
| `site/src/routes/artifact-viewer/ArtifactViewerRoute.tsx` | `mx-1` → `mx-related`; `px-2` → `px-related` |
| `site/src/routes/artifact-viewer/artifact-viewer-styles.ts` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-3` → `gap-related`; `mb-3` → `mb-related`; `mt-1` → `mt-related`; `mt-10` → `mt-region`; `mt-3` → `mt-related`; `mt-4` → `mt-group`; `mt-8` → `mt-region`; `p-3` → `p-related`; `p-4` → `p-group`; `pt-6` → `pt-group`; `px-14` → `px-region`; `px-2` → `px-related`; `px-3` → `px-related`; `px-4` → `px-group`; `px-8` → `px-region`; `py-10` → `py-region`; `py-3` → `py-related`; `py-8` → `py-region` |
| `site/src/routes/calendar-demo/CalendarDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-4` → `gap-group`; `mx-0.5` → `mx-related`; `my-1` → `my-related`; `pt-16` → `pt-region`; `px-4` → `px-group` |
| `site/src/routes/calendar-demo/calendar-demo-navigator.tsx` | `gap-1` → `gap-related` |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts` | `gap-0.5` → `gap-related`; `gap-1` → `gap-related`; `gap-1.5` → `gap-related`; `gap-2` → `gap-related`; `gap-3` → `gap-related`; `mx-0.5` → `mx-related`; `p-2` → `p-related`; `p-3` → `p-related`; `p-3.5` → `p-group`; `pl-3` → `pl-related`; `pt-3` → `pt-related`; `px-2` → `px-related`; `px-2.5` → `px-related`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/chat-demo/ChatDemoRoute.tsx` | `gap-3` → `gap-related`; `gap-8` → `gap-region`; `py-6` → `py-group` |
| `site/src/routes/collaboration-demo/CollaborationDemoRoute.tsx` | `gap-3` → `gap-related`; `gap-4` → `gap-group`; `p-4` → `p-group` |
| `site/src/routes/connectors/ajv/AjvConnectorLab.tsx` | `gap-1` → `gap-related`; `mb-1` → `mb-related`; `mb-4` → `mb-group`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `mt-4` → `mt-group`; `p-2` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/connectors/react-hook-form/ReactHookFormConnectorLab.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-1` → `mb-related`; `mb-4` → `mb-group`; `mt-1` → `mt-related`; `p-2` → `p-related`; `p-3` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/connectors/react/ReactConnectorLab.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-3` → `gap-related`; `gap-4` → `gap-group`; `mb-1` → `mb-related`; `mb-4` → `mb-group`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `mt-4` → `mt-group`; `p-3` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/connectors/tanstack-table/TanStackTableConnectorLab.tsx` | `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-3` → `mb-related`; `mt-3` → `mt-related`; `p-4` → `p-group`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/connectors/zod/ZodAdminLab.tsx` | `gap-1` → `gap-related`; `gap-4` → `gap-group`; `mb-1` → `mb-related`; `mt-1` → `mt-related` |
| `site/src/routes/connectors/zod/ZodConnectorLab.tsx` | `gap-1` → `gap-related`; `gap-4` → `gap-group`; `mb-1` → `mb-related`; `mb-4` → `mb-group`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `mt-4` → `mt-group`; `p-2` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/date-controls-demo/DateControlsDemoRoute.tsx` | `gap-4` → `gap-group` |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `mx-0.5` → `mx-related`; `my-1` → `my-related`; `p-2` → `p-related`; `p-4` → `p-group` |
| `site/src/routes/docs/DocumentationPage.tsx` | `gap-1` → `gap-related`; `gap-8` → `gap-region`; `mb-2` → `mb-related`; `mb-5` → `mb-group`; `px-2` → `px-related`; `px-3` → `px-related` |
| `site/src/routes/docs/MarkdownViewer.tsx` | `mt-2` → `mt-related` |
| `site/src/routes/document-demo/DocumentDemoRoute.tsx` | `mt-3` → `mt-related`; `mx-1` → `mx-related` |
| `site/src/routes/editing-demos/ClipboardDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `p-4` → `p-group`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/editing-demos/HistoryDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-1` → `mt-related`; `p-4` → `p-group`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/editing-demos/SelectionDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-1` → `mt-related`; `p-4` → `p-group`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/editing-demos/TopologyDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `p-4` → `p-group`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/home/home-styles.ts` | `gap-16` → `gap-region`; `gap-8` → `gap-region`; `gap-x-5` → `gap-x-group`; `gap-y-3` → `gap-y-related`; `mt-12` → `mt-region`; `mt-3` → `mt-related`; `mt-4` → `mt-group`; `mt-5` → `mt-group`; `mt-6` → `mt-group`; `mt-8` → `mt-region`; `px-12` → `px-region`; `px-16` → `px-region`; `px-24` → `px-region`; `px-6` → `px-group`; `py-20` → `py-region` |
| `site/src/routes/kanban-demo/KanbanDemoRoute.tsx` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `p-3` → `p-related` |
| `site/src/routes/llm-agent-artifact/llm-agent-artifact.css` | `gap: 3px` → `gap: var(--space-related)`; `gap: 8px` → `gap: var(--space-related)`; `margin: -12px auto 12px` → `margin: 0 auto var(--space-group)`; `margin: 10px 0 0` → `margin: var(--space-related) 0 0`; `margin: 12px 0 10px auto` → `margin: var(--space-group) 0 var(--space-related) auto`; `padding: 10px 16px` → `padding: var(--space-related) var(--space-group)`; `padding: 22px 0 30px` → `padding: var(--space-group) 0 var(--space-region)`; `padding: 32px 0 128px` → `padding: var(--space-region) 0 128px`; `padding: 8px` → `padding: var(--space-related)` |
| `site/src/routes/markdown-caret/MarkdownCaretRoute.tsx` | `gap-8` → `gap-region`; `px-2` → `px-related`; `py-3` → `py-related`; `py-6` → `py-group` |
| `site/src/routes/markdown-demo/MarkdownDemoRoute.tsx` | `p-6` → `p-group` |
| `site/src/routes/object-demo/ObjectDemoRoute.tsx` | `mx-1` → `mx-related` |
| `site/src/routes/order-demo/OrderDemoRoute.tsx` | `gap-1` → `gap-related`; `mt-3` → `mt-related`; `mx-1` → `mx-related` |
| `site/src/routes/rich-text-demo/RichTextDemoRoute.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-1` → `mt-related`; `mt-3` → `mt-related`; `p-2` → `p-related`; `p-3` → `p-related`; `p-4` → `p-group`; `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/rich-text-demo/rich-text-styles.ts` | `p-5` → `p-group` |
| `site/src/routes/sheet-demo/SheetViewsDemoRoute.tsx` | `gap:32` → `gap:"var(--space-region)"` |
| `site/src/routes/showcase/ShowcaseRoute.tsx` | `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mb-6` → `mb-group`; `mt-1` → `mt-related`; `p-2` → `p-related`; `p-5` → `p-group`; `px-2` → `px-related`; `px-3` → `px-related`; `py-2` → `py-related`; `py-3` → `py-related` |
| `site/src/routes/tree-demo/TreeDemoRoute.tsx` | `gap-1` → `gap-related`; `mt-3` → `mt-related`; `mx-1` → `mx-related` |
| `site/src/routes/ui-primitives-catalog/UiPrimitivesCatalogRoute.tsx` | `mb-1` → `mb-related`; `p-4` → `p-group` |
| `site/src/routes/ui-primitives-catalog/ui-primitives-catalog-styles.ts` | `p-4` → `p-group`; `pl-4` → `pl-group`; `pt-8` → `pt-region`; `px-3` → `px-related`; `px-4` → `px-group`; `py-2` → `py-related` |
| `site/src/routes/viewport-position-demo/ViewportPositionDemoRoute.tsx` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `gap-4` → `gap-group`; `mb-3` → `mb-related`; `p-4` → `p-group` |
| `site/src/routes/viewport-position-demo/viewport-position-demo-styles.ts` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `mt-4` → `mt-group`; `p-2` → `p-related`; `p-3` → `p-related`; `p-8` → `p-region`; `px-4` → `px-group`; `py-3` → `py-related` |
| `site/src/routes/widgets/BoardWidgetRoute.tsx` | `gap-1` → `gap-related`; `gap-2` → `gap-related`; `gap-3` → `gap-related` |
| `site/src/routes/widgets/DocumentWidgetRoute.tsx` | `gap-1` → `gap-related` |
| `site/src/routes/widgets/GridWidgetRoute.tsx` | `px-3` → `px-related`; `py-2` → `py-related` |
| `site/src/routes/widgets/ListboxWidgetRoute.tsx` | `gap-1` → `gap-related` |
| `site/src/routes/widgets/ToolbarWidgetRoute.tsx` | `gap-1` → `gap-related` |
| `site/src/routes/widgets/TreeWidgetRoute.tsx` | `gap-1` → `gap-related` |
| `site/src/routes/widgets/WidgetDemoFrame.tsx` | `gap-3` → `gap-related`; `gap-4` → `gap-group`; `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-1` → `mt-related`; `mt-4` → `mt-group`; `p-4` → `p-group` |
| `site/src/shared/composer/composer.css` | `gap: 10px` → `gap: var(--space-related)`; `gap: 11px` → `gap: var(--space-related)`; `gap: 6px` → `gap: var(--space-related)`; `gap: 8px` → `gap: var(--space-related)`; `margin-bottom: 34px` → `margin-bottom: var(--space-region)`; `margin-top: 18px` → `margin-top: var(--space-group)`; `margin-top: 2px` → `margin-top: var(--space-related)`; `margin: 10px 0 0` → `margin: var(--space-related) 0 0`; `margin: 18px 0 0` → `margin: var(--space-group) 0 0`; `padding: 10px;` → `padding: var(--space-related);`; `padding: 44px 14px` → `padding: var(--space-region) var(--space-group)`; `padding: 56px 40px` → `padding: var(--space-region)`; `padding: 64px 32px` → `padding: var(--space-region)`; `padding: 8px` → `padding: var(--space-related)`; `padding: 9px 10px` → `padding: var(--space-related) var(--space-group)` |
| `site/src/shared/demo-workbench/DemoWorkbench.tsx` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `mb-2` → `mb-related`; `p-3` → `p-related` |
| `site/src/shared/ui/catalog-demo-page.tsx` | `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-2` → `mt-related`; `mt-3` → `mt-related`; `mt-8` → `mt-region` |
| `site/src/shared/ui/inspector.tsx` | `gap-1` → `gap-related`; `gap-3` → `gap-related`; `mb-2` → `mb-related`; `mb-3` → `mb-related`; `mt-3` → `mt-related`; `p-3` → `p-related` |
| `site/src/shared/ui/primitives.tsx` | `mb-2` → `mb-related` |
| `site/src/shared/ui/styles.ts` | `gap-2` → `gap-related`; `gap-3` → `gap-related`; `gap-4` → `gap-group`; `gap-[5px]` → `gap-related`; `mb-3` → `mb-related`; `mb-8` → `mb-region`; `mt-1` → `mt-related`; `mt-6` → `mt-group`; `mx-1` → `mx-related`; `mx-1.5` → `mx-related`; `my-1` → `my-related`; `my-2` → `my-related`; `p-3` → `p-related`; `p-4` → `p-group`; `pb-3` → `pb-related`; `pb-5` → `pb-group`; `pb-8` → `pb-region`; `pl-4` → `pl-group`; `pr-2` → `pr-related`; `pt-2` → `pt-related`; `pt-4` → `pt-group`; `px-2` → `px-related`; `px-3` → `px-related`; `px-4` → `px-group`; `py-2` → `py-related`; `py-3` → `py-related` |

## 유지한 물리 치수

라인 번호는 기록 시점의 소스 기준이다. shorthand 안에 토큰과 숫자가 함께 있어도 숫자 부분을 누락하지 않았다.

| 위치 | 유지 값 | 이유 |
| --- | --- | --- |
| `packages/json-document-database/styles.css:36` | `padding: 4px 8px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:40` | `padding: 0.375rem 0.75rem` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:66` | `padding: 8px 12px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:71` | `padding: 8px 12px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:73` | `padding: 8px 12px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:76` | `padding: 4px 12px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:79` | `padding-block: 4px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:82` | `padding-block: 4px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-database/styles.css:102` | `padding: calc((var(--control-height) - var(--line-height-control) - 2px) / 2) 12px` | 40px/32px 데이터 셀의 내부 inset/체크박스 중심 정렬 또는 툴바 track. |
| `packages/json-document-animation-react/styles.css:125` | `margin-left: 0.18em` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:136` | `gap: 0.4em` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:140` | `gap: 0.45em` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:160` | `gap: 0.18rem` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:165` | `gap: 0.28rem` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:253` | `gap: 0.2em` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:342` | `margin-left: -0.07rem` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:478` | `gap: 0.1rem` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:535` | `margin: -0.11rem 0 0 -0.11rem` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-animation-react/styles.css:585` | `padding: 1.5px` | 애니메이션 도형·글리프 내부의 비례/배치. 콘텐츠 그룹 간격이 아님. |
| `packages/json-document-sheet/src/sheet-hand.css:15` | `padding: 4px` | 시트 셀과 contextual 툴바의 내부 hitbox/inset. 격자 편집 치수 보존. |
| `packages/json-document-sheet/src/sheet-hand.css:28` | `padding: 2px 6px` | 시트 셀과 contextual 툴바의 내부 hitbox/inset. 격자 편집 치수 보존. |
| `packages/json-document-sheet/src/sheet-hand.tsx:144` | `padding: "7px 10px"` | 시트 셀과 contextual 툴바의 내부 hitbox/inset. 격자 편집 치수 보존. |
| `packages/json-document-canvas/src/canvas-hand.css:11` | `padding: 0.25rem` | 고정된 overlay의 anchor offset 또는 28px contextual 컨트롤의 내부 inset. |
| `packages/json-document-canvas/src/canvas-hand.css:16` | `padding: 0.125rem 0.375rem` | 고정된 overlay의 anchor offset 또는 28px contextual 컨트롤의 내부 inset. |
| `packages/json-document-rich-text-suggestion-react/src/mention.tsx:102` | `gap: 4, margin: "0 2px", padding: "1px 7px"` | 인라인 mention atom 또는 선택 행/track 내부 inset. 문서 줄 높이 및 선택 영역 보존. |
| `packages/json-document-rich-text-suggestion-react/src/mention.tsx:105` | `padding: 4` | 인라인 mention atom 또는 선택 행/track 내부 inset. 문서 줄 높이 및 선택 영역 보존. |
| `packages/json-document-rich-text-suggestion-react/src/mention.tsx:108` | `padding: "9px 10px"` | 인라인 mention atom 또는 선택 행/track 내부 inset. 문서 줄 높이 및 선택 영역 보존. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:3` | `padding-top: 4.5rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:5` | `padding: 0.25rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:11` | `padding: var(--space-group) var(--space-group) 14rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:53` | `padding-bottom: 8rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:76` | `padding: 0 var(--space-group) 0 4.5rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:82` | `padding-left: 4.5rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-ui-builder/src/ui-builder-workspace.css:85` | `padding-inline: 0.5rem` | floating 툴바·채팅을 피하는 예약 공간 또는 컨트롤 내부 inset. 문서 배치 간격과 구분. |
| `packages/json-document-composer-react/src/chat-composer.css:29` | `padding: 0.25rem` | 입력 줄·키캡·명령의 내부 치수. 컨트롤 높이 또는 inline 줄 높이에 맞춘 inset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:14` | `padding: calc((var(--control-height) - var(--line-height-control) - 2px) / 2) 0.75rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:40` | `padding: 0.25rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:42` | `padding-block: 0.25rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:54` | `padding: calc((var(--control-height) - var(--line-height-control) - 2px) / 2) 0.75rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:68` | `padding-left: 2.25rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:76` | `padding: 0.25rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:79` | `padding: calc((var(--control-height) - var(--line-height-control)) / 2) 0.75rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:89` | `padding: 0.25rem 0.5rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:104` | `padding-left: 1.25rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:106` | `padding: 0.5rem 0.75rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:120` | `padding: 0.25rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:155` | `padding: 0 .5rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:175` | `padding: .5rem .75rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-ui-primitives-react/src/design-system.css:202` | `padding: .5rem .75rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-calendar/src/calendar-presentation.css:9` | `padding: .25rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/calendar-presentation.css:11` | `padding: .25rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/calendar-presentation.css:15` | `padding-inline: .25rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/calendar-presentation.css:16` | `padding-inline: .25rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/calendar-presentation.css:21` | `padding: .25rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/calendar-presentation.css:23` | `padding: .25rem .125rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/calendar-presentation.css:33` | `padding-inline: .25rem` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `packages/json-document-calendar/src/date-controls.css:5` | `padding-block: 0.375rem` | 컨트롤 높이/선택 track/아이콘·목록 마커의 내부 치수 또는 overlay anchor offset. |
| `packages/json-document-markdown-web/src/markdown-editor.css:131` | `padding: .25em .75em` | 작업 마커와 문서 표 셀의 글자 기준 inset. 소스/캐럿 표시 치수 보존. |
| `site/src/app/index.css:59` | `px-1, py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/home/home-styles.ts:9` | `pb-[20rem], pb-[18rem]` | 히어로 일러스트가 차지하는 하단 예약 공간. 화면 내 도형과 문구의 겹침 방지. |
| `site/src/routes/ui-primitives-catalog/ui-primitives-catalog-styles.ts:8` | `py-1.5` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/ui-primitives-catalog/ui-primitives-catalog-styles.ts:52` | `p-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/ui-primitives-catalog/ui-primitives-catalog-styles.ts:63` | `p-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/viewport-position-demo/viewport-position-demo-styles.ts:8` | `ml-5` | 문서 목록 marker 들여쓰기. 글머리/번호가 차지하는 가로 공간. |
| `site/src/routes/calendar-demo/CalendarDemoRoute.tsx:282` | `px-1, py-1.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/CalendarDemoRoute.tsx:297` | `p-0.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/CalendarDemoRoute.tsx:550` | `px-1` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:12` | `pb-24` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:13` | `py-0.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:15` | `py-0.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:22` | `px-1` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:25` | `py-1.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:26` | `pt-14` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:28` | `px-1` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:37` | `p-1.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:44` | `px-1, py-1` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:60` | `py-1.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:65` | `p-1.5` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/calendar-demo/calendar-demo-styles.ts:69` | `px-1` | 시간 사건 hitbox/선택 track/날짜 헤더 내부 inset 또는 상하 floating 조작 예약 공간. |
| `site/src/routes/tree-demo/TreeDemoRoute.tsx:175` | `paddingLeft: `${row.depth * 1.25}rem`` | row.depth 기반 트리 계층 들여쓰기. 레벨 좌표를 보존. |
| `site/src/routes/docs/DocumentationPage.tsx:35` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/docs/DocumentationPage.tsx:54` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/annotation-demo/annotation-demo-styles.ts:10` | `py-1.5` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/annotation-demo/annotation-demo-styles.ts:13` | `p-1.5` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/artifact-viewer/artifact-viewer-styles.ts:14` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/artifact-viewer/ArtifactViewerRoute.tsx:124` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:9` | `p-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:14` | `px-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:15` | `px-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:23` | `p-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:27` | `p-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:30` | `px-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/date-controls-demo/date-controls-demo-styles.ts:40` | `px-1` | 날짜 셀·시간 사건 내부 inset/차선 경계. 시간과 날짜 좌표의 치수 보존. |
| `site/src/routes/widgets/TreeWidgetRoute.tsx:84` | `paddingLeft: `${row.depth * 1.25}rem`` | row.depth 기반 트리 계층 들여쓰기. 레벨 좌표를 보존. |
| `site/src/routes/llm-agent-artifact/llm-agent-artifact.css:13` | `padding: var(--space-region) 0 128px` | 하단 채팅 컴포저를 피하는 예약 공간. |
| `site/src/routes/affordances/handles/interaction-handle-styles.ts:6` | `p-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/applications/ui-builder/ui-builder-application.css:7` | `padding: 0 var(--space-group) 3.5rem` | 하단 REC/floating 컨트롤을 피하는 예약 공간. |
| `site/src/applications/bear/BearApplication.tsx:71` | `p-1.5` | floating 툴바의 track 또는 하단 컴포저 예약 공간. |
| `site/src/applications/bear/BearApplication.tsx:90` | `pb-40` | floating 툴바의 track 또는 하단 컴포저 예약 공간. |
| `site/src/applications/sheet/sheet-application.css:1` | `padding-top:72px` | 상단 툴바와 하단 floating 상태창 예약 공간 또는 툴바 track. |
| `site/src/applications/sheet/sheet-application.css:3` | `padding:4px` | 상단 툴바와 하단 floating 상태창 예약 공간 또는 툴바 track. |
| `site/src/applications/sheet/sheet-application.css:5` | `padding:var(--space-related) var(--space-group) 64px` | 상단 툴바와 하단 floating 상태창 예약 공간 또는 툴바 track. |
| `site/src/shared/ui/styles.ts:17` | `px-2, py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:26` | `px-2, py-1, px-3` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:27` | `py-1, pl-5, pl-6` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:54` | `pl-5` | 문서 목록 marker 들여쓰기. 글머리/번호가 차지하는 가로 공간. |
| `site/src/shared/ui/styles.ts:61` | `py-1.5, pr-3` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:62` | `py-1.5, pr-3` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:103` | `pr-32, pr-52` | 고양이 일러스트 또는 코드 복사 버튼이 차지하는 예약 공간. |
| `site/src/shared/ui/styles.ts:123` | `px-3, py-2` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:131` | `px-3, py-2` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:145` | `px-1, py-0.5` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:162` | `pl-2, pr-10` | 고양이 일러스트 또는 코드 복사 버튼이 차지하는 예약 공간. |
| `site/src/shared/ui/styles.ts:175` | `px-3, py-2` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:184` | `px-2, py-0.5` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:185` | `px-2, py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/ui/styles.ts:187` | `px-2, py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/shared/composer/composer.css:18` | `padding: 1px 5px` | 입력 줄·키캡·명령의 내부 치수. 컨트롤 높이 또는 inline 줄 높이에 맞춘 inset. |
| `site/src/shared/composer/composer.css:39` | `padding: 11px 2px 8px` | 입력 줄·키캡·명령의 내부 치수. 컨트롤 높이 또는 inline 줄 높이에 맞춘 inset. |
| `site/src/shared/composer/composer.css:50` | `padding: 0 7px 0 10px` | 입력 줄·키캡·명령의 내부 치수. 컨트롤 높이 또는 inline 줄 높이에 맞춘 inset. |
| `site/src/shared/composer/composer.css:84` | `padding: 1px 7px` | 입력 줄·키캡·명령의 내부 치수. 컨트롤 높이 또는 inline 줄 높이에 맞춘 inset. |
| `site/src/shared/composer/composer.css:89` | `padding: 9px 14px` | 입력 줄·키캡·명령의 내부 치수. 컨트롤 높이 또는 inline 줄 높이에 맞춘 inset. |
| `site/src/app/interaction-recording/InteractionRecordingControls.tsx:32` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/app/interaction-recording/InteractionRecordingControls.tsx:33` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/app/interaction-recording/InteractionRecordingControls.tsx:42` | `py-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |
| `site/src/app/routes/__root.tsx:142` | `p-1` | 선택/명령/탐색 행·텍스트 키캡·floating 도구 내부 inset. 콘텐츠 사이 gap과 구분. |

## 실제 브라우저 확인

- 디자인 시스템 제품 조합: 상세 gap/padding 16px, 데스크톱 가로 넘침 없음.
- 날짜 선택: 날짜 칸 gap 8px, 7개 칸 각각 36×36px 유지, 날짜 선택 후 입력 값 변경.
- UI Builder: 미리보기→디자인 전환 전후 세 column의 x/y/width 동일, column gap 16px 유지.
- Database: 숫자 입력과 Tab 이동, toolbar gap 8px, 셀 입력 높이 40px, 가로 넘침 없음.

shared-worktree-dev 모드로 자동 테스트·typecheck·lint·build는 실행하지 않았다. 브라우저에서 방문하지 않은 모든 Demo의 조작이 검증됐다는 의미는 아니다.

## Margin 없는 조합으로 재구성

2026-10-14 후속 변경: PageFrame은 부모 Grid gap으로 영역을 구분하고,
PageHeader·카탈로그 소개·읽기/쓰기 예시는 관련 그룹 gap으로 묶었다.
인스펙터·날짜 상세·Composer 오류·시트 도구도 부모가 간격을 소유한다.
말풍선은 self 정렬, 팝오버는 앵커 좌표, 빌더 제목/맥락은 실제 읽기 그룹을 사용한다.
바깥/음수 margin 보정은 제거하고 브라우저 기본 margin의 0 reset만 유지한다.

PageFrame Grid의 기본 stretch가 빈 화면 높이를 행 사이에 분배하던 회귀를
사용자 스크린샷에서 발견했다. page/frame/header/copy에 content-start를 명시하고
실제 Database Demo에서 제목→설명 8px, 헤더→Demo 32px을 측정했다.
카탈로그도 제목→설명 8px, 상세 gap 16px이며 가로 넘침과 console error가 없다.
빌더 issue-feed에서는 title/caption과 caption/card가 실제 8px 읽기 그룹을 이룬다.
미리보기/디자인 전환의 좌표 일치도 브라우저에서 확인했다.

## same-lens 레이블 관계 후속 수정

레이블·값, 제목·설명에 공통 부모 gap이 없거나 자식 margin으로 보정하던 정본과 Demo를 부모 gap으로 전환했다. 관련 관계는 8px, 별도 작업 영역은 16px, 독립 영역은 32px을 사용한다. ProductInspector의 attached 상태와 ActivityFeed entry도 같은 규칙을 적용한다. ZodAdminLab의 기존 gap 위에 더해지던 제목 margin은 제거했다. 초기에는 Chrome 연결이 발견되지 않아 화면 검증을 수행하지 못했다. 이후 MCP의 구버전 경로 문제를 확인하고 새 세션에서 연결을 복구했다.

### 브라우저 검증 범위

실제 Chrome에서 아래 관계를 실측하고 조작했다. 23개 후보 파일과 ZodAdminLab의 수정 범위는 레이블·값/제목·설명 관계이며 모든 UI 상태에 대한 전역 완료 주장이 아니다.

| 실제 확인 | 결과 |
| --- | --- |
| 카탈로그 SidebarNavigation / ProductInspector | 관련 그룹 8px, 패널 header/body 16px |
| ActivityFeed / UIBuilder 컬렉션 필드 | entry 제목·내용 및 필드명·값 8px |
| History / Clipboard | 레이블·제목·설명 8px, 편집·Undo·Redo 및 Copy·Paste 동작 |
| Ajv / ReactHookForm / Zod | 제목·설명 및 상태 레이블·값 8px; Zod 제목 margin 0 |
| WidgetDemoFrame / SheetViews / ArtifactViewer | 레이블·제목 또는 제목·표 8px, MD→PPT 전환 |
| VirtualSelection Demo | 제목·설명 실제 8px |
| 카탈로그 제품 흐름 / 빌더 | 메모 저장, 브리핑 loading→MOCK 성공, 패널 닫기·재열기, 실행→디자인 전환·선택 |

독립 external-kit, 모든 팝오버와 인물/날짜 입력 상태, Mention 후보, Home·Showcase, 좁은 화면과 전체 오류 조합은 이번 브라우저 검증에서 직접 관찰하지 않았다. 관련 소스는 부모 gap 또는 정본 그룹 연결을 확인했다. 제품의 자동 test/typecheck/lint/build는 shared-worktree-dev 실험 계약에 따라 실행하지 않았다.
