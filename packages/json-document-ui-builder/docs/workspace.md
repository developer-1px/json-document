# UI Builder Workspace

`UIBuilderWorkspace`는 상단의 실행·화면·데이터·액션·스킬 탭을 제공한다.
실행·편집에서 동일한 `UIBuilderRuntimeHand`를 유지하고 Canvas의 `CanvasHand`와 `DatabaseHand`를 조합하며, 모든 확정된 변경을
Editing의 `applyUIBuilderMaterials`와 Object history에 저장한다.
Host는 저장소, 생성기, 채팅 연결을 주입한다.

```tsx
import { createUIBuilderEditor, createUIBuilderMaterialTools } from "@interactive-os/json-document-editing";
import { UIBuilderWorkspace, createFakerSampleGenerator } from "@interactive-os/json-document-ui-builder";
import "@interactive-os/json-document-ui-builder/ui-builder-workspace.css";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "@interactive-os/json-document-canvas/ui-builder.css";
import "@interactive-os/json-document-database/styles.css";

const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 900, objects: []});
const generateSamples = createFakerSampleGenerator();
const tools = createUIBuilderMaterialTools(editor, generateSamples);
<UIBuilderWorkspace editor={editor} generateSamples={generateSamples} />;
```

## 데이터

테이블 이름과 필드를 정의한 뒤 예시 행을 추가한다. 텍스트 필드는 이름·이메일·회사·상품·문장·날짜·URL 또는 자동 추론을 선택한다.
숫자·참/거짓·선택 값은 해당 타입을 따른다. 선택 값은 스키마에 등록된 옵션 ID다.
Faker는 인스턴스별 한국어 → 영어 → base 로케일을 사용한다. 일부 데이터는 영어다.
선택적 seed는 재현 가능한 예시를 만들며 다른 인스턴스에 영향을 주지 않는다.
날짜 예시는 2026년 범위다. 생성 결과는 실제 연결 데이터가 아니다.

추가 생성은 기존 행을 보존한다. 전체 재생성은 명시적 확인 뒤 기존 행을 교체한다.
직접 셀을 편집하거나 빈 행을 추가할 수 있다. 스키마 변경은 호환되는 필드 ID의 값을 유지하고,
새 필드·호환되지 않는 타입은 Database 기본값으로 채운다. 스키마 변경 시 보기 설정은 전체 보기로 초기화한다.
한 테이블은 50필드·1,000행까지다. 삭제·재생성도 실행 취소할 수 있다.

## 액션·스킬

이름·설명과 입력·출력 계약을 등록하고, 주입된 스킬·대상 테이블·읽고 쓸 필드·필수 입력을 연결한다. 실행 탭의 버튼은 이 계약을 사용한다. 서버 인증이나 실제 Jira 연결은 Host port의 책임이다.

## Usage와 Source

아래 application은 공개 API를 소비한다. Source에서 Host 구성과 정본 구현을 확인할 수 있다.

```live-demo
/applications/ui-builder
```

## 자유 배치와 실행

실행 → 화면 전환은 현재 페이지, 선택 행, 입력과 실행 결과, 요소의 실제 위치·크기,
스크롤을 유지한다. 별도 편집 화면을 만들지 않는다. 현재 DOM 박스를 문서 좌표로
측정하고 같은 콘텐츠 위에 `CanvasHand.screenOverlay`를 붙인다. 선택, 멀티 선택,
marquee, 드래그, resize, 키보드, clipboard와 history는 기존 Canvas 도구를 소비한다.
HTML 콘텐츠는 `UIScreenEditLayer`가 Canvas의 gesture preview를 transform으로 표시한다.
데이터·액션 탭 왕복에서도 진행 중인 화면 편집 초안을 보존한다.

화면 편집 후 실행 탭 또는 `정리하고 실행`을 누르면 Host가 주입한
`arrange(signal, {pageId, selection})`이 현재 표시 페이지와 선택 행을 기준으로 AI 정돈을
수행한다. 좌표·크기는 사용자 의도를 전달하는 초안이며 겹침을 허용한다. AI는 모든
요소의 행·열·순서·hug/fill을 정돈한다. 성공한 배치만 한 번 적용하고 실행으로 돌아간다.
취소·실패·정돈 중 문서 변경 시 초안에 남으며 부분 적용하지 않는다. 데이터, 입력,
결과, 연결은 변경하지 않는다. 예제 Host는 staging editor에서 AI 도구를 실행한다.

`UIBuilderRuntimeHand`는 `editable`, `pageId`, `onPageChange`로 실행/편집과 표시 페이지를
제어할 수 있다. 실행과 편집 모두 같은 `UIComponentSurface` 및 선택 행 projection을
소비하며, 편집 시 실제 액션/입력은 inert이고 Canvas 도구만 입력을 받는다.


## 로컬 페이지와 도메인 실험

화면 탭의 페이지 팝오버에서 새 페이지를 추가하고 이름을 바꾼다. 컴포넌트 추가의
`페이지 이동`을 배치한 뒤 내용 편집에서 이동할 페이지를 고른다. 페이지 생성은
새 페이지를 편집 대상으로 선택하며 기존 페이지의 컴포넌트와 데이터는 보존한다.
실행 중 page-link 이동은 같은 레코드 선택과 데이터를 유지한다. 편집 페이지 변경은
새 실행 시작 페이지에 반영된다. 페이지·컴포넌트·바인딩·데이터는 IndexedDB 자동 저장과
JSON 백업에 함께 포함된다. 초기 예제가 갱신돼도 기존 저장 문서를 덮어쓰지 않는다.

브리핑 외에 서로 다른 데이터 관계를 가진 로컬 MOCK을 제공한다. 각 URL은 별도
저장 키와 대화 기록을 사용한다. 처음에는 데이터만 있으며 에이전트에게 사용자
과업을 설명해 화면을 만든다. 실제 고객·결제·상품 시스템에 연결하지 않는다.

- [브리핑 두 페이지 새 실험](/applications/ui-builder?example=briefing-pages): 기존 브리핑 보관본과 독립된 저장 공간
- [고객 문의 MOCK](/applications/ui-builder?example=support): 상태·우선순위·긴 문의 제목·빈 답변
- [상품 재고 MOCK](/applications/ui-builder?example=inventory): 재고 0/7/128·단가(원)·긴 상품명·빈 메모

목록의 `items/list` 바인딩은 행 선택을 제공하고, 입력의 `value/value` 바인딩은
선택한 행에 즉시 저장한다. 이 동작에는 별도 스킬이나 저장 버튼이 필요 없다.
생성 결과와 실제 실행 검증은 구분한다. 여러 필드의 한 행 비교와 목록 검색·필터는
현재 빌더 등록 계약의 공백이다. 자세한 관찰은 [도메인 UT](domain-experiments.md)를 참고한다.


## 전체 등록 카탈로그와 문서 딥링크

88종의 등록 항목은 `uiComponentCatalog`의 category/source/mapping/propertySchema를 공유한다.
컴포넌트 추가 팝오버에서 이름·과업을 검색하고 콘텐츠·데이터, 입력·행동, 작업 공간·오버레이,
날짜·일정, 대기·상태 범주로 선택한다. 에이전트도 `read_ui_builder_component_catalog`로 같은
목록과 조합 지침을 읽는다. 내부 컴포넌트와 승인된 props, 테이블·필드는 연결 팝오버의
컴포넌트 구성에서 변경한다. 코드·CSS·임의 속성은 입력하지 않는다.

전체 Usage는 `/applications/ui-builder?example=catalog&new=1`이다. 5개의 페이지에 실제
상품 데이터 비교표, 여러 필드 레코드 목록, 검색 대상, 날짜·일정 데이터와 조합·대기 표현을
공개 API로 구성한다. 새 생성에는 `project` ID가 부여되고 이후 그 ID의 로컬 보관본을 연다.

`resolveUIBuilderProjectLocation(url, createId)`는 `project`/`page`/`example`을 해석하고
문서별 로컬 저장 키와 정규 URL을 반환한다. `new=1`은 새 ID를 생성한 뒤 URL에서 제거한다.
`uiBuilderPageLink(url, pageId)`는 같은 문서의 페이지 링크를 만든다.
`newUIBuilderProjectLink(url, example?)`는 현재 문서를 보존하고 새 문서를 만드는 링크다.
초기 예제 종류는 저장 ID와 구분하며 과거 예제 저장 키는 legacy ID로 유지한다.
URL을 공유해도 데이터가 업로드되지는 않는다. 다른 기기에서 같은 내용을 열려면 JSON 백업을 옮긴다.

`UIBuilderWorkspace`의 선택적 `pageId`/`onPageChange`로 URL의 표시 페이지를 제어한다.
새 문서 버튼은 항상 별도 ID를 만들며 페이지 이동은 URL에 반영된다.

## 업무 브리핑 스튜디오

[새 업무 작업실](/applications/ui-builder?example=briefing-studio&new=1)은 기존 브리핑
문서를 유지하면서 별도의 문서를 생성한다. 표의 업무 번호·제목·상태·우선순위·마감일을
같은 행으로 비교하고, 제목 검색과 상태 필터로 대상을 좁힌다. 행 선택은 업무 상세,
마감일 DatePicker, 메모 입력과 실행 액션에 공유된다. 브리핑 → 처리 방향 선택 → MOCK
결과 생성 → 결과 페이지 → 완료 표시로 사용한다. 기존 UI Primitives, Database, Calendar와
Editing 공개 API를 조합하며 전용 Host 렌더러·스타일은 추가하지 않는다.

## 이슈 관리·업무 피드

[새 팀 워크스페이스](/applications/ui-builder?example=issue-feed&new=1)는 업무 피드와 선택 이슈 상세,
처리 결과 페이지를 정본 컴포넌트로 조합한다. `record-list`의 `presentation: "feed"`는
제목·요약·메타 정보를 같은 레코드에 묶어 보여준다. 제목 검색과 상태 필터는 Database
projection을 소비하고, 선택 이슈의 상태·기한·메모는 같은 테이블에 저장된다.
기존 MOCK 스킬을 주입하고 제품 정책으로 대기→진행→검토→완료 용어를 사용한다.
피드에서 다른 이슈를 골라도 결과와 메모는 해당 레코드에 보존된다. Host는 fixture·제품
문구·공개 API 조합만 소유하며 별도 이슈 모델이나 renderer·CSS는 추가하지 않는다.

중첩 조합의 화면 편집은 렌더된 `data-ui-child` 영역도 실측한다.
자식 역시 정본 UIScreenEditLayer로 투영하고, 표시된 실측 영역만 Canvas 선택 대상으로
전달해 닫힌 overlay의 자식에 저장 예제 좌표로 선택 영역을 만들지 않는다.
전체 카탈로그의 콘텐츠 그룹에서 자식 실행 영역과 편집 hit 영역의 좌표·크기가
동일하고 방향키 이동이 HTML에 반영되는 것을 Chrome에서 확인했다.
부모와 자식의 동시 선택 이동, 여러 단계의 중첩·overlay는 추가 검증이 필요하다.

## 상단 작업 구성

상단은 프로젝트(`navigation` slot), 작업 모드, 현재 페이지·저장 상태(`status` slot)로
구분합니다. 디자인·데이터·액션·스킬·미리보기는 같은 workspace의 보기입니다.
디자인 변경 반영은 `반영하고 미리보기`에서 기존 AI 정리 계약을 실행합니다.
미리보기의 페이지 선택은 `onPageChange`로 표시 페이지만 변경하며 시작 페이지를
저장하는 authoring 명령과 구분합니다. 좁은 화면에서는 상단을 콘텐츠 흐름에 놓습니다.
[UI Builder Usage](/applications/ui-builder?example=issue-feed)에서 프로젝트 메뉴와
페이지·저장 팝오버를 열고 작업 모드를 전환할 수 있습니다.

Runtime의 action command는 공개 `resolveUIBuilderActionPrerequisites`로 필수 입력을 판정한다. 조건 미충족 명령은 비활성화하며 title 및 aria-description으로 이유를 전달한다. 데이터가 변경되면 재평가한다. 업무 피드에서 빈 briefing 상태의 결과 작성 비활성화와 브리핑 생성 후 활성화를 Chrome으로 확인했다.

AI 정리는 staging 문서의 top-level flow와 변경된 childOrders를 함께 읽어
`applyUIBuilderConfiguration`으로 한 번에 반영한다. 취소·실패·원본 문서 변경 시
실제 문서에 부분적으로 자식 순서를 적용하지 않는다. UIBuilderApplication Usage와
등록된 layout/configuration 도구가 같은 공개 계약을 소비한다.

자동 흐름의 작업 영역은 저장된 문서 폭을 유지하면서 넓은 viewport에서 가운데에 놓습니다.
타이틀 바로 뒤의 caption, caption 바로 뒤의 heading/card는8px companion 간격을
사용하고 다른 요소의 기존24px 간격을 유지합니다. 저장 flow나 좌표는 변경하지 않습니다.

미리보기는 canonical projection의 `selectionMissing` 상세 요소를 숨기고
해당 열에서 선택 안내를 제공합니다. 디자인 모드에서는 편집 가능하도록 보존합니다.

Workspace는 runtimeValues를 selection과 함께 소유하고 RuntimeHand의 controlled
`runtimeValues`/`onRuntimeValuesChange` API로 연결한다. 단독 RuntimeHand는 local
상태를 사용할 수 있다. AI arrange context에도 runtimeValues를 전달해 실행 중 검색·
필터와 같은 투영을 읽으며 문서 데이터나 history로 임시 입력을 복제하지 않는다.

화면 편집 overlay의 폭은 렌더된 문서 작업면의 폭을 따릅니다. 바깥 viewport 폭을
대신 사용하면 가운데 정렬된 작업면에서 가로 overflow가 생기고 키보드 포커스가
작업면을 스크롤할 수 있으므로 둘을 구분합니다.

편집 중 정본 flow 또는 조합 자식 참조가 변경되면 이전 실측 footprint를 새
배치에 적용하지 않는다. Runtime은 새 구조를 자연 크기로 렌더한 뒤 실측 origin과
문서 geometry를 함께 갱신한다. 수동 좌표 이동은 이 구조 변경 signature에
포함하지 않아 드래그 도중 매번 원점을 다시 측정하지 않는다. 실제 업무 피드에서
AI 순서 변경 후 그룹 폭이 이전 1376px로 남던 문제를 재현했고 재측정 뒤
오른쪽 열 폭 806.3984375px에 맞는 것을 확인했다.
