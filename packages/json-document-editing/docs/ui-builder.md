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
기존 soft/bold 디자인 값은 clean으로 정규화하며 문서 내용은 보존한다.
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

`createUIBuilderCatalogTools`로 같은 카탈로그와 설정 명령을 AI에 제공한다. `createUIBuilderLayoutTools`는 전용 읽기와 `arrange_ui_builder`만 제공한다. AI가 자유 배치 좌표와 콘텐츠를 읽고 `UIFlowLayout`을 반영한다. 현재 페이지의 요소를 모두 한 번씩 포함해야 하며 중복/누락 ID·잘못된 열 비율·stale 요청을 거부한다. 편집 좌표, 크기, 콘텐츠와 바인딩은 보존한다. 한 세션의 성공한 반영은 한 번이며 undo 한 번으로 돌아간다.

실행 화면은 실제 Grid/Flex 흐름을 사용한다. `size: "hug"`는 내용 너비, `"fill"`은 열 너비를 따른다. 높이는 모두 내용에 맞춰 늘어나고 뒤쪽 요소를 밀어낸다. 수동으로 정한 편집 높이를 실행 화면의 고정 높이로 사용하지 않는다. flow는 프로젝트와 함께 저장된다.

## 실행

`UIBuilderAction.execution`은 skill, tableId, prompt, inputFieldIds, outputFieldIds, requiredFieldIds를 저장한다. 실행 구현은 문서에 넣지 않는다. Host가 `UIBuilderSkillDefinition[]`으로 실제 또는 MOCK port를 주입한다. `createUIBuilderActionTools`는 가능한 스킬을 읽고 기존 액션에 연결한다. AI 설정 도구 자체는 업무 스킬을 실행하지 않는다.

`executeUIBuilderAction(editor, actionId, skills, selection?, signal?)`은 선택 행의 명시한 필드만 복사해 스킬에 전달한다. 필수값, 취소, 실행 중 문서 변경, 출력 필드/타입을 검사한 다음 결과를 같은 행에 원자적으로 저장한다. 실패·취소 결과는 문서를 바꾸지 않는다. `setUIBuilderInput`은 컴포넌트의 value 바인딩으로 같은 데이터 행을 편집한다. 스킬의 외부 부수효과는 undo 대상이 아니므로 Host는 실행 권한과 실제 연결의 동작을 책임져야 한다. 예제 스킬은 외부 부수효과가 없다.

## 페이지와 이동 버튼

`readUIBuilderProject`는 canvas-only 문서를 `pages: [{ id: "page:main", name: "홈" }]`와
`activePageId`로 정규화한다. `UIBuilderProject.pages`는 이름과 안정적인 ID 목록이며,
`activePageId`는 편집 페이지이자 실행 시작 페이지다. 런타임의 페이지 이동은 저장된
시작 페이지를 변경하지 않는다. 기존 컴포넌트의 `document.pageId` 생략은 첫 페이지
소속이다. 데이터·액션·디자인·flow는 프로젝트 전체에서 공유한다.

`getUIBuilderPageObjects(project, pageId?)`는 지정 페이지(기본 편집 페이지)의 객체를
반환한다. `resolveUIBuilderPageId(project, pageId?)`는 명시 ID 또는 첫 페이지를
확인하며 존재하지 않는 ID는 거부한다. 렌더러는 해당 객체에만 공통 flow를 적용한다.

`applyUIBuilderPages(editor, commands)`는 다음 명령을 한 번의 undo로 적용한다.

- `page.create { id, name }`: 빈 ID를 자동 생성하고 새 페이지를 선택한다.
- `page.rename { id, name }`, `page.select { id }`: 이름과 편집/시작 페이지를 변경한다.
- `page.remove { id, moveToPageId? }`: 마지막 페이지 삭제를 거부한다. 내용이나 들어오는
  이동 링크가 있으면 명시적인 이동 대상이 필수이며 내용과 링크를 함께 옮긴다.
- `component.move { id, pageId }`: 객체의 페이지 소속을 옮긴다.
- `page-link.target { id, targetPageId }`: 페이지 이동 버튼의 목적지를 연결한다.

`createUIBuilderPageTools(editor)`는 `read_ui_builder_pages`와
`apply_ui_builder_page_changes`를 제공한다. 먼저 읽어야 하며 읽은 이후 다른 변경이
있으면 stale 오류를 반환한다. 도구의 삭제 명령에서 `moveToPageId: null`은 이동 없이
빈 페이지를 삭제하는 뜻이다. 실패한 batch는 문서를 변경하지 않는다.
`createUIBuilderTools`의 신규 컴포넌트는 편집 페이지에 생성되며 기존 컴포넌트 갱신은
페이지 소속과 이동 목적지를 보존한다.

실행 스킬의 입력 계약과 진단은 [UI Builder Skills](ui-builder-skills.md)를 참고한다.

페이지별 자동 흐름은 현재 편집 페이지에만 적용하며 다른 페이지의 흐름과 콘텐츠는 보존합니다. `createUIBuilderLayoutTools`는 현재 페이지 ID·이름·컴포넌트만 읽습니다. 에이전트 배치는 콘텐츠 결정, 기존 컴포넌트 매핑, 관련 데이터 그룹핑·배치, 최소 정보성 문구, 섹션 재배치 순서로 판단합니다.

`UIBuilderConfiguration.pageId`로 flow 반영 대상을 지정할 수 있으며 생략하면 현재 편집 페이지를 사용합니다. 시작 페이지를 바꾸지 않고 특정 페이지의 자동 흐름을 반영할 수 있습니다.

## 실행 화면을 유지하는 배치 정돈

자유 편집 좌표·크기는 사용자의 의도를 전달하는 초안이다. 에이전트는 그룹·읽는
순서·강조·상대 비중을 해석하고 기존 디자인 시스템에 맞는 실행 구성을 다시 만든다.
겹침·불규칙한 간격·임의 픽셀 크기를 그대로 실행에 사용하지 않는다.
`read_ui_builder_layout.executionContract`는 이 경계와 보존할 데이터·연결·상태를
명시한다. 실행 정본은 JSON 문서의 `flow`와 기존 조합의 자식 순서이며 렌더러가
이를 실제 Grid/Flex로 표시한다. 임시 transform은 편집 화면에서만 사용한다.

`createUIBuilderLayoutTools(editor, {pageId, selection})`은 현재 표시 페이지 및 선택한 행의
실제 입력·결과를 읽어 AI에 전달한다. `applyUIBuilderConfiguration(editor, {flow, pageId})`는
시작 페이지를 바꾸지 않고 해당 페이지의 배치만 반영한다. 기존 다른 페이지의 flow,
데이터와 연결은 보존한다. 소비자는 정돈을 staging editor에서 수행하고 취소·오류·stale을
확인한 뒤 성공한 flow를 원본에 한 번 적용할 수 있다.

전체 등록·props·내부 조합·다중 필드 매핑은 [컴포넌트 카탈로그 API](ui-builder-component-catalog.md)를 참고합니다.


### 검색 결과와 상세 선택

런타임의 검색·상태 쿼리가 바뀌면 보이는 레코드의 선택을 유지하고, 선택이 범위 밖이면
첫 레코드로 이동한다. 결과가 없으면 `UIBuilderRecordSelection`의 테이블 값은 빈 문자열이다.
선택을 따르는 value 바인딩은 이 명시적인 빈 선택에서 값을 비운다. 고정 recordId 바인딩은
독립된 대상을 유지한다. 런타임은 빈 선택에 연결된 입력을 비활성화한다.

## 도메인 데이터에서 제품 화면 만들기

`read_ui_builder_catalogs`는 `dataPresentations`와 `compositionGuidance`를 반환한다. primitive 타입에 바로 컴포넌트를 연결하지 말고 필드의 도메인 의미, 읽기/쓰기 목적, 실제 binding과 commit 정책을 먼저 결정한다. 비교는 table, 선택한 대상의 처리는 record-workspace + record-list, 서술은 본문과 섹션, 실제 일정은 Calendar 계약을 사용한다. 이 후보는 고정 화면 템플릿이 아니다.

수량은 quantity-display(detail + unit), 금액은 money-display(detail + currency)에 연결한다. 단위와 통화는 스키마의 의미에서 가져오며 식별자를 수량으로, 알 수 없는 값을 0으로 표시하지 않는다.

개인 작성 스킬 `$domain-ui-builder`는 이 정본 계약을 읽는 소비자다. 스킬이 없어도 빌더의 catalog tool이 같은 과업·읽기/쓰기·간격 가이드를 제공한다. Usage와 Source는 `/applications/ui-builder?example=inventory&new=1`에서 schema-only MOCK을 읽고 생성하는 흐름과 `/demo/ui-primitives?data=quantity#design-system-data-presentation`에서 확인한다.

## 화면 한 번 제출

`createUIBuilderScreenTools(editor, {pageId, dataPresentations})`를 **요청 직전에** 만들면 현재 데이터·페이지·컴포넌트 계약을 문맥으로 제공하는 `publish_ui_builder_screen` 하나를 반환한다. 읽기 툴 호출은 필요하지 않다. components의 id를 직접 선언하고 childIds·flow가 그 id를 참조한다. 컬렉션·props·bindings·최종 flow를 같은 계획에 포함한다.

`applyUIBuilderScreen(editor, plan)`은 별도의 정본 editor에서 기존 Materials/Component/Composition/Binding/Flow 검증을 수행한다. 연결 없는 table·record-list·detail-list, 잘못된 참조와 필드, 누락된 최상위 flow는 거절한다. 모두 통과하면 실제 editor에 document.replace를 한 번 dispatch한다. 하나의 Undo로 복구되고 다른 페이지는 유지한다. 실패하면 실제 문서는 변하지 않는다. 이것은 스키마·연결·배치의 완결성 검증이며 시각적 디자인 품질의 자동 판정은 아니다.

```tsx
import {createUIBuilderScreenTools} from "@interactive-os/json-document-editing";
const prepareTools = () => createUIBuilderScreenTools(editor, {pageId});
// 요청마다 prepareTools() 결과를 전달한다. 이전 요청의 tool을 재사용하지 않는다.
```

Usage / Source: `/applications/ui-builder?example=inventory&new=1`. 기존 수동 편집·부분 변경 API는 유지되며 화면 생성 대화에는 한 번 제출하는 도구만 제공한다.

### 실제 확인 범위

재고 schema-only MOCK에 짧은 요청을 보내 publish_ui_builder_screen으로 비교 표·선택 상품 상세·입고 메모를 함께 생성했다. 상품 선택에 따른 상세 변경, 데이터 탭의 Undo 한 번으로 전체 화면 제거, Redo 한 번으로 복구를 Chrome에서 확인했다. 잘못된 value의 이전 요청은 원본 빈 화면을 유지했다. 전체 동작 도메인, 여러 페이지·액션·오류 조합 및 좁은 화면은 이 실험의 직접 검증 범위 밖이다. 자동 product test/typecheck/lint/build는 shared-worktree-dev 계약에 따라 실행하지 않았다. 이 결과는 원자적 제출과 해당 재고 흐름의 확인이며 보편적 첫 시도 디자인 품질의 보장은 아니다.

## 콘텐츠 관계에서 UI 선택

`uiBuilderContentStructure`는 한 화면에 필요한 사실 → 데이터 관계 → 복합 그룹 → 관계를 표현하는 정본 UI와 이유 → 배치·최소 보조 문구 순서의 작성 지침이다. 단일 제출 문맥과 기존 catalog 응답이 같은 정본을 제공한다. JSON의 중첩을 화면 구조로 복사하거나 별도의 계획 트리를 제품 문서에 저장하지 않는다.

여러 레코드의 같은 속성 비교는 table, 한 대상의 정체성·속성은 제목/보조 정보와 속성 목록, 선택과 상세의 관계는 공유 선택 ID, 서술은 읽기 본문, 실제 명령은 입력·결과 연결로 표현한다. 하나의 복합 그룹은 여러 컴포넌트를 사용할 수 있으며 카드나 패널을 필수로 요구하지 않는다. 제목·단위·설명은 없으면 모호한 경우에만 추가한다. Usage는 재고/문의 schema-only 예제의 생성 대화, Source는 ui-builder-screen.ts다.

### 관계 중심 구성의 실제 적용

같은 재고 MOCK을 비교 표 + 선택 상품 정보로 생성하고 선택에 따른 상세 변경을 확인했다. 별도의 문의 MOCK은 목록 + 주 본문/답변 작성 + 보조 속성으로 생성했다. 문의 초안 편집/저장, 다른 문의 선택, 원래 문의로 복귀했을 때 저장한 초안 유지까지 Chrome에서 확인했다.

순서 참조로 목록이 상세에 밀리거나 답변 요소가 여섯 슬롯 밖에서 사라지는 결과를 관찰해 record-workspace의 이름 참조를 적용했다. 목록 제목을 삭제해도 목록/본문/답변이 각 영역을 유지하는 것과 작업 공간 복제 후 두 작업 공간이 렌더되는 것을 확인했다.

이는 두 MOCK 과업의 확인이며 모든 도메인·모바일·오류 조합의 품질 보장은 아니다. 생성된 보조 제목의 중복 같은 시각적 검수 과제는 남아 있다. 제품 자동 검사 대신 공유 실험 계약의 실제 브라우저 흐름을 검증했다.

### 표현 이유를 먼저 확인하는 생성

`uiBuilderContentStructure.beforePublication`은 제출 전에 채팅에 콘텐츠 ASCII 트리와
`그룹 | 사용자 목적 | 등록 UI | 표현 이유 | binding/slot` 표를 보여주도록 안내한다.
추가 승인이나 도구 호출 없이 동일한 판단을 components/bindings/named slots/flow로
옮기고 렌더링 뒤에도 같은 트리와 대조한다. 지침이며 스키마 검증이 의미적 일치를
자동 보장하지는 않는다. 트리는 별도 제품 저장 모델로 만들지 않는다.

### 구조화 지침 성능 관찰 (2026-10-14)

동일한 문의/재고 MOCK 요청을 각각 한 번 재생성해 브라우저로 확인했다.
둘 다 제출 전 ASCII 트리와 목적/표현 이유를 설명했고 생성에 성공했다.
문의는 중복·빈 제목이 없어졌으며 선택한 문의 내용 변경과 답변 저장을 확인했다.
재고는 행 단위 비교·0·원 단위와 선택 상품 상세 연결을 확인했다.
그러나 문의 목록은 fields 표현으로 필드 라벨이 반복되고 화면 전체 폭이 넓었다.
재고 입고 메모는 별도 읽기 영역 대신 속성 그리드에 남았고 빈 값 표현도 약했다.
따라서 구조/연결 개선의 관찰이며 제품 디자인 품질 전체 통과나 통계적 성공률로
해석하지 않는다. 지침에 각 컴포넌트의 자체 제목 계약을 구체적으로 전달했다.
자동 제품 검사는 shared-worktree 실험 범위에 따라 실행하지 않았다.

### 그룹에 맞는 표면 선택 개선

content-surface-choice recipe와 contentStructure.surfaces가 연속 콘텐츠(group),
독립 콘텐츠/과업(card), 대상 탐색(record-list feed), 보조 맥락(product-inspector)의
선택 이유를 제공한다. card.actionCount는 기존 ContentCard.actions에 연결된다.
정본 UI Primitives Content Usage는 같은 MOCK 문의의 네 가지 역할을 비교한다.
전체 빌더 카탈로그의 카드 본문/페이지 이동 footer도 정본 렌더러를 사용한다.

브라우저에서 ContentCard 확인 행동, 빌더 카드 body/footer 자식의 단일 렌더,
footer 페이지 이동/복귀, 동일 문의 요청 재생성 후 feed 선택·답변 저장을 확인했다.
문의 본문/답변은 기존 주 영역에 보존했고 카드로 임의 포장하지 않았다.
문의 생성은 1회 관찰이며 전체 폭·모바일·모든 기존 feed 소비자 회귀와 생성
성공률은 검증하지 않았다. 자동 검사는 shared-worktree 실험에 따라 생략했다.

### 보편 어포던스·경계·상태 단서

도메인별 동일한 카드 골격 대신 메시지+별도 초안, 작업 요약/행, 상품 수치 쌍,
실제 변경 비교, timeline, 결과와 근거 경계를 사용한다. ContentGroup과 group의
relationship는 기존 8/16/32 관계를 소유한다. 같은 대상의 연속 내용은 간격,
독립 대상은 기존 카드, 한 작업의 동등한 단계는 기존 divider로 구분한다.

record-list의 itemKind/priorityFieldId와 unread/completed/overdueFieldId,
record-card의 실제 checkbox 인디케이터와 approval before/after 필드를 전달했다.
상태 이름·아이콘·작은 인디케이터는 서로 다른 의미이며 없는 사실을 만들지 않는다.

브라우저에서 읽음 처리 시 dot 제거, 완료 시 기한 초과 제거, 승인 후 결정 비활성화,
실제 before/after 본문과 근거 Popover를 확인했다. JSON 예제의 답변/읽음/완료를
저장하고 재진입해 복원을 확인했다. 실제 region gap 32px도 확인했다.
카탈로그에 기존 chat-bubble.css를 소비하도록 연결했고 체크·라벨의 기존 행
표현도 복구했다. 모바일·모든 소비자 회귀·AI 재생성 성공률은 이번 범위에서
검증하지 않았다. 자동 제품 검사는 shared-worktree 실험에 따라 생략했다.

자동 흐름의 전체 요소 검증이 실패하면 누락된 최상위 요소의 라벨·ID와 최상위에 놓을 수 없는 중첩 ID를 오류에 포함합니다. 에이전트는 제안한 행·열을 보존하면서 해당 ID만 바로잡아 재시도할 수 있습니다. 커버리지 조건을 완화하거나 누락 요소를 조용히 삭제하지 않습니다.
