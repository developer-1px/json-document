# UI Builder 컴포넌트 설정

디자인 시스템 전체 시각 기능은 object-document의 `uiComponentCatalog` 정본에
등록되어 있다. 패키지별 `source`와 콘텐츠 매핑, 허용 속성, 기본값을 먼저 읽는다.
문자열 필드만 나열하지 않고, 같은 대상의 여러 속성은 collection으로 묶는다.

input/textarea의 `props.description`은 보이는 도움말이며 detail의 기존 placeholder와
구분한다. `props.required`는 필수 표시와 native required 속성이다. 렌더러는 UI
Primitives의 FormField를 사용하며 레이블·간격을 별도로 재구현하지 않는다.
이 설정은 폼 전체의 제출·서버 검증이나 저장 승인 정책을 대신하지 않는다.

`createUIBuilderCatalogTools`의 `read_ui_builder_catalogs` 응답은
`compositionGuidance`를 포함한다. 사용자 과업에서 시작하는 결정 순서,
목록과 선택 상세의 관계, 즉시 속성 저장과 스킬 실행의 구분, 시각 표현 절제,
실행 화면의 상태별 확인 기준을 제공한다. 카탈로그 항목의 수를 늘리는 대신
등록된 기능을 제품 과업에 맞게 조합하도록 안내한다.

`createUIBuilderLayoutTools`의 읽기 응답에도 배치 범위의 구성 지침이 있다.
자유 편집 좌표가 나타낸 사용자 의도를 우선하며 기존 요소의 삭제·문구 변경·기능
발명은 허용하지 않는다. 목록-상세는 적용 가능한 과업 패턴이며 모든 화면에
강제되는 템플릿이 아니다. 지침은 생성 품질 보장이 아니므로 실제 생성 결과와
실행 동작을 별도로 확인해야 한다.

```ts
import {
  applyUIBuilderComponentConfiguration,
  createUIBuilderComponentConfigurationTools,
} from "@interactive-os/json-document-editing";

applyUIBuilderComponentConfiguration(editor, [{
  objectId: "inventory-table",
  props: {editable: false},
  collection: {tableId: "inventory", fieldIds: ["name", "stock", "price"]},
}]);
const tools = createUIBuilderComponentConfigurationTools(editor);
```

`read_ui_builder_component_catalog`는 전체 카탈로그와 비시각 API 조합 recipe,
현재 문서를 반환한다. `configure_ui_builder_components`는 여러 요소의 `props`,
`childIds`, `collection`을 한 undo 단위로 변경한다. 읽은 이후 다른 편집이 있으면
stale 오류를 반환하므로 다시 읽는다. 생략한 설정은 보존하며 props는 전체 교체,
`childIds: []`는 자식 해제, `collection: null`은 컬렉션 연결 해제다.

수동 UI도 같은 `applyUIBuilderComponentConfiguration` API를 사용한다.
모든 설정은 문서 포트의 검증을 거치고 잘못된 필드·참조를 원자적으로 거부한다.
기존 `apply_ui_builder_changes`는 배치·문구 변경 시 승인된 설정 메타데이터를
보존한다. 새 컴포넌트는 정본 factory의 유효한 기본값을 사용한다.


## 컬렉션과 조합

`resolveUIBuilderCollection`은 table/record-list/detail-list에 한 레코드의 여러 필드를 제공한다.
`resolveUIBuilderTableData`는 search/select의 targetTableId·fieldId와 실행 중 입력으로
Database의 `projectDatabaseTable` 정본 검색·필터·정렬을 사용한다. 표시 행 ID를 함께
반환해 필터 뒤 선택이 다른 데이터 행에 연결되지 않는다. `commitUIBuilderCollection`은
표시 필드의 값을 원본 테이블에 병합하고 검색으로 숨겨진 행을 보존한다.

Record selection의 테이블 키가 없으면 초기 첫 행을 사용하지만 값이 `""`이면
명시적인 선택 없음이다. 입력 저장과 스킬 실행은 이 상태에서 첫 행으로 대체하지
않고 실패하며 데이터를 보존한다. Runtime은 대상 테이블의 선택이 없는 액션을
비활성화하고, 검색 결과에서 다시 행이 선택되면 활성화한다.

컬렉션의 `document`는 원본 schema의 모든 필드를 유지한다. view의 columns에도
모든 필드를 등록하고 `collection.fieldIds`에 없는 필드를 숨겨 Database 문서 계약을
보존한다. `fieldIds`는 표시할 필드, `selectedRecordId`는 공유 record selection의
현재 행을 전달한다. `detail-list`는 선택 행의 상세, `record-list`는 표시 행의 목록이다.
표 adapter는 `selectedRecordId`를 정본 `DatabaseHand`에 전달한다. 초기화·외부 복원
때는 공유 선택을 변경하지 않으며 사용자 선택 변경만 record selection으로 전달한다.
따라서 값 수정과 결과 페이지 왕복이 다른 업무를 선택하는 원인이 되지 않는다.

`uiBuilderComponentChildIds`는 childIds와 ProductShell의 toolbarIds/inspectorIds를 읽는다.
`getUIBuilderRootObjects`는 자식의 중복 렌더링을 피한다. `assertUIBuilderComposition`은
없는 자식, 순환·다중 부모·페이지를 넘는 조합과 잘못된 컬렉션 필드를 거부한다.
삭제는 들어오는 내부 참조도 같은 undo에서 정리한다.

`setUIBuilderComponentValue`는 연결된 입력은 데이터에 저장하고 연결 없는 입력은
컴포넌트의 value로 저장한다. 날짜·기간 및 오버레이 props 변경은 승인된 구성 API를 사용한다.

Usage와 Source: `/applications/ui-builder?example=catalog&new=1`.

`duplicateUIBuilderComposition`은 조합의 내부 요소를 새 ID로 복제하고 자식 참조를 다시 연결합니다. 원본의 데이터 바인딩과 별도 문서·페이지 ID는 보존합니다. UI 편집기의 복제도 이 정본을 사용합니다.

## record-list presentation

`record-list`는 `props.presentation: "fields" | "feed"`를 등록한다. 생략하면 기존 필드 목록을 표시한다. `"feed"`에서는 `collection.fieldIds`의 첫 필드가 제목, 두 번째 필드가 요약 본문, 나머지가 레코드의 보조 정보다. 예를 들어 `["title", "summary", "key", "state", "owner", "updated"]`는 제목과 요약 뒤에 업무 번호·상태·담당자·갱신 시각을 표시한다. 값 포맷과 공유 레코드 선택은 정본 Canvas collection presentation을 사용한다. `detail-list`는 이 presentation에 영향을 받지 않는다.

Usage와 Source: `/applications/ui-builder?example=issue-feed`.

배치 읽기 응답의 `objects`는 현재 페이지의 중첩 자식까지 포함하며 선택된 데이터와
자유 편집 좌표를 제공한다. `rootObjectIds`는 최상위 flow에 배치할 객체를 구분한다.
자식 객체를 최상위 rows에 다시 넣어 중복 렌더링하지 않는다. `childOrders`는
기존 부모의 childIds/toolbarIds/inspectorIds 슬롯 안에서 자식의 읽는 순서만 바꾼다.
각 슬롯의 기존 자식을 모두 정확히 한 번씩 포함해야 하며 누락·추가·재부모화를 거부한다.
최상위 flow와 자식 순서는 한 undo 단위로 적용한다. 내부의 새로운 행·열 구조나
자의적 CSS 레이아웃을 생성하는 계약은 아니다.

페이지 이동용 tabs의 props.pageIds가 있으면 projection은 그 컴포넌트의 pageId에
해당하는 항목을 현재 탭으로 표시한다. 저장 초기값이나 이전 페이지에서의 runtime
값이 다른 페이지를 선택 상태로 보이게 하지 않으며 원본 문서는 수정하지 않는다.
전체 카탈로그 Usage의 페이지 왕복에서 현재 페이지와 탭 선택 일치를 확인했다.

`createUIBuilderLayoutTools` context의 runtimeValues는 표시 중인 검색·필터 값을
전달한다. read 응답의 objects는 이 값으로 투영되고 collections는 실제 필터된
Database projection을 objectId와 함께 반환한다. 읽기는 원본 문서를 변경하지 않는다.

selectionMissing은 UI 조합의 모든 자식이 현재 선택을 필요로 하고 선택이 없을
때 부모에도 전파된다. 독립 콘텐츠가 하나라도 있으면 부모를 유지한다. Runtime은
이 표시 상태를 미리보기와 디자인에서 동일하게 사용해 편집 진입 시 숨겨진
상세를 다시 노출하지 않는다. 빈 검색에서 표시 root 6개의 내용·좌표·크기가
모드 전환 전후 동일하고 빈 속성 그룹이 사라지는 것을 Chrome으로 확인했다.

record-list/table은 필터된 레코드 컬렉션을 읽고 detail-list는 선택된 원본
레코드의 속성을 읽는다. 상태 편집으로 선택 업무가 필터에서 제외되어도 다른
업무의 속성으로 바뀌지 않는다. 검색·필터를 사용자가 변경하면 Runtime은 보이는
대상에서 선택을 명시적으로 갱신한다.
