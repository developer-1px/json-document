# UI Component document

UI 빌더의 컴포넌트는 기존 Canvas `embedded-document`의 `documentType: "ui-component/1"`입니다. 편집 좌표·크기·ID·표시 문구(`label`)는 Object가 소유합니다. embedded `document`는 `component`, `detail`, `items`, `tone`과 선택적인 `bindings`, `actionId`, `value`를 가집니다.

- `uiComponentCatalog`: 제목·본문·버튼·입력·긴 입력·체크박스·선택 목록·탭·카드·숫자·목록·구분선의 고정 카탈로그, 기본 크기·문구·의미.
- `createUIComponentObject(component, { x, y }, content?)`: 카탈로그 기본값으로 ID 없는 Object draft 생성. `content.text`는 Object label이며 나머지는 embedded 속성입니다.
- `assertUIComponentContent(value)`: 알려진 종류, 문자열·항목·강조와 허용 필드 검증.
- `assertUIBuilderDocument(value)`: Canvas 형태와 모든 객체의 등록 컴포넌트 여부 검증. 임의 HTML·CSS·JS와 수동 hierarchy는 받지 않습니다.

`UIComponentKind`, `UIComponentContent`, `UIComponentObject`를 공개합니다. 화면 투영은 Canvas의 `UIComponentView`가, 편집은 Editing의 `createUIBuilderEditor`가 소유합니다.

Usage와 Source: [UI Builder](/applications/ui-builder).

```live-demo
/applications/ui-builder
```

## 연결·디자인·레이아웃 카탈로그

`uiComponentCatalog.bindingTargets`는 컴포넌트가 받을 수 있는 text/detail/items/value 슬롯이다. `UIComponentContent.bindings`는 `UIComponentBinding[]`, 버튼의 `actionId`는 액션 참조다. `assertUIComponentBindings`는 모드·슬롯·필드/행 참조 형식을 검증한다. 실제 테이블 참조 해석은 Editing의 프로젝트 projection 책임이다.

`uiBindingCatalog`는 value/list/count/sum, `uiDesignCatalog`는 clean/soft/bold, `uiLayoutCatalog`는 stack/grid/dashboard를 제공한다. `arrangeUIComponents(objects, layoutId, width)`는 명시적인 한 번 배치를 계산한다. 문서 내용과 연결을 보존한다. 수동 편집이나 데이터 변경 때 자동 호출하지 않는다. 디자인은 Canvas의 등록 컴포넌트 renderer가 투영한다.

## 실행 화면의 자동 흐름

`UIFlowLayout`은 rows → columns → items로 읽는 순서와 그룹을 저장한다. 열은 `weight` 1~12의 비율을 가지며 한 행에 최대 네 열을 둔다. 각 item은 `objectId`와 너비 정책 `size: "hug" | "fill"`을 가진다. 높이는 콘텐츠를 따르고 절대 좌표는 저장하지 않는다. `assertUIFlowLayout`은 구조·비율·중복 ID·100개 요소 한도를 검증한다.

`resolveUIFlowLayout(objects, layout?)`은 삭제된 요소를 제외하고 새로 추가된 요소를 편집 위치의 읽기 순서로 끝에 붙인다. flow가 없던 문서는 같은 기본 순서로 실행할 수 있다. 정확한 전체 요소 포함 여부와 AI 반영은 Editing, Grid/Flex와 좁은 화면의 열 쌓기는 UI Builder가 소유한다.
