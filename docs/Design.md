# Design

이 문서는 제품 UI를 만들고 다듬는 에이전트와 개발자가 따르는 디자인 원칙이다.
새 화면에서도 기존 UI 시스템을 사용하고, 부족한 기능은 정본 모듈을 확장한다.
공통 조작 규칙은 제품 UI와 UI 빌더에 배치하는 버튼·입력·선택 등에 적용한다.
콘텐츠의 제목·본문·수치와 일러스트는 조작 컨트롤과 구분한다. 같은 토큰 체계를
사용하되 역할이 다른 요소까지 같은 크기와 모양으로 만들지 않는다.
사이트의 공통 셸·문서·데모도 이 정본을 소비한다. 화면별 레이아웃과 편집 좌표는
각 소유자가 유지하되 같은 역할의 외형을 사이트에서 다시 정의하지 않는다.
좁은 화면의 메뉴는 동일한 SidebarNavigation을 Popover 안에 조합하고,
데스크톱의 접힌 rail도 SidebarNavigation.collapsed를 사용한다.

## 제품 범위

차분한 macOS 업무 앱의 구성 원리를 참고한 SaaS UI를 목표로 한다. 같은 역할에는
하나의 기본 표현을 사용하고, 읽기·입력·선택·이동·실행과 실제 상태의 차이는
익숙한 어포던스로 구별한다. 색·크기·곡률·간격의 취향별 변형을 늘리지 않는다.
카탈로그는 데이터 표현 → 인디케이터 → 조작 → 레코드와 제품 조합 순서로
구성하며, 같은 책임의 새 외형보다 누락된 의미와 동작 계약을 먼저 보강한다.

## 콘텐츠와 컨트롤

본문은 글과 작업 대상에 집중하도록 비워둔다. 조작은 정해진 floating 컨트롤로
제공한다. Liquid Glass처럼 가볍게 떠 있는 반투명 표면을 지향하되, 화면마다
유리 효과를 새로 구현하지 않는다.

- 자주 쓰는 조작은 작은 floating 툴바에 모은다.
- 파일 목록, 이름 변경, 세부 옵션은 해당 컨트롤의 팝오버에서 펼친다.
- 채팅은 하단 또는 우하단 floating 컴포저에서 시작하고 필요할 때 대화를 펼친다.
- 저장 상태와 오류는 관련 컨트롤 가까이에서 전달한다.
- 파일 경로, 구현 설명, 역할 라벨을 작업 화면에 상시 나열하지 않는다.
- 위치와 크기는 본문 읽기, 선택, 입력을 방해하지 않도록 결정한다.

## 하나의 책임, 하나의 정본

UI Atom이 이미 있는지 먼저 확인한다. 비슷하게 생긴 로컬 컴포넌트를 추가하는
것으로 해결하지 않는다. 같은 역할과 책임이면 같은 공개 API를 소비한다.

```text
필요한 역할 확인
  -> 정본 API 검색
  -> 지원하면 조합
  -> 부족하면 정본 API 확장
  -> 소유 모듈이 없을 때만 새 정본 등록
```

기본 조합은 `Toolbar`, `Popover`, `Command`, `Choice`, `Field` 등
`@interactive-os/json-document-ui-primitives-react`의 Atom을 사용한다.
`Command`의 `label`은 아이콘 표현과 접근성 이름·툴팁을 위한 계약이다.
텍스트 버튼에는 children으로 문구를 전달하며 아이콘 버튼용 표현을 오용하지 않는다.

Floating 표면은 `floatingSurface.control`과 `floatingSurface.panel`,
`floating-surface.css`가 소유한다. Host는 위치·크기·간격·제품 문구와 조합을
소유한다. blur·투명도·테두리·곡률·그림자를 Host나 site 공용 helper에 복제하지 않는다.
키보드, focus, dismiss 같은 재사용 동작도 기존 Primitive를 소비한다.

정본을 확장하면 공개 export, 소유 패키지 문서, API reference, 사이트 Usage와
Source 등록을 함께 갱신한다. Demo도 정본 API를 사용하며 우회 구현을 두지 않는다.

## 적은 표현으로 충분한 의미 전달

요소를 추가하거나 유지하기 전에 다음을 확인한다.

1. 어떤 행동·상태·위계를 전달하는가?
2. 없애면 그 의미를 알 수 없거나 모호해지는가?
3. 다른 요소가 이미 같은 의미를 전달하는가?
4. 간격·정렬·기존 타이포그래피나 Atom으로 더 단순하게 표현할 수 있는가?

단순한 묶음을 위해 카드나 컨테이너를 추가하지 않는다. 실제 경계·조작·상태가
필요할 때만 테두리를 쓴다. 아이콘 버튼은 기본적으로 테두리가 없다.
배경은 의미 있는 표면 구분에, 그림자는 실제 떠 있는 관계를 나타내는 데 쓴다.
텍스트·아이콘·테두리·색·형태로 같은 구분을 반복하지 않는다.
판단이 애매하면 더 단순한 표현부터 사용한다.
고양이 일러스트는 제품의 개성을 담은 기존 시각 요소로 보존한다. 공통화나
장식 최소화를 이유로 제거하지 않는다. 공통 `PageHeader`의 배치 규칙으로
제목·설명과 겹치지 않게 유지하고, 좁은 화면에서도 보이도록 한다.
데모 작업면도 단순한 감싸기용 곡률·그림자를 추가하지 않는다. 펼친 overlay는 별도 elevation을 유지한다.

## 곡률·테두리·그림자

기본 컨트롤은 부드러운 곡률, 낮은 테두리 대비, 넓고 옅은 그림자를 사용한다.
값을 개별 화면에 하드코딩하지 않고 UI Primitives의 `design-tokens.css`와 `design-system.css`를 사용한다.
공통 디자인은 전 페이지에서 반복되는 컨트롤과 상태의 최소 규칙이다.
이 규칙으로 콘텐츠 위계나 고양이 일러스트를 평탄화하지 않는다.
단순한 묶음용 카드 테두리·배경·그림자를 추가하지 않는다. 중요한 실행은 채운 버튼,
기본 텍스트 명령은 얇은 경계, 아이콘 명령은 테두리 없이 표현한다. 입력은 옅은
작업 영역을 사용하고 포커스에 반응한다. 탭은 공통 기준선과 현재 탭의 밑줄,
단일 선택은 연결된 선택 영역, 펼치는 선택은 chevron과 선택된 항목의 check로
표현한다. 크기·색·곡률 변형을 늘리지 않고 역할과 상태로 기존 토큰을 조합한다.

| 역할 | 현재 기준 | 정본 |
| --- | --- | --- |
| 기본 컨트롤 곡률 | 10px | `--radius-control` |
| 일반 표면 곡률 | 10px | `--radius-surface` |
| Floating 툴바 | 알약 형태 | `floatingSurface.control` |
| 약한 테두리 | RGB 232 / 227 / 219 | `--color-border-subtle` |
| 기본 테두리 | RGB 166 / 161 / 152 | `--color-border-default` |
| 기본 표면 그림자 | 가까운 6px + 넓은 56px blur | `--shadow-surface` |
| Overlay 그림자 | 가까운 10px + 넓은 72px blur | `--shadow-overlay` |

테두리 대비를 낮추더라도 keyboard focus와 선택·오류 상태는 알아볼 수 있어야 한다.
그림자의 범위를 키울 때는 진한 윤곽이 생기지 않도록 가까운 그림자를 옅게 유지한다.
위 수치는 현재 기본값이며 변경의 정본은 아래 연결된 토큰 구현이다.

## 콘텐츠 비례와 패딩

콘텐츠와 레이아웃의 간격은 `related` 8px, `group` 16px, `region` 32px 세 가지로
제한한다. 새 단계나 화면별 간격 토큰을 추가하지 않는다. 관련 라벨·값·조작은
8px, 콘텐츠 묶음·표면 inset은 16px, 독립 섹션·페이지 여백은 32px을 사용한다.
상하·좌우를 일괄 같은 값으로 만들지 않고 관계에 따라 이 세 값에서 선택한다.
레이아웃에 margin을 사용하지 않는다. 요소 사이의 간격은 가장 가까운 공통 부모의
gap으로, 실제 표면의 내부 여백은 소유자의 padding으로 한 번만 표현한다.
중앙 정렬은 Grid/Flex 정렬로, 오버레이 간격은 앵커 좌표로 표현한다.
브라우저 기본 margin을 0으로 초기화하는 reset은 간격을 만드는 용도가 아니다.
컨트롤 내부 치수는 이 간격 체계와 구분한다. 한 줄 조작은 36px,
아이콘 조작은 32px을 사용한다. 텍스트 조작의 좌우 inset은 12px이며 상하 inset은
20px 줄 높이와 경계를 포함해 외곽 36px이 되도록 정한다. 선택 track의 여백도
이 외곽 높이에 포함한다. 여러 줄 콘텐츠는 높이를 고정하지 않고 Hug한다.

조합 표면은 16px inset을 한 겹 사용한다. 작은 관련 조합은 8px을 사용한다. 부모와 자식의
패딩이 겹쳐 의미 없는 빈 공간을 만들지 않는지 확인한다. 라벨·값·설명·조작은
같은 그룹으로 읽히도록 정렬하고, 아이콘의 중심은 관련 글자와 컨트롤 중심에
맞춘다. 날짜 선택 칸은 1:1이고 공통 높이를 기준으로 가로·세로가 같다.
이 기준은 버튼·입력·탭·툴바·팝오버·채팅·표·콘텐츠 묶음 전체에 적용한다.

## 타이포그래피

기본 조작 UI의 크기는 세 단계, 굵기는 두 단계로 제한한다. 이 제한을 콘텐츠 제목과 수치에 일괄 적용하지 않는다.
글꼴은 `--font-family-ui`의 시스템 sans-serif를 사용한다. 코드만 `--font-family-code`를 사용한다.
`contentPresentation`은 콘텐츠의 title/heading/value/body/caption/group/list/divider를 소유한다.
빌더의 기존 콘텐츠 제목 40px, 섹션 제목 20px, 본문 16px, 수치 40px 위계를 유지한다.
선택한 요청이나 작성된 결과가 주 읽기 대상이면 `PageHeader.titleRole="primary"`로 기존 콘텐츠 제목 위계를 사용한다. HTML 제목 수준은 별도로 유지하며, 보조 맥락과 속성이 같은 무게로 경쟁하지 않도록 배치한다.
컨트롤은 아래의 조작 UI 규칙을 사용한다.

| 역할 | 크기 | 굵기 |
| --- | --- | --- |
| 보조·상태·메타 정보 | 12px | 400 |
| 버튼·입력·선택·일반 UI 텍스트 | 14px | 400 |
| UI 제목·섹션 제목 | 16px | 600 |

강조가 필요한 경우 600을 사용한다. 관성적으로 500·700이나 중간 크기를 추가하지
않는다. 작은 대문자 라벨, 넓은 자간, 역할마다 다른 글꼴 크기로 위계를 과장하지
않는다. 배치·간격·제한된 색과 굵기로 충분한 차이를 만든다.
사용자 문서와 UI 빌더 콘텐츠의 제목 수준, 굵게, 코드, 주요 수치 등 읽는 의미는
조작 UI 규칙으로 평탄화하지 않는다. 일러스트의 표현도 컨트롤 곡률이나 타이포그래피 제한의 대상이 아니다.

## 접근성과 검증

단순화하면서 접근성 이름, focus 표시, 키보드 조작, disabled·선택·오류 상태를
없애지 않는다. 팝오버의 focus와 Escape 복귀는 정본 Primitive에 맡긴다.
Floating 표면의 투명도 감소·강제 색상 모드도 정본 CSS에서 유지한다.

변경한 실제 제품 경로에서 열기·닫기·입력과 좁은 화면의 배치를 확인한다.
상태와 행동을 보존하는 범위에서 장식을 다시 덜어낸다. 수행한 자동 검사와 실제
브라우저 확인, 확인하지 못한 항목은 구분해서 보고한다.

## 구현과 참고 위치

- [UI Atom 공개 API](../packages/json-document-ui-primitives-react/src/index.ts)
- [Floating surface 계약](../packages/json-document-ui-primitives-react/docs/floating-surface.md)
- [Floating surface CSS](../packages/json-document-ui-primitives-react/src/floating-surface.css)
- [공통 디자인 토큰](../packages/json-document-ui-primitives-react/src/design-tokens.css)
- [공통 컨트롤·콘텐츠 스타일](../packages/json-document-ui-primitives-react/src/design-system.css)
- [디자인 시스템 API](../packages/json-document-ui-primitives-react/docs/design-system.md)
- [사이트의 공통 스타일 소비](../site/src/app/index.css)
- [공통 UI 조합 recipe](../site/src/shared/ui/styles.ts)
- [UI Primitives 설명](public/ui-primitives.md)
- [디자인 시스템 카탈로그 구현](../site/src/routes/ui-primitives-catalog/UiPrimitivesCatalogRoute.tsx)

이 문서는 제품 디자인 원칙을 설명한다. API 계약은 해당 패키지 문서에 유지하며,
[설계와 진행 상태](public/design.md)는 아키텍처 목표·프로토타입의 별도 안내다.

[간격 전수 적용 위치와 물리 치수 제외 근거](design-spacing-adoption.md)를 참고한다.

## 사이트 적용 경계

| 책임 | 정본 | 사이트가 소유하는 것 |
| --- | --- | --- |
| 페이지 제목·설명·자산 배치 | PageHeader | 제목·설명·고양이 자산 선택 |
| 계층 메뉴·현재 위치 | SidebarNavigation·Breadcrumbs | 문서 트리·경로·라우터 연결 |
| 제목·본문·목록·표·인용·이미지 | contentPresentation | 콘텐츠·읽는 순서 |
| 입력·native 폼·셀 입력 | Field·fieldPresentation | 폼 바인딩·검증·저장 |
| 목록 행·선택 표시 | SelectableItem row | 대상·선택 상태·실제 명령 |
| 펼침 표시 | DisclosureButton | 펼칠 콘텐츠·열림 상태 |
| 팝오버·메뉴·선택 목록·진단 패널 | Popover·Menu·Choice·floatingSurface | 위치·크기·제품 문구 |
| 캘린더 일정 표시 | calendarPresentation | 이벤트 데이터·기간·가시 범위 |

site 공용 스타일에는 사이트·데모 프레임과 코드 뷰어 배치만 둔다. A2UI 프로토콜의
배치는 해당 렌더러가 소유하고 Card·본문·펼침은 같은 UI 정본을 소비한다. UI Primitives의
색·곡률·경계·높이·선택·focus를 재정의하는 전역 selector를 두지 않는다.
같은 역할을 고칠 때는 정본 수정 → 소비처 전환 → 대체된 규칙 삭제를 한 작업으로 끝낸다.

## 컴포넌트 통합의 경계

공용 API를 import한 다음 consumer CSS로 button·option·popup의 배경·곡률·경계·글꼴을 다시 만들지 않는다. Host는 배치·크기·간격만 제공한다. 멘션 원자·추천·모델 선택·메시지도 Tag·Avatar·RecordSummary·공용 row·floatingSurface·ChatBubble을 조합한다.

코드·JSON surface와 복사는 UI Primitives CodeBlock/InlineCode가 소유한다. 구문 강조·문서 node attrs·selection binding은 각 adapter가 주입한다. 일반 팝업의 수명주기와 읽기/편집 전환 focus는 정본에 위임한다. 비모달 레코드 panel은 ProductInspector를 사용하며 modal Dialog와 계약을 혼동하지 않는다.
