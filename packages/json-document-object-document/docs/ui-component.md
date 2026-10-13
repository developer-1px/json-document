# UI Component document

UI 빌더의 컴포넌트는 기존 Canvas `embedded-document`의 `documentType: "ui-component/1"`입니다. 좌표·크기·ID·표시 문구(`label`)는 Object가 소유합니다. embedded `document`는 `component`, `detail`, `items`, `tone`만 가집니다.

- `uiComponentCatalog`: 제목·본문·버튼·입력·긴 입력·체크박스·선택 목록·탭·카드·숫자·목록·구분선의 고정 카탈로그, 기본 크기·문구·의미.
- `createUIComponentObject(component, { x, y }, content?)`: 카탈로그 기본값으로 ID 없는 Object draft 생성. `content.text`는 Object label이며 나머지는 embedded 속성입니다.
- `assertUIComponentContent(value)`: 알려진 종류, 문자열·항목·강조와 허용 필드 검증.
- `assertUIBuilderDocument(value)`: Canvas 형태와 모든 객체의 등록 컴포넌트 여부 검증. 임의 HTML·CSS·JS와 수동 hierarchy는 받지 않습니다.

`UIComponentKind`, `UIComponentContent`, `UIComponentObject`를 공개합니다. 화면 투영은 Canvas의 `UIComponentView`가, 편집은 Editing의 `createUIBuilderEditor`가 소유합니다.

Usage와 Source: [UI Builder](/applications/ui-builder).
