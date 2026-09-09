# Object Document Type

`@interactive-os/json-document-object-document`는 ID가 있는 Object 문서와
한 장짜리 Canvas 프로파일의 모델·검증·의미 연산·projection을 소유합니다.
Core만 의존하며 Editing, Selection, React, DOM 없이 사용할 수 있습니다.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import { parseCanvasDocument, planObjectOperation, serializeCanvasDocument } from "@interactive-os/json-document-object-document";

const value = parseCanvasDocument('{"profile":"canvas/1","width":1280,"height":720,"objects":[]}');
const document = createJSONDocument(value);
const plan = planObjectOperation(value, { type: "insert", objects: [
  { id: "title", kind: "text", x: 80, y: 80, width: 640, height: 96, label: "Hello", color: "#253044", fontSize: 48 },
] });
if (plan.ok) document.commit(plan.operations);
serializeCanvasDocument(parseCanvasDocument(JSON.stringify(document.value)));
```

편집은 `createObjectEditor`, React 제품은 `CanvasHand`를 조합합니다.
기존 Editing의 `ObjectDocument`/`DocumentObject` export는 같은 타입을 가리키는
호환 경로입니다. RC이며 안정된 wire 표준이나 PPTX 지원을 선언하지 않습니다.

[API와 프로파일 계약](docs/api.md) · [Usage 및 Source](https://developer-1px.github.io/json-document/docs/api/canvas)
