## Calendar Hand와 편집 계약

Calendar Hand는 React lifecycle과 viewport·입력·UI 조합을 제공합니다.
시간·반복·거절의 의미는 UI에서 다시 정의하지 않고 정본 Editing 계약을 소비합니다.

[시간·반복·거절 계약: Editing의 Calendar protocol profile](/docs/api/editing#calendar-protocol-profile-rc)에서
지원 범위와 실패 시 문서·선택·History 보존 조건을 확인하세요.

[날짜 선택 컨트롤·스타일 공개 API](date-controls.md)는 정사각형 날짜 칸과 공통 입력·명령 비례를 소유합니다.

### 월간 날짜 칸의 비례

`calendarPresentation.month`와 `calendar-presentation.css`의 날짜 칸은1:1입니다.
7열의 최소 너비56rem은 기본3개 일정 lane·날짜·더보기 조작을 보존합니다.
좁은 Host는 가로 스크롤을 제공하고, 긴 달력은 세로 스크롤을 제공합니다.
더보기 표면은 칸 안에서 스크롤하여 모든 일정을 읽고 선택할 수 있습니다.
[Calendar Usage](/demo/calendar)의 Month와 UI Builder 전체 카탈로그가 같은 geometry를 사용합니다.
