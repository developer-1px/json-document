# UI Builder Editing

`createUIBuilderEditor(document)`는 `CanvasDocument`를 받아 검증된 JSON Document 위에 기존 `ObjectEditor`를 구성합니다. `assertUIBuilderDocument` 검증은 commit 경계에 적용되므로 직접 편집·clipboard·AI 모두 등록 컴포넌트만 저장할 수 있습니다. History와 선택은 Object editor가 소유합니다.

`createUIBuilderTools(editor)`는 실제 agent transport에 연결하는 `read_ui_builder`, `apply_ui_builder_changes`를 제공합니다. 도구 인자는 JSON Schema로 설명하며 실행 시 다시 검증합니다. read는 현재 문서·선택·카탈로그를 반환합니다. apply는 `components`와 `removeIds`를 받아 한 transaction으로 적용합니다. 기존 ID는 수정하고 빈 ID는 생성하며, 요청에 없는 객체는 보존합니다. 문구는 `text`, 보조 문구는 `detail`, 항목은 `items`, 강조는 `tone`입니다. 위치와 크기는 pixel입니다.

read 후 수동 편집이 발생하면 `ui-builder.stale-document`로 거절합니다. 다시 읽고 새 계획을 적용해야 합니다. 유효하지 않은 batch는 일부도 적용하지 않으며 성공한 한 batch는 실행 취소 한 번으로 복구합니다. 등록되지 않은 코드·HTML·컴포넌트는 지원하지 않습니다.

Usage와 Source: [UI Builder](/applications/ui-builder).

```live-demo
/applications/ui-builder
```
