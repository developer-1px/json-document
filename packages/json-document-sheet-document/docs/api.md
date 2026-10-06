# Sheet Document 계약

`sheetDocumentSchema`가 표의 정본 런타임 스키마입니다. `SheetDocument`, `SheetRow`,
`SheetColumn`은 각 스키마에서 추론하므로 소비자별 타입이나 검증 규칙을 만들지 않습니다.
Zod 스키마를 직접 조합할 수 있으며 `assertSheetDocument`는 원본 객체를 교체하지 않고
JSON 값과 스키마를 검증합니다. 스키마의 parse는 검증된 값을 반환합니다.

문서는 `columns`와 `rows`, 행은 `id`와 `cells`, 열은 `id`와 `label`을 가집니다.
행·열 ID는 각 축에서 고유하고 비어 있지 않아야 합니다. 모든 행은 등록된 열의 셀을
가져야 합니다. 셀과 확장 속성은 JSON 값입니다. 기존 문서의 ID와 JSON 구조를 유지하며
추가 discriminator를 요구하지 않습니다. 저장된 width/height는 양의 유한수입니다.

`createSheetDocument`는 빈 셀을 가진 표를 만듭니다. 행·열 수, 제목과 초기 크기는
Host 정책 값으로 전달합니다. `createSheetRow`, `createSheetColumn`, `sheetColumnLabel`도
이 모듈이 소유합니다. Editing의 기존 타입·생성 함수 export는 호환 re-export입니다.

```ts
import {createSheetDocument, sheetDocumentSchema} from "@interactive-os/json-document-sheet-document";
const sheet = createSheetDocument({rows: 40, columns: 12, columnWidth: 120, rowHeight: 32});
const validated = sheetDocumentSchema.parse(sheet);
```

실행 Usage: [Sheet 앱](/applications/sheet), [표 편집](/demo/sheet).
Source: `packages/json-document-sheet-document/src/schema.ts`, `src/create.ts`.

```text
Sheet Document (schema -> types, validation, creation)
    |
Editing (Intent, selection, change plans, document binding)
    |
Affordance (input meaning) + Sheet Hand (presentation)
    |
Sheet app / Markdown projection / Canvas embedded document
```

이 모듈은 History, DOM, 키 입력, Canvas 좌표나 Markdown 원문을 소유하지 않습니다.
