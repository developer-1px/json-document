## Calendar protocol profile (RC)

정본 소유자는 `@interactive-os/json-document-editing`이다. 이 문서는 현재
`0.1.0-rc.0` Calendar 구현의 계약과 한계를 명시한다. Core Stable 프로파일이나
EditingSession 계약을 변경하지 않으며, Draft인 Official Hands / Editing Grammar를
동결된 wire 표준으로 승격하지 않는다. Calendar Hands는 이 계약을 입력과 화면에 연결한다.

### 값과 시간

- 일정은 고유한 비어 있지 않은 `id`, 문자열 `title`, `start < end`인 구간을 갖는다.
- timed 값은 정확히 `YYYY-MM-DDTHH:mm`인 local date-time이다. UTC Instant,
  offset, timezone, 초 단위는 이 프로파일에 포함하지 않는다.
- all-day 값은 `YYYY-MM-DD`이다. timed와 all-day 모두 종료는 exclusive이다.
  8월 1일 하루는 `start: "2026-08-01", end: "2026-08-02"`다.
- 현재 문서에 calendars가 있으면 비어 있지 않은 `calendarId`는 실제 calendar를
  참조해야 한다. 기존 간단한 문서의 생략된 calendars / allDay / calendarId /
  recurrence / excludeDates는 각각 빈 목록 / timed / 미지정 / 반복 없음 / 제외 없음으로
  읽는 호환 경로를 유지한다. 새 clipboard 출력은 완전한 필드를 갖는다.
- recurrence의 `freq`는 daily / weekly / monthly / yearly, `interval`은 양의
  safe integer다. `until: ""`은 무기한, 그 외에는 발생 시작일 기준 inclusive 날짜다.
  `excludeDates`는 발생 시작일을 제외한다. 월말·윤년의 발생 시작은 Temporal constrain
  규칙을 따르고, 종료는 원본의 local duration을 보존한다. 시작·종료를 따로 constrain해
  구간 길이가 0이나 음수가 되지 않는다.
- projection은 요청한 `[rangeStart, rangeEnd)`와 겹치는 발생분을 계산한다. 과거
  발생분을 처음부터 순회하거나 400회에서 수명을 잘라내지 않고 요청 구간 근처로 이동한다.
  매우 넓은 조회의 출력량 자체를 제한하는 pagination 계약은 아직 없다.

### 선택, 범위와 편집

`{ eventId, occurrenceStart }`가 발생분의 정체성이다. Selection 정본의 materialized
targets를 사용하며, 화면 밖에 있어도 현재 반복 규칙에 존재하는 선택은 유지된다.

| scope | 의미 |
| --- | --- |
| this | 해당 발생분만 제외하고 독립 일정으로 분리 |
| this-and-following | 이전 시리즈를 기준 발생일 전날까지 자르고 이후를 새 시리즈로 분리 |
| all | 선택한 발생분의 변경량을 원본 시리즈 구간에 적용 |

시작만 바꾸면 해당 발생분의 길이를 보존한다. resize는 지정한 경계만 바꾸며
반복 시리즈의 원본 날짜와 선택 발생 날짜를 혼동하지 않는다. Inspector, 포인터,
preview, 그룹 이동은 같은 순수 event/series 계획을 사용한다. preview ID는 임시이며
commit ID와 같을 필요는 없지만 실제 일정 구간·반복 결과는 같아야 한다.

그룹 이동은 선택 전체에 하나의 시간/일 변화량을 적용한다. this에서는 발생분별로
분리하고, all / following에서는 같은 시리즈를 한 번만 편집한다. following 기준은
선택·primary 순서와 무관하게 그 시리즈에서 선택된 가장 이른 발생분이다.
월/년 주기를 재기준화해 모든 선택점의 같은 변화량을 표현할 수 없으면
`selection.unrepresentable-series-move`로 그룹 전체를 거절한다. 단일 발생분의 all 편집도
요청한 구간이 결과 시리즈에 실제로 존재해야 하며 같은 규칙으로 거절한다.

시리즈 이동은 유한한 until과 제외 날짜도 시작일 변화량만큼 옮긴다. following은
기존 종료일과 이후 제외 날짜를 보존하며 무조건 무기한으로 늘리지 않는다.
allDay / calendarId / recurrence 자체의 Inspector 변경은 시리즈 속성 변경이다.
`selection.remove`는 선택된 원본 일정을 삭제한다. 발생분 범위 삭제는
`occurrence.remove`와 scope, clipboard cut은 캡처된 발생분을 사용한다.

### 거절과 원자성

생성·update·발생분 편집·paste는 생성자와 같은 도메인 불변식을 검증한다.
잘못된 구간, 미등록 calendar, 소수 recurrence, 알 수 없는 Intent type은
`{ ok: false, code, reason? }`로 끝나며 값·선택·undo/redo·알림을 바꾸지 않는다.
성공한 문서는 다시 editor로 읽고 projection할 수 있어야 한다.

드래그의 캡처 구간은 현재 사실이 아니라 precondition이다. commit 시 실제 발생분의
존재와 start/end를 다시 확인한다. 삭제·제외되었거나 길이가 바뀐 발생분은
`selection.stale-occurrence`로 거절한다. 제목만 바뀌거나 선택·뷰가 달라진 것은
드래그를 무효화하지 않으며 새 제목을 보존한다. 그룹 실패는 일부만 적용하지 않는다.

한 번의 편집/cut/paste/그룹 이동은 하나의 EditingSession 이력 단위다.
입력 거절과 잘못된 provider/programmer 예외는 다르다. 예를 들어 ID provider가
100회 충돌하면 공통 bounded allocator가 예외를 던지고 문서는 변경하지 않는다.
Hands는 성공한 결과에만 선택/rename aftercare를 수행하고 `onResult`로 결과를 전달한다.

### Clipboard 호환성과 외부 경계

`application/vnd.interactive-os.calendar+json`은 현재 materialized occurrence
clipboard 형식이다. `calendarClipboardFormat.parse(unknown)`는 잘못된 날짜·역전
구간·비정규 event를 거절하고, 직접 호출한 `paste`도 같은 검증을 수행한다.
anchor가 생략된 기존 payload는 첫 occurrence를 anchor로 읽는다.
알 수 없는 추가 JSON 필드는 유지하지만 새 버전/새 의미의 호환을 보장하지 않는다.

`copy()`는 빈 선택에서 null이다. `cut(capturedClipboard)`는 이미 기록한 payload의
발생분만 삭제한다. 그 사이 선택이 달라져도 대상을 다시 선택하지 않으며, 기록하지
않은 내용 변경이나 사라진 발생분이 있으면 거절한다. Web은 기록 실패 시 cut을
호출하지 않는다. Web의 별도 이벤트 기본 동작 정책은 이 프로파일을 확장하지 않는다.

paste는 길이와 상대 위치를 보존하고 새 ID를 부여한다. 외부 문서의 calendarId를
자동으로 다른 calendar로 치환하지 않는다. 명시적 재배치가 필요하면 기존 Editing API로
목적지를 지정한다.

```ts
import { createCalendarEditor } from "@interactive-os/json-document-editing";

const destination = createCalendarEditor(destinationDocument);
const result = destination.paste(clipboard, "2026-08-02T12:00", { calendarId: "personal" });
if (!result.ok) showError(result.code);
```

timezone/DST 변환, 서버 저장·동기화의 revision/충돌/재시도, AI command wire,
외부 calendar connector, recurrence의 범용 RRULE 호환, 프로파일 버전 협상과
독립 구현 conformance는 **TBD**다. 현재 앱에서 검증한 로컬 계약과 구분한다.

Usage는 [Calendar](/demo/calendar), public API는 [Editing API](/docs/api/editing)와
[Calendar Hands API](/docs/api/calendar)에 있다. Usage Source는 Editing의 validation,
event/series plan, selection move, projection과 Calendar Hands의 입력 연결까지 추적한다.
