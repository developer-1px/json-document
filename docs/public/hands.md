# Hands

## Annotation editor

Raster Annotation의 persistent model과 editing session은
`@interactive-os/json-document-editing`의 `createAnnotationEditor`가 소유합니다.

```ts
const editor = createAnnotationEditor(annotationDocument);
editor.dispatch({ type: "annotation.move", annotationId, dx, dy });
editor.undo();
```

`AnnotationDocument`는 source와 selector geometry, presentation을 직렬화하고,
selection과 undo/redo는 editor snapshot에 둡니다. Point, rectangle, path와 arrow
selector는 geometry의 유일한 정본이며 presentation은 geometry를 반복하지
않습니다. SVG 좌표 변환, pointer gesture, Canvas rasterization과 comment UI는
Editing owner 밖에서 조합합니다.

```ts
const gesture = createGestureSession<AnnotationGesture>();
const point = projectWebClientPointToSVG(clientPoint, viewport);
const raster = await readWebRasterFile(file);
const output = await renderWebAnnotationRaster({ document, sourceId, sourceURL, style });
```

Gesture는 Affordance가 input-independent lifecycle로 소유하고 Pointer capture는
Web pointer session이 소유합니다. SVG projection과 raster file decode는 Annotation
model을 모르며, Canvas 합성만 domain-qualified Web adapter가 selector와
presentation을 번역합니다.

```live-demo
/demo/annotation
```

## Calendar editor

시간 구간 이벤트의 persistent model과 editing session은
`@interactive-os/json-document-editing`의 `createCalendarEditor`가 소유합니다.

```ts
const editor = createCalendarEditor(calendarDocument);
editor.dispatch({ type: "event.move", eventId, start: "2026-08-03T10:00" });
editor.dispatch({ type: "event.move-day", eventId, day: "2026-08-05" });
editor.dispatch({ type: "event.create", start: "2026-08-03", end: "2026-08-04", allDay: true });
editor.undo();
```

`CalendarDocument`는 캘린더 `{ id, title, hidden, color }`와 이벤트
`{ id, title, start, end, allDay, calendarId }`를 직렬화합니다. `color`는
Host가 fill로 옮기는 짧은 토큰입니다. 시간 이벤트는 datetime-local, 종일
이벤트는 exclusive-end 날짜입니다. 일·주 보기의 빈 구간 drag는 그
start/end로 만들고, 빈 칸 클릭은 선택을 지웁니다. 빈 칸 더블클릭은 기본
길이로 만들고 제목을 묻습니다. 블록 이동은 duration을 유지하며 가장자리는
`event.resize`입니다. 종일 밴드는 날짜 단위로 드래그해 만들고 옮기고
늘립니다. 월 보기 같은 날 빈 칸 클릭은 선택 해제, 더블클릭은 그날 종일 생성,
빈 칸을 다른 날로 끌면 그 날들을 덮는 종일 구간을 만들고 제목을 묻습니다.
여러 날을 덮는 종일 이벤트는 주 행을 가로지르는 막대이고, 주 경계에서 잘립니다.
Exclusive end를 마지막 점유 날짜로 바꾸는 interval projection은 Editing
`calendarIntervalLastDate`가 소유합니다. occurrence day 열거, all-day resize end,
month week clipping이 모두 같은 정본 규칙을 사용합니다.
날짜 또는 날짜·시간 문자열에서 `YYYY-MM-DD` 날짜 부분을 얻는 projection은
Editing `calendarDatePart`가 소유합니다. 현재 시각의 오늘 날짜와 새 이벤트의
생성 날짜도 Host의 문자열 자르기 없이 이 공개 API를 사용합니다.
Host는 `Temporal.Now`로 concrete clock을 읽고 Editing `formatCalendarInstant`로
Calendar datetime-local minute 문자열을 만듭니다. clock source와 저장 형식의
책임을 섞는 route-local formatter는 두지 않습니다.
Calendar collection과 id lookup은 Editing `calendarDocumentCalendars`,
`calendarDocumentCalendar`가 소유합니다. Host는 sidebar와 inspector를 조합하고
calendar color를 UI variant로 바꾸는 시각 정책만 유지합니다.
Inspector의 repeat frequency·interval·until 변경은 Editing
`calendarRecurrenceWithFrequency`, `calendarRecurrenceWithInterval`,
`calendarRecurrenceWithUntil`이 `CalendarRecurrence` model을 만들고 보존합니다.
Host는 option copy와 recurrence 비활성화 선택만 조합합니다.
월간 42개 날짜 cell을 6개의 ISO 주 행으로 투영하는 일은 UI Primitives 날짜 값
정본의 `calendarMonthWeeks`가 소유하며, Host는 각 행의 event layout과 DOM을
조합합니다.
표시 cell collection의 첫 날짜부터 마지막 날짜 다음 날까지의 half-open query
범위는 UI Primitives `calendarCellInterval`이 소유합니다. 연간 12개 month grid와
sidebar navigator가 같은 interval을 Editing occurrence query에 전달합니다.
Day와 week time grid의 ordered 날짜 cell도 UI Primitives `calendarCells`가
소유합니다. Day는 정확한 ISO weekday를 포함한 단일 cell, week는 ISO 주의
7개 cell을 반환합니다. 각 `CalendarCell`은 canonical date에서 투영한 `day`와
ISO weekday를 제공하며 Host는 문자열을 해석하지 않고 이 metadata로 날짜 숫자,
header와 event grid를 조합합니다.
Inclusive UI 날짜 endpoint를 all-day event의 exclusive storage interval로 바꾸는
projection은 Editing `calendarAllDaySpan`이 소유합니다. 빈 drag, end resize,
timed→all-day 전환, 단일 생성과 Inspector 수정이 모두 같은 정본 규칙을 사용합니다.
막대 가장자리는 종일 밴드와 같이 `event.resize`입니다.
점유 칸은 origin 이벤트 선택, 다른 날로 끌 때만 `event.move-day`입니다.
월간 span에서 누른 Web `clientX`는 `calendarKeyFromWebRow`가 주 행 bounds와
정렬된 날짜를 사용해 origin 날짜로 투영합니다. Calendar React의
`useCalendarPointerInteractions`가 DOM 측정과 pointer session 시작을 소유하므로
Host는 이벤트와 날짜 목록만 연결합니다.
`+N more`는 그 날의 이벤트 목록을 열고 월 보기에 남습니다. 이 매핑은
`interpretCalendarTimeGridPointer`, `interpretCalendarAllDayPointer`,
`interpretCalendarMonthPointer`가 소유하며 현재 선택은 입력이 아닙니다.
연 보기는 12개 미니 월입니다. 월 이름은 월 보기로, 날짜는 일 보기로
들어갑니다. 연간 12개 월 시작일은 UI Primitives 날짜 값 정본의
`calendarYearMonths`가 만들고, Host는 월 이름과 grid layout 및 navigation만
조합합니다. 보기와 날짜는 Host URL (`?view=&date=`)입니다. 픽셀 격자와
보기 전환은 Host가 조합합니다. 정본 view membership은 Editing
`parseCalendarView`가 판별하고 URL의 invalid
값을 어떤 view로 대체할지는 Host 정책으로 남습니다.
toolbar의 현재 기간 문구는 UI Primitives
`visiblePeriodLabel`이 view 분기와 날짜 경계를 투영하고, Host가 월 이름 copy와
week separator policy를 주입합니다.
Previous/Next 및 keyboard period 이동은 UI Primitives `shiftVisibleDate`가
day/week/month/year의 단위와 calendar arithmetic을 소유하며, Host는 현재 view와
direction을 전달하고 결과를 URL state에 반영합니다.
Timed event의 datetime-local에서 `HH:mm` 문구를 투영하는 일은 UI Primitives
`calendarTimeLabel`이 소유합니다. Host는 그 결과를 visual copy에 조합하고,
UI Primitives의 event-label projection도 같은 정본 값을 accessible name에
사용합니다. Date-only와 유효하지 않은 값은 빈 문구입니다.
Month event의 accessible name은 UI Primitives `calendarEventLabel`이 all-day에는
title, timed event에는 가능한 `HH:mm title`을 투영합니다. 이 모듈은 구조적
event 값만 받아 UI Primitives가 Editing package에 의존하지 않도록 합니다.

```live-demo
/demo/calendar
```

Hands는 사람이 artifact와 agent를 다루게 하는 장르별 완료 기준입니다.
App도, 단일 화면 component도, 하나의 공통 package도 아닙니다. 실제 제품을
끝까지 만져 보며 발견한 전형적인 인간의 손과 그 조합 증거를 가리킵니다.

Agent가 값을 생성하고 Viewer가 그 값을 보여 주는 것만으로는 artifact가
도구가 되지 않습니다. 사람이 고르고, 쓰고, 옮기고, 맥락을 건넬 수 있을 때
생성된 결과가 이어서 작업할 수 있는 artifact가 됩니다.

```text
Agent output + Viewer           = 볼 수 있는 결과
Agent output + Viewer + Hands   = 이어서 작업할 수 있는 artifact
```

구현이 없는 Hands는 TBD로 남깁니다. TBD는 빈 화면이 아니라 필요한 상황과
사람의 동사, host와 Hand의 경계를 먼저 적은 사용법 명세입니다. 아직 존재하지
않는 package API를 약속하지 않습니다.

## 닫힘 판정

Hands는 다음 증거가 함께 있을 때 닫혔다고 부릅니다.

- 장르 document, Selection과 Intent가 owner package의 공개 계약으로 존재함
- Clipboard/History 등 필요한 editing capability가 연결됨
- 대표 keyboard·pointer Affordance와 browser lifecycle이 실제 Host에서 동작함
- package contract와 Live Demo browser test가 같은 행동을 증명함
- Live Demo fixture가 관찰된 실제 제품 사건에서 유래하고 shape·순서·크기·timing과
  provenance를 보존함. synthetic happy path만으로는 Hands를 닫지 않음
- 반복 책임은 owner package API, 제품 고유 정책은 이름 붙은 Host module에 있음

따라서 “닫힘”은 모든 제품 기능이나 모든 접근성 변형이 끝났다는 뜻이 아닙니다.
현재 장르의 최소 편집 loop가 public contract와 실제 소비 경로에서 함께
성립한다는 뜻입니다. 설치 가능한 package와 실제 source 위치는
[Official Hands](official-hands.md)에서 확인합니다.

## Agent에게 건네는 Hands

| Hands | 관찰한 표면 | 사람이 하는 일 |
| --- | --- | --- |
| [Composer](composer.md) | Cstar composer | 지시와 구조화된 context를 한 턴으로 구성 |
| [Mention](mention.md) | Cstar mention | 이름으로 보이는 안정적인 entity reference atom을 삽입 |

Transcript, 말풍선, think·stream·tool animation은 표현과 runtime lifecycle입니다.
Hands가 아닙니다.

## Hands가 공유하는 Viewport Position

특정 오브젝트를 지정한 화면 위치로 보내고, 문서 끝에서도 그 위치에 도달하도록
부족한 하단 scroll range를 임시로 제공하며, 오브젝트가 화면 밖으로 나가면 이를
함께 제거하는 동작은 업무 규칙이 아닙니다. Live Demo는 security-filter가 적용된 실제
runtime browser-memory capture의 1,052개 text delta를 87개 원래 chunk 경계와
scaled delay로 재생합니다.

정본 lifecycle의 입력은 exact target과 원하는 viewport offset입니다. Demo에서는
제출한 항목과 96px을 넘기지만 맨 위는 하나의 사용 예일 뿐입니다. target 뒤의
content가 자라는 만큼 temporary trailing range를 같은 rendering opportunity에서
줄이고, target이 viewport를 벗어나면 position control과 range를 해제합니다. 완료 시
DOM 교체나 browser scroll clamp가 생겨도 요청한 target 위치를 복원합니다.

Host는 target identity, 원하는 offset, 활성화·완료 정책을 정하고, Affordance와 Web
adapter는 제품 의미를 모른 채 position/range lifecycle과 DOM 연결을 소유합니다.

```live-demo
/demo/viewport
```

## Artifact를 다루는 닫힌 Hands

| Hands | 관찰한 표면 | 사람이 하는 일 |
| --- | --- | --- |
| Document | Bear | 줄에 쓰고 옮김. Markdown caret이 전형 |
| [Order](order.md) | Linear | 한 줄 항목을 고르고 옮김 |
| [Object](object.md) | Figma | 안정 ID 객체를 평면에서 고르고 옮김 |
| Sheet | Excel | cell을 고르고 채움 |
| [Tree](tree.md) | Finder | 보이는 가지를 접고 범위를 고름 |
| Kanban | Trello | card를 열 사이로 옮김 |
| [Database](database.md) | Airtable | 같은 record를 저장된 view로 봄 |
| Calendar | Google Calendar | 구간 이벤트를 주·월·연에서 만들고 옮김 |

Slides, Form 같은 App 이름은 먼저 기존 Hands로 분해합니다. 예를 들어
Slides는 Order와 Object의 조합일 수 있습니다. 끝까지 환원되지 않는 인간의
편집 문법이 남을 때만 새 Hands 후보가 됩니다.

전체 흐름은 [Artifact](/viewer) prototype에서 봅니다. Artifact는 적절한
surface를 고르고, Hands는 사람이 만지는 방법을 제공하며, Core는 사람과
agent의 변경을 같은 계약에 남깁니다.

## Live Demo

```live-demo
/demo
```

```live-demo
/demo/sheet
```

```live-demo
/demo/kanban
```
