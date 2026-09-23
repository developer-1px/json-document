# @interactive-os/json-document-calendar-document

Calendar Document Type의 RC 공개 소유자입니다. 문서 모델, JSON/Calendar 검증,
입력 독립 의미 연산과 occurrence/기간 projection을 제공합니다. 의존성은
JSON Document와 Temporal이며 Editing, Selection, React 또는 DOM을 요구하지 않습니다.

```ts
import { applyPatch } from "@interactive-os/json-document";
import {
  validateCalendarDocument, planCalendarEventEdit, projectCalendarOccurrences,
} from "@interactive-os/json-document-calendar-document";

const validation = validateCalendarDocument(document);
if (!validation.ok) throw new Error(validation.reason);
const plan = planCalendarEventEdit(document.events, {
  type: "event.move", eventId: "meeting", start: "2026-08-03T10:00",
}, { allocateId: () => crypto.randomUUID(), calendarIds: new Set(document.calendars.map(calendar => calendar.id)) });
if (plan.ok) {
  const result = applyPatch(document, plan.operations);
  const occurrences = projectCalendarOccurrences(plan.events, "2026-08-03", "2026-08-04");
}
```

정본 [API 및 값 계약](docs/api.md)은 이 package에 둡니다. 사이트의
[Calendar Document API](/docs/api/calendar-document), [Usage / Source](/editors#calendar-editor),
Usage의 Source 탭에서 실제 소유자와 소비 경로를 확인할 수 있습니다.

`json-document-editing`은 이 package의 연산 결과를 Selection, Clipboard와
History에 연결합니다. `json-document-calendar`는 Web/Affordance/React와 UI를
조합합니다. 기존 Editing root의 문서 타입·projection export는 동일 구현의
호환 경로이며, 새 직접 소비자는 이 package에서 import합니다.

`tests/calendar-document.test.ts`는 editor 없는 소비를 검증합니다.
Editing의 `tests/conformance/calendar-grammar.test.ts`는 동일 연산을 사용하는
선택·복사·붙여넣기·삭제·Undo/Redo의 공통 규칙을 검증합니다. Document Type
소유권의 확정은 wire 프로토콜의 Stable 승격이나 독립 구현 간 호환 보장이 아닙니다.
