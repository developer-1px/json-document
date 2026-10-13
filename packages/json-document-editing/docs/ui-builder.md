# UI Builder Editing

`createUIBuilderEditor(document)`는 `CanvasDocument`를 받아 검증된 JSON Document 위에 기존 `ObjectEditor`를 구성합니다. `assertUIBuilderDocument` 검증은 commit 경계에 적용되므로 직접 편집·clipboard·AI 모두 등록 컴포넌트만 저장할 수 있습니다. History와 선택은 Object editor가 소유합니다.

`createUIBuilderTools(editor)`는 실제 agent transport에 연결하는 `read_ui_builder`, `apply_ui_builder_changes`를 제공합니다. 도구 인자는 JSON Schema로 설명하며 실행 시 다시 검증합니다. read는 현재 문서·선택·카탈로그를 반환합니다. apply는 `components`와 `removeIds`를 받아 한 transaction으로 적용합니다. 기존 ID는 수정하고 빈 ID는 생성하며, 요청에 없는 객체는 보존합니다. 문구는 `text`, 보조 문구는 `detail`, 항목은 `items`, 강조는 `tone`입니다. 위치와 크기는 pixel입니다.

read 후 수동 편집이 발생하면 `ui-builder.stale-document`로 거절합니다. 다시 읽고 새 계획을 적용해야 합니다. 유효하지 않은 batch는 일부도 적용하지 않으며 성공한 한 batch는 실행 취소 한 번으로 복구합니다. 등록되지 않은 코드·HTML·컴포넌트는 지원하지 않습니다.

Usage와 Source: [UI Builder](/applications/ui-builder).

```live-demo
/applications/ui-builder
```

## 프로젝트 재료

`readUIBuilderProject`는 기존 Canvas 전용 문서에 빈 tables/actions와 `flow: null`을 부여한다.
`createUIBuilderEditor`는 복원과 모든 변경 경계에서 `assertUIBuilderProject`를 적용한다.
프로젝트의 테이블은 Database 스키마·레코드·보기를 그대로 사용한다.
`UIBuilderField.sample`은 생성 의미이며, `UIBuilderSampleGenerator`는 외부에서 주입한다.

`applyUIBuilderMaterials(editor, commands, generator)`는 테이블 저장·삭제·데이터 교체·예시 생성,
액션 저장·삭제를 원자적 배치로 처리한다. 오류가 있으면 전체 배치를 거부한다.
화면과 카탈로그는 하나의 undo/redo 기록을 공유한다. 예시 생성은 append/replace를 명시해야 한다.

`createUIBuilderMaterialTools`는 읽기·카탈로그 저장·예시 생성 도구를 제공한다.
읽은 뒤 사용자가 문서를 바꾸면 수정 도구는 stale 오류를 반환한다.
AI는 목적을 확인하고 기존 테이블·액션을 재사용하며 필요한 스키마와 예시를 만든 뒤 화면을 구성한다.
동적 값은 바인딩 도구로 연결하고, 버튼 실행은 등록된 스킬을 선언적으로 연결한다. MOCK 스킬의 결과를 외부 실행 완료로 표현해서는 안 된다.

`createDatabaseView(id, name, propertyIds, ownership?, options?)`가 Database 보기 생성의 정본이다.
`options.hiddenPropertyIds`로 숨길 필드를 지정한다. 기존 Database 공개 API도 이 함수를 재노출한다.
UI 빌더와 Zod 번역은 빈 숨김 목록을 전달해 모든 스키마 필드를 표시한다.

## 바인딩·디자인·배치

`resolveUIBuilderComponent(project, object, selection?)`은 현재 데이터에서 text/detail/items/value 슬롯을 투영한다. 원본 컴포넌트와 기하는 바꾸지 않는다. 값·목록·개수·숫자 합계를 지원하며, 없는 테이블/필드/행은 빈 값과 issues로 표시한다. 선택 필드는 옵션 이름으로 표시한다. 목록은 최대 50행, 문자열은 표시 한도 내에서 투영한다.

`applyUIBuilderConfiguration`은 connections, designId, layout, flow를 한 undo로 적용한다. connections에 없는 객체는 그대로 두며 명시한 객체의 연결은 교체한다. recordId가 빈 연결은 실행 화면의 선택 행, 선택이 없으면 첫 행을 따른다. 지정한 ID는 그 행에 고정한다. 디자인 변경은 위치를 바꾸지 않는다. layout은 편집 좌표를 정리하는 명시적 프리셋이며, flow는 실행 화면의 행·열·순서·너비 정책이다.

`createUIBuilderCatalogTools`로 같은 카탈로그와 설정 명령을 AI에 제공한다. `createUIBuilderLayoutTools`는 전용 읽기와 `arrange_ui_builder`만 제공한다. AI가 자유 배치 좌표와 콘텐츠를 읽고 `UIFlowLayout`을 반영한다. 현재 요소를 모두 한 번씩 포함해야 하며 중복/누락 ID·잘못된 열 비율·stale 요청을 거부한다. 편집 좌표, 크기, 콘텐츠와 바인딩은 보존한다. 한 세션의 성공한 반영은 한 번이며 undo 한 번으로 돌아간다.

실행 화면은 실제 Grid/Flex 흐름을 사용한다. `size: "hug"`는 내용 너비, `"fill"`은 열 너비를 따른다. 높이는 모두 내용에 맞춰 늘어나고 뒤쪽 요소를 밀어낸다. 수동으로 정한 편집 높이를 실행 화면의 고정 높이로 사용하지 않는다. flow는 프로젝트와 함께 저장된다.

## 실행

`UIBuilderAction.execution`은 skill, tableId, prompt, inputFieldIds, outputFieldIds, requiredFieldIds를 저장한다. 실행 구현은 문서에 넣지 않는다. Host가 `UIBuilderSkillDefinition[]`으로 실제 또는 MOCK port를 주입한다. `createUIBuilderActionTools`는 가능한 스킬을 읽고 기존 액션에 연결한다. AI 설정 도구 자체는 업무 스킬을 실행하지 않는다.

`executeUIBuilderAction(editor, actionId, skills, selection?, signal?)`은 선택 행의 명시한 필드만 복사해 스킬에 전달한다. 필수값, 취소, 실행 중 문서 변경, 출력 필드/타입을 검사한 다음 결과를 같은 행에 원자적으로 저장한다. 실패·취소 결과는 문서를 바꾸지 않는다. `setUIBuilderInput`은 컴포넌트의 value 바인딩으로 같은 데이터 행을 편집한다. 스킬의 외부 부수효과는 undo 대상이 아니므로 Host는 실행 권한과 실제 연결의 동작을 책임져야 한다. 예제 스킬은 외부 부수효과가 없다.
