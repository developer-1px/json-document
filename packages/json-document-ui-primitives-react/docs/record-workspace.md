# RecordWorkspace

목록을 탐색하며 선택 대상의 상세와 속성을 처리하는 작업 공간입니다.
`header`는 제품 맥락, `listHeader`는 검색·필터, `list`는 반복 목록,
`detailHeader`는 선택 대상과 주요 조작, `detail`은 본문, `properties`는 보조 속성입니다.
각 영역은 독립 스크롤하며 데이터·선택·편집은 주입된 정본 모듈을 사용합니다.
공통 `design-system.css`를 import합니다.

## 폭과 정보 밀도

목록은 탐색용 제목·짧은 요약·보조 맥락, 상세는 선택 대상의 본문과 작업, 속성은 보조 값에 집중합니다. 상세에 가장 넓은 영역을 주며 목록 요약은 기존 body/caption, 상세 본문은 기존 content-body 토큰을 사용합니다. 새로운 크기·간격·표면 토큰이나 density variant를 만들지 않습니다.

목록 외곽 8px와 행 내부 8px를 합쳐 검색 영역의 16px 시작선과 맞춥니다. 상세 제목과 본문은 같은 32px 시작선, 속성은 16px 내부 여백을 사용합니다. 연속 내용은 관련 간격으로, 독립 작업 섹션은 32px로 구분하며 빈 상태마다 카드·큰 제목을 반복하지 않습니다. margin 없이 소유 부모의 gap/padding으로 배치합니다.

[제품 조합 Usage](../../../site/src/routes/ui-primitives-catalog/ProductWorkflowSpecimen.tsx) · `/demo/ui-primitives#design-system-product-workflow`. Usage는 실제 검색·선택·속성 편집·브리핑·메모를 조합하고 영역 배치와 밀도는 정본 CSS가 소유합니다.

[실제 Usage](/applications/ui-builder?example=issues&new=1)

본문의읽기/편집은공개 `EditableText`를사용합니다. 현재레코드identity와value를함께주입해같은본문을가진다른레코드로선택을바꿔도draft를격리합니다.

목록 SelectableItem에서Enter는선택후상세header로focus를옮기고,상세에서Escape는선택한목록item으로복귀합니다.폼과dialog의Escape는가로채지않습니다.

`hasSelection=false`는상세입력·속성을숨기고목록선택안내를표시합니다. 빌더의`record-workspace.props.tableId`가선택테이블을지정합니다.

모바일에서는이슈선택후상세로focus/scroll을옮기고상세header의목록으로명령으로선택한행에복귀합니다. 목록과상세를찾기위해사용자가긴페이지를헤매지않게합니다.


## 읽기 대상과 보조 작업

작업의 중심이 요청에서 결과로 바뀌면 동일한 detailHeader/detail 슬롯의 내용을 교체합니다. 중요한 읽기 제목은 `PageHeader.titleRole="primary"`, 보조 컨텍스트는 identifier/description에 매핑합니다. properties는 필요할 때 주입하고, 실제 결과·초안·이력의 수명과 전환은 데이터 소유자가 결정합니다. 이 구조가 임의의 workflow 상태나 저장 동작을 만들지는 않습니다.
