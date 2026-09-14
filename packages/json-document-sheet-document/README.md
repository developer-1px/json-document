# Sheet Document

표의 정본 스키마·타입·검증·생성 모듈입니다. Bear, Canvas와 독립 Sheet는 같은
`SheetDocument`를 편집하고 저장 형식의 차이만 Editing의 문서 연결이 처리합니다.

- [계약과 Usage](docs/api.md)
- [Public API](docs/api-reference.md)

```ts
import {createSheetDocument, sheetDocumentSchema} from "@interactive-os/json-document-sheet-document";
const sheet = createSheetDocument({rows: 4, columns: 3});
const restored = sheetDocumentSchema.parse(JSON.parse(JSON.stringify(sheet)));
```
