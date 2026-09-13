# Hands

장르별 편집 예제와 공개 API를 확인합니다. [지원 범위](hands-support.md)에서
현재 증거와 Profile 완료 조건을 구분하고, 설계 목표는 [설계 현황](design.md)에서 봅니다.

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
않습니다. `@interactive-os/json-document-annotation`의 `AnnotationHand`가
도구, gesture-to-Intent, SVG projection, transient preview와 comment UI를
하나의 공개 surface로 제공합니다.

```tsx
<AnnotationHand
  editor={editor}
  tool={tool}
  onToolChange={setTool}
  sourceUrl={sourceURL}
  createId={() => crypto.randomUUID()}
  rasterStyle={style}
/>
```

Gesture는 Affordance가 input-independent lifecycle로 소유하고 Pointer capture는
Web pointer session이 소유합니다. SVG projection과 raster file decode는 Annotation
model을 모르며, Canvas 합성만 domain-qualified Web adapter가 selector와
presentation을 번역합니다.

```live-demo
/demo/annotation
```

## Calendar editor

Calendar의 문서 모델·검증·의미 연산·projection은
`@interactive-os/json-document-calendar-document`, 편집 lifecycle은
`@interactive-os/json-document-editing`, 입력과 UI 조합은
`@interactive-os/json-document-calendar`가 소유합니다.

```ts
import { validateCalendarDocument } from "@interactive-os/json-document-calendar-document";
import { createCalendarEditor } from "@interactive-os/json-document-editing";

const validation = validateCalendarDocument(calendarDocument);
if (!validation.ok) throw new Error(validation.reason);
const editor = createCalendarEditor(calendarDocument);
editor.dispatch({ type: "event.move", eventId, start: "2026-08-03T10:00" });
editor.undo();
```

`CalendarDocument`는 calendar와 interval event·recurrence를 정의합니다.
datetime-local minute과 exclusive-end all-day, calendar 참조, 반복의
this/following/all 의미는 [Document Type 계약](/docs/api/calendar-document)을
따릅니다. `validateCalendarDocument`와 생성자는 같은 검증을 사용합니다.
생략된 legacy 필드와 잘못된 타입은 다르게 처리합니다.

Editing은 Document Type의 `planCalendarEventEdit`, `planCalendarEventRemoval`,
`planCalendarOccurrenceRemoval`, `planCalendarVisibility`를 실행하고 Selection과
History를 연결합니다. occurrence 선택은 `{ eventId, occurrenceStart }`로 식별하며
Hand는 `editor.primaryOccurrence`를 읽습니다. 직접 dispatch, 외부에서 바꾼 선택,
mount 전 선택도 Inspector·수정·삭제의 같은 대상이 됩니다.
`editor.paste(clipboard)`의 기본 목적지는 선택 회차이고, 빈 슬롯을 찍은 위치는
Hand의 명시적 임시 paste target입니다. [Editing 프로파일](/docs/api/editing#calendar-protocol-profile-rc)에
선택·복사·붙여넣기·History 결과와 공통 검사 근거를 연결합니다.

문서 조회와 시간 변환은 Document Type의 공개 API를 사용합니다.

- `calendarDocumentCalendars` / `calendarDocumentCalendar`: collection과 id lookup
- `calendarDatePart` / `calendarIntervalLastDate`: 날짜 부분과 exclusive end의 마지막 점유일
- `calendarAllDaySpan`: inclusive UI 날짜 endpoint를 exclusive 저장 구간으로 변환
- `formatCalendarInstant`: concrete `Temporal.Now` 값을 저장 형식으로 변환
- `calendarRecurrenceWithFrequency` / `calendarRecurrenceWithInterval` /
  `calendarRecurrenceWithUntil`: 반복 모델 변경
- `projectCalendarOccurrences` / `calendarBusyDates`: 발생분과 점유 날짜 조회
- `calendarTimedLayout` / `calendarAllDayLayout` / `calendarMonthWeekLayout`:
  event 구간과 lane projection

Host는 clock 인스턴스, color를 UI variant로 바꾸는 정책, copy와 layout을 조합합니다.
`CalendarMonthGrid`와 `CalendarTimeGrid`는 표시와 접근성·overflow·interaction을
소유합니다. 월의 42개 날짜 cell과 6개 주 행은 Calendar Hands의 `calendarMonthWeeks`,
query 범위는 `calendarCellInterval`, day/week의 ordered cell은 `calendarCells`가
만듭니다. cell의 ISO weekday metadata와 화면의 주 시작 정책을 같은 개념으로
설명하지 않습니다. 연간 월 목록은 `calendarYearMonths`가 소유합니다.

Toolbar의 `visiblePeriodLabel`, 날짜 이동의 `shiftVisibleDate`, 시간 문구의
`calendarTimeLabel`, 접근 가능한 event 이름의 `calendarEventLabel`도 Calendar
Hands 책임입니다. generic UI Primitives에 Calendar 모델이나 날짜 선택 동작을
넣지 않습니다. View와 날짜의 URL은 Host가 조합하며 view membership은 기존
Editing `parseCalendarView`가 판별합니다.

Calendar별 `interpretCalendarTimeGridPointer`, `interpretCalendarAllDayPointer`,
`interpretCalendarMonthPointer`와 bind 함수는 정규화된 release 값을 Calendar Intent로
연결하는 Editing 책임입니다. generic gesture의 begin/preview/commit/cancel은
Affordance, DOM pointer capture와 `calendarKeyFromWebRow` 같은 좌표 변환은 Web에 둡니다.
`useCalendarPointerInteractions`가 이 API들을 조합하며 자체 root 안에서 hit-test합니다.

선택한 occurrence의 body drag는 Selection의
`resolveMaterializedSelectionDragSource`로 대상을 캡처하고 Editing의
`planCalendarSelectionMove`로 preview와 commit을 계획합니다. 같은 Document Type
연산을 공유하며 전체 document·selection·undo/redo가 한 Editing transaction으로
이동합니다. Hand는 Web pointer session과 Affordance `createGestureSession`을
조합하고, resize edge와 그룹 이동의 lifecycle은 구별합니다.

```live-demo
/demo/calendar
```

Date inputs and single-value date choices are owned by Calendar rather than the
generic UI primitive package:

```live-demo
/demo/date-controls
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
Hands가 아닙니다. 대기 시각 언어는 [Animation](animation.md)이 소유합니다.

Agent의 Markdown delta는 canonical source를 바꾸지 않고 render projection에서만
불완전한 delimiter를 닫습니다. 정적 문서와 streaming 응답은 같은 renderer와
제품 디자인 recipe를 사용합니다.

```live-demo
/demo/markdown
```

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

## Artifact를 다루는 Hands 후보와 구현

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

이 목록은 장르별 구현과 목표를 함께 보여 주며, 모든 항목의 Profile 완료를 선언하지 않습니다.
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
