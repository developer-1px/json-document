# 날짜 선택 컨트롤과 비례

`DatePicker.value`의 빈 문자열은 날짜 미선택을 뜻한다. `defaultVisibleDate`는
빈 상태에서 달력을 열 때 표시할 날짜이며 입력값이나 선택값으로 저장하지 않는다.
생략하면 현재 로컬 날짜의 월을 표시한다. Canvas의 등록된 date-picker Usage는
`props.visibleDate`를 이 공개 API에 전달하며 바인딩된 빈 날짜는 빈 입력으로 유지한다.

`CalendarGrid`, `RangeCalendar`, `DatePicker`, `DateRangePicker`, `HtmlDateField`는 Calendar 패키지가 소유한다. 공개 스타일은 다음과 같이 소비한다.

```tsx
import { CalendarGrid } from "@interactive-os/json-document-calendar";
import "@interactive-os/json-document-calendar/date-controls.css";
```

`date-controls.css`는 UI Primitives의 공개 디자인 시스템을 포함한다. 날짜 칸은 `aspect-ratio: 1`이며 일반 크기는 공통 `--control-height`의 36px이다. 7열과 기존 4px 셀 간격으로 달력 너비를 계산하고 부모 폭보다 넓어지지 않는다. 날짜 입력과 picker 조합은 부모 grid의 남는 높이로 늘어나지 않고 콘텐츠에 맞춘다. 날짜 입력은 `fieldPresentation.standard`를, 열기 버튼은 `Command`를 직접 소비하여 같은 글꼴·높이·패딩·포커스를 사용한다. 선택은 채운 칸, 키보드 포커스는 기존 accent 윤곽으로 구분한다. 날짜 값의 commit과 방향키 이동 계약은 유지한다.

[Usage](/demo/ui-primitives#design-system-date-and-time)는 실제 공개 컴포넌트를 조합한다. Source의 `date-controls.tsx`에서 `date-grid.tsx`와 `date-controls.css`로 연결된다. 일정 내용이 들어가는 `CalendarMonthGrid`·시간축은 별도 occurrence 표현이며 이 작은 날짜 선택 칸의 폭을 강제하지 않는다.

```live-demo
/demo/ui-primitives
```

날짜 입력과 picker는 기본적으로 native 날짜 콘텐츠 너비에 맞춰 Hug합니다.
긴 텍스트 입력처럼 부모 폭을 모두 채우지 않으며 max-width로 좁은 부모에 맞춥니다.

단일 DatePicker는 날짜 필드와 열기 명령을 한 행의 아래쪽 기준선에 맞춥니다.
펼친 달력은 그 아래에서 두 열을 함께 사용합니다.

HtmlDateField의 blur/Enter commit은 해당 이벤트의 실제 input.value를 읽는다.
React draft가 입력 이벤트와 다른 시점에 갱신되더라도 표시된 날짜를 검증하고
저장하며 잘못된 값은 기존 값으로 복원한다. 전체 카탈로그 Usage에서 직접 날짜
입력→Enter→페이지 왕복의 저장 유지와 빈 값 복원을 Chrome으로 확인했다.

날짜와 기간의 달력 팝업은 UI Primitives Popover를 조합한다. open·Escape·외부 클릭·focus 복귀를 달력 패키지에서 별도로 구현하지 않는다. calendar의 단일/구간 선택과 native date 파싱만 calendar가 소유한다. [날짜 Usage](/demo/ui-primitives?data=date#design-system-data-presentation).
