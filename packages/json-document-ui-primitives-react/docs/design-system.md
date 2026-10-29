# 공통 디자인 시스템

먼저 [데이터 의미·스키마 역할·읽기/쓰기 매핑](data-presentation.md)을 선택합니다.
입력 가능한 데이터도 기본은 읽기 표현이며 편집 상태에서만 입력 컨트롤을 표시합니다.
토큰과 컴포넌트 스타일은 그 표현을 일관되게 만드는 다음 단계입니다.

SaaS의 보편적인 어포던스를 같은 기본 토큰으로 표현한다. 한 입력의 레이블·도움말·오류는
[FormField](form-fields.md), 현재 열어 본 대상·일괄 선택·행별 명령은
[IssueRow](record-presentation.md), 속성 값에 연결된 변경 명령은
[RecordFacts](record-affordances.md)가 소유한다. 새 시각 변형 없이 역할과 실제 상태를 구별한다.

반복되는 선택 목록의 제목과 요약은 `contentPresentation.itemTitle`(기존 16px
title 토큰)과 `itemSummary`(기존 14px body 토큰)를 사용한다. 섹션 heading과
장문 body의 콘텐츠 위계를 목록 항목마다 반복하지 않는다. 실제 목록 선택은
`SelectableItem`에 맡긴다. [카탈로그 Usage](/demo/ui-primitives)의 콘텐츠 위계
예시와 UI Builder의 record-list feed가 같은 공개 recipe를 소비한다.

```tsx
import { Command, Field, contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/design-system.css";

<section className={contentPresentation.group}>
  <h2 className={contentPresentation.heading}>업무 요약</h2>
  <p className={contentPresentation.body}>목적과 다음 행동을 읽는 데 필요한 내용입니다.</p>
  <p className={contentPresentation.caption}>방금 저장됨</p>
  <Command kind="primary">계속</Command>
</section>;
```

`design-system.css`는 `design-tokens.css`를 포함한다. 사이트와 Hands는 이 공개 CSS를 한 번 import한다. Tailwind가 없어도 Command·Toggle·Choice·Field·Check·Tabs·Disclosure와 콘텐츠의 최소 표현이 동작한다. 제품은 배치·간격·폭을 조합하며 별도 글꼴·곡률·컨트롤 표현을 덧씌우지 않는다.

| 역할 | 토큰 | 기본값 |
| --- | --- | --- |
| 공통 글꼴 | `--font-family-ui` | 한글을 포함한 시스템 sans-serif |
| 조작 UI 제목 | `--font-size-title`, `--font-weight-emphasis` | 16px / 600 |
| 조작 UI 텍스트 | `--font-size-body`, `--font-weight-normal` | 14px / 400 |
| 보조 정보 | `--font-size-caption` | 12px |
| 컨트롤·표면 곡률 | `--radius-control`, `--radius-surface` | 10px |
| 컨트롤·아이콘 높이 | `--control-height`, `--control-icon-size` | 36px / 32px |

`contentPresentation`은 콘텐츠용 title/heading/value/body/caption/group/list/divider의 공개 class recipe다. 조작 UI의 12/14/16px 제한을 콘텐츠에 적용하지 않는다. 기존 빌더의 제목 40px, 섹션 제목 20px, 본문 16px, 주요 수치 40px를 각각 `--font-size-content-title`, `--font-size-content-heading`, `--font-size-content-body`, `--font-size-content-value`로 소유한다. 같은 글꼴을 쓰면서 읽는 위계와 조작 규칙은 구분한다. 시맨틱 HTML에 조합하며 콘텐츠를 코드나 HTML 문자열로 해석하지 않는다. group은 기존 8px 간격을 제공하고 직접 포함한 Command는 내용 너비에 맞춘다. 카드라는 이유로 배경·테두리·그림자를 추가하지 않는다. 목록의 선택에는 같은 `SelectableItem`을 사용한다.

`fieldPresentation.standard` / `.seamless`는 React Hook Form 등 native input/select의 기존 연결을 유지하면서 Field와 같은 스타일을 사용하는 공개 recipe다. [React Hook Form Usage](/connectors/react-hook-form)가 직접 소비한다. `Command.controlRef`는 메뉴처럼 포커스를 반환해야 하는 합성 컨트롤이 실제 버튼을 참조할 수 있게 한다. Popover와 Menu의 트리거도 Command를 사용한다.

같은 14px 글자, 36px 높이, 10px 곡률을 기본 조작에 사용한다. 중요한 실행은 primary의 채운 표면, 기본 텍스트 명령은 secondary의 얇은 경계, 아이콘 명령은 테두리 없는 표현, 위험한 실행은 danger를 사용한다. 눌림은 기존 `--scale-control-pressed`에 반응한다. 입력은 옅은 작업 영역이고 포커스 시 밝아진다. Search는 공통 돋보기로 검색 입력임을 표시한다. Tabs는 공통 기준선과 선택 밑줄로 화면 전환을 표시한다. inline Choice는 track의 내부 여백까지 포함한 외곽 높이를 공통 `--control-height`에 맞추어 선택된 segment를 보여주고, popup Choice는 펼침 chevron과 선택된 항목의 check를 제공한다. 아이콘은 기존 lucide-react의 16px 표현을 사용한다. 추가 크기·색·곡률 토큰이나 소비자별 스타일을 만들지 않는다. 선택·포커스·disabled 상태는 유지한다. Floating 툴바와 패널은 기존 `floatingSurface`를 사용하며 실제 overlay에만 elevation을 적용한다. 입력 경계, 표의 행·열 경계처럼 필요한 경계는 보존한다.

고양이 일러스트는 사이트의 시각적 개성으로 보존하며 컨트롤 최소화 대상에 포함하지 않는다. 사이트의 공통 `PageHeader`가 이미지와 소개 문구의 배치를 소유한다.

UI 빌더의 과거 soft/bold 디자인 ID는 읽을 때 clean으로 정규화한다. 컴포넌트·데이터·바인딩·좌표는 유지한다. 장식 테마는 선택지로 제공하지 않는다.

Usage와 Source는 [UI Primitives 카탈로그](/demo/ui-primitives)와 [UI Builder](/applications/ui-builder)에서 확인한다.

```live-demo
/demo/ui-primitives
```

Toolbar·ToolbarLayout·ToolbarRegion·ToolbarGroup의 기본 정렬과 간격은 이 공개 CSS가 소유한다. Floating Toolbar는 기본 4px inset으로 내부 focus 공간을 확보한다. Host는 배치·폭과 필요한 간격 utility를 조합하며 기본 레이아웃은 override 가능한 기본 스타일에 있다. 일반 조작과 Field의 상하 패딩은 공통 높이·줄 높이·1px 경계에서 계산하며, 경계 없는 탭과 선택 행은 해당 경계를 제외해 계산한다. 새로운 크기 선택지나 토큰을 만들지 않는다.

보조 글자 토큰은 RGB111/107/100을 사용합니다. 작은 보조 정보가 흰 canvas뿐
아니라 warm 선택 배경에서도 읽히도록 대비를 유지하며, 다른 muted 변형은 만들지 않습니다.

## 간격: 세 관계만 사용

| 관계 | CSS 토큰 | Tailwind | 값 | 용도 |
|---|---|---|---|---|
| 관련 요소 | --space-related | gap-related | 8px | 라벨·값, 제목·설명, 같은 작업 요소 |
| 작업 그룹 | --space-group | gap-group / p-group | 16px | 입력·실행·결과·메모 구분, 표면 inset |
| 영역 구분 | --space-region | gap-region | 32px | 페이지·카탈로그의 주요 영역 |

간격 종류와 중간 값을 추가하지 않는다. 기존 page-inline/page-inline-wide는
각각 group/region의 호환 alias이다. 컨트롤의 36px 높이·12px 좌우 inset·선택 track
등 고유 조작 치수는 이 레이아웃 간격과 구분하고 기존 규칙을 유지한다.

부모는 자식 사이 gap을, 표면은 내부 inset을 소유한다. 같은 경계에 부모 padding과
자식 padding을 겹치지 않는다. 문단의 기본 margin으로 gap을 중복하지 않는다.
RecordWorkspace의 상세는 group, 카드 내부는 related, 카탈로그 영역은 region을
사용한다. RecordWorkspace 속성 pane이 inset을 제공하면 nested Inspector는 추가
inset을 만들지 않는다. [Tokens Usage](/demo/ui-primitives#design-system-tokens).

### 간격 소유권

컴포넌트는 바깥 margin을 만들지 않는다. 가장 가까운 공통 부모가 `gap`으로
자식 사이 관계를 소유하고, 실제 표면의 소유자만 `padding`을 둔다. 제목·설명,
라벨·값, 읽기·쓰기 예시는 관련 그룹(8px), 별도 작업 그룹은 16px,
독립 영역은 32px이다. PageFrame은 페이지 영역의 간격과 중앙 정렬을,
PageHeader는 내부 제목·설명의 간격을 소유한다. 자식에서 이를 보정하지 않는다.

오버레이는 앵커 좌표, 말풍선은 Flex/Grid 정렬을 사용한다. 빌더는 제목·맥락을
실제 읽기 그룹으로 묶어 gap을 적용한다. 음수 margin으로 형제 간격을 상쇄하지 않는다.
브라우저 기본 margin의 0 reset은 배치 간격을 만드는 용도가 아니다.

SidebarNavigation은 각 그룹의 레이블과 목록을 정본의 group 영역으로
묶어 8px gap을 제공한다. 탐색 그룹끼리는 16px이며 레이블에 margin을 두지 않는다.

### 레이블 관계의 간격 소유권

`ProductInspector`는 attached/floating 모두 header·body·footer 사이를 `group`(16px)으로 분리합니다. `ActivityFeed`의 각 entry는 heading·detail 관계를 `contentPresentation.group`의 `related`(8px)로 표현하고, entry 사이에는 `group`(16px)을 유지합니다. 자식 margin으로 간격을 보정하지 않습니다.

## 수량과 금액 읽기

```tsx
import { QuantityDisplay, MoneyDisplay } from "@interactive-os/json-document-ui-primitives-react";
<QuantityDisplay value={0} unit="개" />;
<MoneyDisplay value={12500} currency="KRW" />;
```

두 API는 `value: number | null | undefined`, `locale?`, `emptyLabel?`와 span의 HTML 속성을 받는다. `QuantityDisplay`의 `unit`, `MoneyDisplay`의 `currency`는 필수이며 도메인이 제공한다. 0은 실제 값, null·undefined·비유한 숫자는 미정이다. 통화를 코드로 표시해 동일 기호를 쓰는 통화의 혼동을 줄인다. 환전·저장 정밀도 변경·금액 입력·권한 검증은 담당하지 않는다. 금액은 해당 통화의 주 단위로 전달하며 minor-unit 정수의 변환은 도메인 책임이다. 숫자 식별자나 근거 없는 KPI에 사용하지 않는다.

Usage: `/demo/ui-primitives?data=quantity#design-system-data-presentation`, `/demo/ui-primitives?data=money#design-system-data-presentation`. Source는 `numeric-presentation.tsx`이며 빌더에서는 `quantity-display`·`money-display`를 등록 카탈로그에서 선택한다. `detail`에 값, props에 실제 단위·통화를 전달한다. 쓰기 표현은 기존 ValueInput 또는 도메인 검증을 연결한 Field다.

## 카탈로그의 구성 순서

사이트 카탈로그는 작은 구성 요소에서 제품 조합으로 탐색합니다. 상위 단계 선택은 기존 Choice, 단계 내부 탐색은 기존 Tabs를 사용합니다. 콘텐츠와 컨트롤은 같은 토큰에서 출발하지만 서로 다른 책임의 가지이며, 둘을 레코드와 제품 화면에서 조합합니다. 이는 탐색 구조이며 모든 컴포넌트가 앞 단계 전체에 의존한다는 뜻이 아닙니다.

| 단계 | 작은 것부터의 하위 순서 |
| --- | --- |
| 기초 | 토큰 → 로딩·진행 |
| 콘텐츠 | 데이터 표현 → 날짜·시간 → 콘텐츠 구조 |
| 컨트롤 | 입력·선택 → 직접 조작 → 플로팅 도구 → 오버레이 |
| 조합 | 레코드 조합 → 도메인 카드 → 작업 공간 → 제품 조합 |

기본 진입은 토큰입니다. 기존 section hash와 data 쿼리는 유지하며 상세 링크로 들어오면 해당 상위 단계와 하위 탭을 선택합니다. 범주와 순서는 UiPrimitivesCatalogRoute의 catalogGroups가 한 곳에서 소유합니다. Chrome에서 네 단계 전환, 각 하위 순서, 제품 조합 상세 링크와 스크린샷을 확인했습니다. 이번 변경은 탐색 구조에 한정하며 인디케이터 확장은 포함하지 않습니다.

## 사이트도 같은 정본 사용

사이트는 `contentPresentation`의 UI 항목 제목·요약·캡션과 콘텐츠 제목·본문을
역할에 맞게 소비합니다. 별도 ui.text, ui.field, ui.nav, ui.surface, ui.state 사본은 두지 않습니다.
폼 라이브러리·contenteditable·native cell lease는 기존 이벤트와 ref를 보존하면서
`fieldPresentation.standard` / `seamless` / `checkbox`를 소비합니다.

목록 행은 `SelectableItem.presentation="row"`, 표·인용·이미지는 contentPresentation,
떠 있는 메뉴와 선택 목록은 floatingSurface.panel을 사용합니다. 실제 editor의 좌표·셀
크기·데이터 모델은 각각의 소유 모듈에 남습니다. 같은 책임을 합치면서 콘텐츠와
컨트롤의 책임까지 합치지 않습니다. [페이지와 탐색 API](page-navigation.md).

`contentPresentation.focus`는 native listbox/grid/contenteditable 통합의 keyboard focus 표현입니다. 편집 모델과 키보드 명령을 소유하지 않으며 사이트 전용 focus 사본을 대체합니다.

표 viewport는 좁은 화면에서 열을 28rem 아래로 압축하지 않고 내부 가로 스크롤을 제공합니다. 문서 목차처럼 이동하는 링크는 부모에서 한 줄·축소 금지 배치를 정하며 읽기 캡션의 줄바꿈을 링크에 강제하지 않습니다.
