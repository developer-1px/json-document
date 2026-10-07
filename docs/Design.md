# Design

이 문서는 제품 UI를 만들고 다듬는 에이전트와 개발자가 따르는 디자인 원칙이다.
새 화면에서도 기존 UI 시스템을 사용하고, 부족한 기능은 정본 모듈을 확장한다.
원칙의 적용 범위는 제품의 조작 UI이며, 사용자가 작성하는 문서의 표현과 구분한다.
기존 모든 화면이 이미 이 기준으로 이행됐다는 뜻은 아니다.

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

## 곡률·테두리·그림자

기본 컨트롤은 부드러운 곡률, 낮은 테두리 대비, 넓고 옅은 그림자를 사용한다.
값을 개별 화면에 하드코딩하지 않고 공통 semantic token으로 조정한다.

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

## 타이포그래피

기본 UI의 크기는 세 단계, 굵기는 두 단계로 제한한다.

| 역할 | 크기 | 굵기 |
| --- | --- | --- |
| 보조·상태·메타 정보 | 12px | 400 |
| 버튼·입력·선택·일반 UI 텍스트 | 14px | 400 |
| UI 제목·섹션 제목 | 16px | 600 |

강조가 필요한 경우 600을 사용한다. 관성적으로 500·700이나 중간 크기를 추가하지
않는다. 작은 대문자 라벨, 넓은 자간, 역할마다 다른 글꼴 크기로 위계를 과장하지
않는다. 배치·간격·제한된 색과 굵기로 충분한 차이를 만든다.
사용자 문서의 제목 수준, 굵게, 코드 등 콘텐츠 의미는 이 UI 규칙으로 평탄화하지 않는다.

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
- [사이트 공통 토큰과 Atom 스타일](../site/src/app/index.css)
- [공통 UI 조합 recipe](../site/src/shared/ui/styles.ts)
- [UI Primitives 설명](public/ui-primitives.md)
- [디자인 시스템 카탈로그 구현](../site/src/routes/ui-primitives-catalog/UiPrimitivesCatalogRoute.tsx)

이 문서는 제품 디자인 원칙을 설명한다. API 계약은 해당 패키지 문서에 유지하며,
[설계와 진행 상태](public/design.md)는 아키텍처 목표·프로토타입의 별도 안내다.
