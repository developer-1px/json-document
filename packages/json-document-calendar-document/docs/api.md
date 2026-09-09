## Calendar Document Type 계약 · RC

소유자: `@interactive-os/json-document-calendar-document`, 현재 `0.1.0-rc.0`.
이 package는 문서 규칙을 소유합니다. 선택·Clipboard·History는
[Editing 프로파일](/docs/api/editing#calendar-protocol-profile-rc), 사용자 입력과
UI는 [Calendar Hands](/docs/api/calendar)가 연결합니다. Core Stable 및 Official
Hands/Editing Grammar의 Draft 지위를 바꾸지 않습니다.

### 모델과 검증

`CalendarDocument`는 `calendars`와 `events`를, `CalendarEvent`는 interval과
recurrence를 정의합니다. `{ eventId, occurrenceStart }`인 `CalendarOccurrencePoint`는
문서의 발생분 주소이며 selection 상태가 아닙니다. `CalendarOccurrenceInterval`은
현재 규칙으로 해석한 `{ eventId, start, end }`입니다.

- `validateCalendarDocument(unknown)`는 JSON과 Calendar 구조·참조·시간 규칙을
  검사해 `{ ok: true }` 또는 `{ ok: false, code, reason }`을 반환합니다.
- `assertCalendarDocument(unknown)`는 같은 검사에 실패하면 `TypeError`를 던집니다.
  검사만 수행하며 입력을 정규화하거나 mutation하지 않습니다. legacy 수용을
  포함하므로 validator 결과는 필수 필드가 모두 채워졌다는 TypeScript type guard가 아닙니다.
- calendar의 `id`는 고유한 비어 있지 않은 문자열, `title`은 문자열,
  `hidden`은 boolean, `color`는 비어 있지 않은 문자열입니다. calendars의 생략은
  허용하지만 null·문자열 같은 비배열 값은 거절합니다.
- event는 고유한 비어 있지 않은 `id`, 문자열 `title`, `start < end`를 갖습니다.
  calendar 목록이 비어 있지 않을 때 비어 있지 않은 `calendarId`는 실제 calendar를 참조합니다.
- 기존 간단한 문서의 생략된 calendars / allDay / calendarId / recurrence /
  excludeDates는 빈 목록 / timed / 미지정 / 반복 없음 / 제외 없음으로 읽습니다.
  이 호환 경로는 잘못된 타입을 생략으로 바꾸지 않습니다.

### 시간과 반복

timed 값은 정확한 `YYYY-MM-DDTHH:mm` local date-time, all-day 값은
`YYYY-MM-DD`입니다. 둘 다 종료는 exclusive입니다. 8월 1일 하루는
`start: "2026-08-01", end: "2026-08-02"`입니다. UTC Instant, offset, timezone과
초 단위는 현재 프로파일에 포함하지 않습니다.

recurrence의 `freq`는 daily / weekly / monthly / yearly, `interval`은 양의 safe
integer입니다. `until: ""`은 무기한이며 나머지는 발생 시작일 기준 inclusive 날짜입니다.
`excludeDates`는 발생 시작일을 제외합니다. 월말·윤년의 시작은 Temporal constrain,
종료는 원본의 local duration을 보존하므로 시작·종료를 따로 constrain하지 않습니다.

### 의미 연산

| API | 입력과 결과 |
| --- | --- |
| `planCalendarEventEdit(events, operation, options)` | create/update/move/move-day/resize/occurrence.edit를 events·JSON Patch·affectedOccurrence로 계획 |
| `planCalendarEventRemoval(events, eventIds)` | 지정한 원본 event들을 제거하는 events·Patch 계획 |
| `planCalendarOccurrenceRemoval(events, removal)` | 발생분 scope에 따른 제외·시리즈 절단·제거 계획 |
| `planCalendarVisibility(document, calendarId, hidden)` | 존재하는 calendar의 boolean 가시성 변경 계획 |

모든 plan은 입력을 변경하거나 commit하지 않습니다. 실패하면 `{ ok: false, code,
reason? }`이며 성공 시 `operations`를 JSONDocument 또는 `applyPatch`에 적용할 수
있습니다. `affectedOccurrence`는 변경 결과의 문서 주소입니다. 무엇을 선택하고
어떤 Undo 단위로 묶을지는 Editing이 결정합니다. 기존 Calendar rejection code는
호환성을 위해 유지하며, `selection.*`라는 code 이름이 Selection 의존성을 뜻하지는 않습니다.

연산의 `events`는 검증된 현재 문서에서 가져옵니다. `calendarIds`에는 그 문서의
calendar ID 집합을 전달합니다. 생략하면 event의 시간·반복 구조만 검사하므로
문서 전체의 membership 검증을 대신하지 않습니다. 생성의 `defaultCalendarId`는
호출자가 고른 기본값이고, 미지정이면 빈 문자열입니다. `allocateId`는 필요한 새 ID를
공급하며 비어 있거나 이미 있는 ID는 거절합니다. provider 예외는 호출자에게 전파합니다.
Editing은 기존 bounded ID allocator를 주입합니다.

| scope | 편집 | 삭제 |
| --- | --- | --- |
| this | 해당 발생분을 제외하고 독립 일정으로 분리 | 해당 발생분 제외 |
| this-and-following | 기준일 전날까지 원본을 자르고 이후 시리즈 분리 | 기준일 이후 발생분 제거 |
| all | 선택한 발생분의 변경량을 원본 시리즈에 적용 | 원본 시리즈 제거 |

시작만 바꾸면 구간 길이를 보존하고 resize는 지정한 경계만 변경합니다. 시리즈
이동은 유한한 until과 excludeDates를 함께 옮기며 following은 기존 종료와 이후
제외 날짜를 보존합니다. 월/년 재기준화로 요청한 발생분을 표현할 수 없으면
`selection.unrepresentable-series-move`로 거절합니다. allDay / calendarId /
recurrence 자체의 변경은 시리즈 속성 변경입니다.

### Projection과 날짜 값

`projectCalendarOccurrences(events, rangeStart, rangeEnd)`는 `[rangeStart, rangeEnd)`와
겹치는 발생분을 계산합니다. 범위는 date 문자열입니다. 요청 구간 근처로 seek하며
400회 같은 lifetime cap은 없습니다. `resolveCalendarOccurrence`는 화면 밖의 주소도
현재 recurrence와 exclusions로 해석합니다. 잘못된 조회 범위는 빈 결과입니다.

`calendarVisibleEvents`, `calendarEventsOnDay`, `calendarEventsInMonth`,
`calendarBusyDates`는 문서 조회를, `calendarTimedLayout`, `calendarAllDayLayout`,
`calendarMonthDayLayout`, `calendarMonthWeekLayout`은 event의 구간/lane projection을
제공합니다. DOM·CSS·표시 요소의 디자인은 포함하지 않습니다.

`calendarDocumentCalendars` / `calendarDocumentCalendar`는 collection 조회,
`calendarDatePart` / `calendarIntervalLastDate` / `calendarAllDaySpan`은 시간 값의
정본 변환입니다. parse/format/add/shift와 recurrence 변경 함수도 같은 owner를
사용합니다. Calendar 화면의 cell/grid, 날짜 선택과 표시 label은 Calendar Hands에 남습니다.

### 실제 소비와 남은 범위

[Calendar Usage 및 Source](/editors#calendar-editor)는 이 package의 조회·projection을 직접 소비하고,
Editing이 공개 연산 계획을 통해 변경합니다. Source에서 모델·검증·연산·projection과
Editing·Hand의 연결을 추적할 수 있습니다. 이 문서 아래에는 전체 export signature가 이어집니다.

timezone/DST, 서버 revision/충돌/재시도, AI command wire, 외부 calendar connector,
범용 RRULE, 대량 조회 pagination, 프로파일 버전 협상과 독립 구현 conformance는
TBD입니다. 현재 소유권 및 로컬 RC 동작의 검증과 구분합니다.
