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

`uiBindingCatalog`는 value/list/count/sum, `uiDesignCatalog`는 공통 디자인 clean, `uiLayoutCatalog`는 stack/grid/dashboard를 제공한다. 과거 soft/bold 저장값은 Editing에서 clean으로 정규화하며 콘텐츠는 보존한다. `arrangeUIComponents(objects, layoutId, width)`는 명시적인 한 번 배치를 계산한다. 문서 내용과 연결을 보존한다. 수동 편집이나 데이터 변경 때 자동 호출하지 않는다. Canvas renderer는 UI Primitives의 공통 컨트롤과 `contentPresentation`을 소비한다.

## 실행 화면의 자동 흐름

`UIFlowLayout`은 rows → columns → items로 읽는 순서와 그룹을 저장한다. 열은 `weight` 1~12의 비율을 가지며 한 행에 최대 네 열을 둔다. 각 item은 `objectId`와 너비 정책 `size: "hug" | "fill"`을 가진다. 높이는 콘텐츠를 따르고 절대 좌표는 저장하지 않는다. `assertUIFlowLayout`은 구조·비율·중복 ID·100개 요소 한도를 검증한다.

`resolveUIFlowLayout(objects, layout?)`은 삭제된 요소를 제외하고 새로 추가된 요소를 편집 위치의 읽기 순서로 끝에 붙인다. flow가 없던 문서는 같은 기본 순서로 실행할 수 있다. 정확한 전체 요소 포함 여부와 AI 반영은 Editing, Grid/Flex와 좁은 화면의 열 쌓기는 UI Builder가 소유한다.

`page-link`는 페이지 이동 버튼이며 `label`이 표시 문구다. `document.targetPageId`는
UI Builder 프로젝트 내 목적지 페이지를 가리킨다. 아직 목적지를 지정하지 않은 버튼도
유효하지만 실행 시 이동하지 않는다. 모든 UI 컴포넌트는 선택적인 `document.pageId`로
소속 페이지를 지정할 수 있다. 프로젝트의 페이지 참조 검증과 legacy 첫 페이지 처리는
Editing의 UI Builder 페이지 API가 소유한다.

## 전체 디자인 시스템 등록

`uiComponentCatalog`는 콘텐츠, 컨트롤, 조합, 날짜·일정, 피드백 범주로 모든 공개
시각 기능을 등록한다. 각 항목은 `source`, `mapping`, `propertySchema`,
`defaultProps`를 제공한다. `createUIComponentObject`는 유효한 기본 속성을 적용한다.
`assertUIComponentContent`는 등록하지 않은 속성·타입·enum 값을 거부한다.

- `props`: 해당 컴포넌트의 공개 whitelist 설정. 임의 CSS·HTML·코드는 받지 않는다.
- `childIds`: 조합 컴포넌트 안에 렌더할 기존 문서 요소 ID 순서.
- `collection`: `{tableId, fieldIds}`. 한 레코드의 여러 필드를 함께 표현한다.
  표는 여러 레코드를 비교하고, 상세 목록은 명명된 필드를 읽는다.
- 기존 `detail`, `items`, `tone`, `bindings`, `value` 문서는 그대로 지원한다.

`uiComponentCompositionRecipes`는 `floatingSurface`, `useListbox`, interaction
handle, calendar lifecycle hooks 등 비시각 API의 소유 위치와 조합 방법을 공개한다.
이들은 빈 leaf 컴포넌트나 장식용 mock으로 만들지 않는다.

`uiBuilderComponentChildIds(object)`는 UI 조합의 childIds와 shell toolbarIds/inspectorIds를 읽는 공개 정본이다. Editing은 이 API를 재수출한다. `objectSubtreeIds`와 object transform은 이 참조도 포함해 부모와 자식의 동시 선택에서 각 요소를 한 번만 이동한다. Usage는 전체 컴포넌트 예제의 group이며 Source는 ui-component.ts와 object-container-layout.ts다.

card의 props.emptyMessage는 detail이 비었을 때 제품이 제공하는 안내다. 생략하면
빈 description에 실행 결과가 없다는 의미를 임의로 부여하지 않는다. 실제 detail은
항상 안내보다 우선한다. 사용자가 입력한 문구는 텍스트로 렌더하며 HTML로 해석하지 않는다.

`record-workspace`는 childIds를 제품 header/listHeader/list/detailHeader/detail/properties 순서로 받습니다. 각 slot은 등록된 group이나 컴포넌트 하나를 참조합니다. slot의 역할 순서를 임의로 바꾸지 않습니다.

## Product record roles

`status-badge.props.tone`: neutral/active/success. `result-panel`은 text/detail와 childIds를
결과 제목/본문으로 사용하며 emptyMessage는 결과가 없을 때만 표시한다.
`property-editor.props.labels`는 childIds와 같은 순서의 속성명이다. 각 자식은 기존
입력·선택 또는 읽기 컴포넌트이며 데이터 연결을 그대로 사용한다.
`product-inspector.props.presentation`: attached/floating, open은 표시 여부다.
`record-list.props`의 titleFieldId/summaryFieldId/identifierFieldId/statusFieldId/
assigneeFieldId/updatedAtFieldId는 feed의 정보 역할을 명시한다. 제목은 생략 시 첫 필드를 사용하지만 나머지 역할은 명시된 필드만
표시한다. 필드 순서로 고객을 요약, 수량을 담당자로 추측하지 않는다. [Usage](/applications/ui-builder?example=issue-feed&new=1).

`card.props.actionCount`, `result-panel.props.actionCount`와 `product-inspector.props.footerCount`는 childIds 끝의 행동 개수를 지정한다. 나머지는 본문이며 같은 자식 소유권·순환 검사·Undo를 사용한다. 기본 0이다.

속성명 labels를 생략하면 기존 자식 요소의 label을 읽어 사용한다. 명시하는 경우 자식 수와 일치해야 한다. 하단 행동 개수는 0 이상의 정수이며 자식 수를 넘을 수 없다. 레코드 역할 fieldId는 collection.fieldIds 안의 실제 필드만 사용할 수 있다.

## Additional product catalog

page-header는 text/detail/childIds를 제목/설명/행동에 매핑한다. sidebar-navigation은
items/pageIds를 실제 페이지로 연결한다. people-picker는 items와 value를 담당자 필드에
연결한다. filter-bar는 targetTableId/fieldId/value로 기존 Database 필터를 적용하며
pill 제거·초기화는 value를 비운다. avatar/person-identity는 text/src를 사용한다.
priority-indicator.level은 low/normal/high, date-display.dateTime/overdue는 실제 날짜와
상태다. empty-state/inline-alert의 childIds는 복구 행동이고 detail은 설명이다.
stepper.items/currentIndex는 실제 단계다. activity-feed.entries.items는
{id,actor,action,dateTime,timeLabel,detail?} 기록이다. 입력 데이터가 없으면 기록을
만들지 않는다. 실행 피드백·Toast·메모 제출은 실행 상태와 Host command를 소비하므로
독립된 미연결 빌더 장식 요소로 등록하지 않는다.

## 작업 공간의 이름 참조

record-workspace는 props.headerId/listHeaderId/listId/detailHeaderId/detailId/propertiesId로 각 영역을 참조한다. 쓰지 않는 영역은 생략할 수 있다. 목록은 listId, 선택한 대상의 주 본문·작성은 detailId, 보조 속성은 propertiesId다. childIds와 이름 참조는 혼용하지 않는다. 기존 여섯 위치의 childIds는 읽기 호환을 유지하지만 새 화면 생성에는 이름 참조를 사용한다.

uiComponentSlotIds(content)는 이름 참조 또는 기존 위치를 정본 순서로 읽는다. uiBuilderComponentChildIds(object)는 모든 실제 자식 참조를 수집한다. mapUIComponentChildren(content, map)는 복제·삭제의 참조 변환을 소유하며 유효한 기존 위치 참조를 이름 참조로 바꿔 생략에 따른 위치 이동을 막는다.

Usage / Source: `/applications/ui-builder?example=support&new=1`의 생성 대화. 정본 구현은 ui-component.ts, 카탈로그 계약은 ui-component-catalog.ts, Canvas 소비자는 ui-component-compositions.tsx다.

기존 childIds가 여섯 영역을 초과하면 참조 변환은 자동으로 버리지 않고 오류를 반환한다. 잘못된 기존 구성을 이름 참조로 명시해 다시 제출해야 한다.

## 그룹의 표면 선택

`group`은 이어 읽거나 작업하는 내용이며 표면을 추가하지 않는다. `card`는 자체
제목·본문·행동으로 독립적으로 이해할 콘텐츠 단위다. `childIds` 끝의
`props.actionCount`개는 ContentCard.actions, 나머지는 본문이다. 기본 0이며
기존 카드는 그대로 본문으로 렌더한다. 카드 자체의 선택/이동 동작을 만들지 않는다.
`record-list.presentation=feed`는 대상 탐색의 제목/요약/상태 위계이고 fields는
실제 필드명/값 확인에 사용한다. `product-inspector`는 보조 맥락/작업이며 floating은
실제 겹침에만 사용한다. 같은 그룹에 표면·제목·inset을 중복 적용하지 않는다.
[실제 표면 Usage](/demo/ui-primitives#design-system-content)는 같은 문의 데이터로
연속 그룹, 독립 카드, 선택 요약, 보조 속성과 카드 본문/행동 연결을 보여준다.

## 선택 레코드의 도메인 카드

`record-card`는 collection의 선택 레코드 하나를 표현한다. props.presentation은
inquiry/task/product/approval/activity/result이며 `uiDomainCardCatalog`가 필수·허용
역할과 선택 이유를 정의한다. 각 역할은 props.<role>FieldId로 연결한다.
예: product는 titleFieldId/quantityFieldId/priceFieldId/noteFieldId와 실제 unit/currency.
`assertUIDomainCardMapping(props, fields, fieldIds)`는 필수 역할, 실제 컬렉션 필드,
수치 타입과 단위/통화를 확인한다. 팔레트 초안은 미연결일 수 있으나 완성 제출에는
검증된 collection이 필요하다. childIds의 끝 actionCount개는 행동이며 나머지는 기존
본문/편집 컴포넌트다. 표 비교·반복 목록을 카드로 강제하지 않는다.
[여섯 JSON Usage](/applications/ui-builder?example=domain-cards).

timeLabelFieldId는 task/approval/activity의 실제 시각 표시 문구를 연결한다. time/dateTime 원문은 time 요소의 datetime에 보존하며 자동 시간대 변환을 추측하지 않는다.

## 경계와 상태 단서

group.props.relationship는 related/group/region의 8/16/32 간격이다. 이어 읽는
내용은 간격으로, 독립 대상은 기존 card로, 작업의 동등한 단계는 기존 divider로
구분한다. timeline은 시간순 사건에만 사용한다.
record-card의 unread/completed/overdue/changedFieldId와 record-list의
unread/completed/overdueFieldId는 실제 checkbox 필드여야 한다. 미연결·false는
표시하지 않는다. record-list.itemKind는 message/task/product/change/activity/result,
priorityFieldId는 상태와 구분되는 실제 우선순위이다.
approval의 beforeFieldId/afterFieldId는 함께 연결하고 실제 변경 비교를 표시한다.
기존 문서에 비교·상태 사실이 없으면 기존 설명만 표시하며 데이터를 창작하지 않는다.
[JSON Usage](/applications/ui-builder?example=domain-cards).


`record-card.messagePresentation`은 문의 조합에서 `correspondence`(기본, 본문과 답장) 또는 `conversation`(실제 대화 기록)을 선택한다. 도메인 매핑은 공개 `RecordDetail/RecordSummary/RecordFacts/MessageThread` 정본 조합을 사용하며 별도 레이아웃을 소유하지 않는다.


`page-header.props.titleRole`은 `primary` 또는 `section`(기본)입니다. 선택한 대상이나 작성된 결과가 주 읽기 대상일 때 primary를 사용하며 같은 읽기 영역에 primary 제목을 반복하지 않습니다. `level`은 별도로 HTML 제목 수준을 정합니다. 이 옵션은 기존 콘텐츠 토큰을 선택하며 새로운 시각 토큰을 정의하지 않습니다.

### 인물·일정·파일 record-card

`presentation=person`은 title(필수), role/organization/contact/status/identifier 역할을 받습니다. `event`는 title/schedule(필수), timeLabel/location/participants/agenda/status/identifier, `file`은 title(필수), format/size/updated/timeLabel/preview/owner/status/identifier를 받습니다. 각 값은 props.<role>FieldId로 연결합니다. 인물은 간격과 연락처 구분선, 일정은 시간 우선의 옅은 면, 파일은 외곽선과 작성 맥락 구분선을 같은 UI Primitives 공개 조합으로 렌더합니다. 행동은 실제 childIds/actionCount 계약으로 연결합니다.

Task record-card의 flaggedFieldId는 중요 표시 여부를 담은 실제 checkbox 필드입니다. completed/overdue와 별개이며 우선순위 필드로 대체하지 않습니다. 다른 표현의 flagged 역할 연결이나 checkbox가 아닌 필드는 publication 검증에서 거부합니다.


### 데이터 표현 등록

`number-field`는 min/max/precision/unit/required, `date-range-display`는 start/end, `record-facts`는 labels/presentation과 childIds를 지원한다. `tag`는 text, `tag-group`은 items를 읽는다. `tag-picker`는 `props.options.items: {id,label,disabled?}[]`와 `selectedIds: string[]`를 사용한다. 태그 선택은 문서 옵션이며 Database 다중 관계 바인딩으로 해석하지 않는다.

`people-picker`의 신규 후보는 `props.people.items: {id,name,description?,src?,disabled?}[]`다. 동명이인을 허용하되 ID는 고유해야 한다. `items` 이름 목록은 기존 문서 호환 경로다. 바인딩 값에는 표시명이 아닌 실제 ID를 보존한다.

`comment-composer`는 targetId/actor/submitLabel/disabled를 지원한다. targetId는 같은 문서의 activity-feed다. `property-editor`와 `result-panel`은 호환 ID로 유지하지만 신규 구성에는 record-facts와 card를 사용한다.
