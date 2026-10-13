# UI Builder Editing

`createUIBuilderEditor(document)`는 `CanvasDocument`를 받아 검증된 JSON Document 위에 기존 `ObjectEditor`를 구성합니다. `assertUIBuilderDocument` 검증은 commit 경계에 적용되므로 직접 편집·clipboard·AI 모두 등록 컴포넌트만 저장할 수 있습니다. History와 선택은 Object editor가 소유합니다.

`createUIBuilderTools(editor)`는 실제 agent transport에 연결하는 `read_ui_builder`, `apply_ui_builder_changes`를 제공합니다. 도구 인자는 JSON Schema로 설명하며 실행 시 다시 검증합니다. read는 현재 문서·선택·카탈로그를 반환합니다. apply는 `components`와 `removeIds`를 받아 한 transaction으로 적용합니다. 기존 ID는 수정하고 빈 ID는 생성하며, 요청에 없는 객체는 보존합니다. 문구는 `text`, 보조 문구는 `detail`, 항목은 `items`, 강조는 `tone`입니다. 위치와 크기는 pixel입니다.

read 후 수동 편집이 발생하면 `ui-builder.stale-document`로 거절합니다. 다시 읽고 새 계획을 적용해야 합니다. 유효하지 않은 batch는 일부도 적용하지 않으며 성공한 한 batch는 실행 취소 한 번으로 복구합니다. 등록되지 않은 코드·HTML·컴포넌트는 지원하지 않습니다.

Usage와 Source: [UI Builder](/applications/ui-builder).

```live-demo
/applications/ui-builder
```

## 프로젝트 재료

`readUIBuilderProject`는 기존 Canvas 전용 문서에 빈 tables/actions를 부여한다.
`createUIBuilderEditor`는 복원과 모든 변경 경계에서 `assertUIBuilderProject`를 적용한다.
프로젝트의 테이블은 Database 스키마·레코드·보기를 그대로 사용한다.
`UIBuilderField.sample`은 생성 의미이며, `UIBuilderSampleGenerator`는 외부에서 주입한다.

`applyUIBuilderMaterials(editor, commands, generator)`는 테이블 저장·삭제·데이터 교체·예시 생성,
액션 저장·삭제를 원자적 배치로 처리한다. 오류가 있으면 전체 배치를 거부한다.
화면과 카탈로그는 하나의 undo/redo 기록을 공유한다. 예시 생성은 append/replace를 명시해야 한다.

`createUIBuilderMaterialTools`는 읽기·카탈로그 저장·예시 생성 도구를 제공한다.
읽은 뒤 사용자가 문서를 바꾸면 수정 도구는 stale 오류를 반환한다.
AI는 목적을 확인하고 기존 테이블·액션을 재사용하며 필요한 스키마와 예시를 만든 뒤 화면을 구성한다.
이 단계에서는 화면의 동적 바인딩이나 액션 실행을 제공하지 않으므로 완료했다고 표현하면 안 된다.

`createDatabaseView(id, name, propertyIds, ownership?, options?)`가 Database 보기 생성의 정본이다.
`options.hiddenPropertyIds`로 숨길 필드를 지정한다. 기존 Database 공개 API도 이 함수를 재노출한다.
UI 빌더와 Zod 번역은 빈 숨김 목록을 전달해 모든 스키마 필드를 표시한다.
