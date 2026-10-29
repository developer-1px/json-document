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

Canvas text supports persisted `widthMode` (auto/fixed; omitted means fixed).
`layoutObjectText` consumes an injected measurer for auto width and content height.
`layoutObjectDocument` owns container parent inference and nested flow layout;
`defaultObjectContainerPolicy` starts at 30% of the child's area. `parentId` and
rectangle `containerLayout` persist ownership, direction, gap and padding.
`objectSubtreeIds` expands a selection without moving descendants twice.
`planObjectOperation` accepts ObjectLayoutOptions so related text and container
geometry commit atomically. The Canvas Usage and Source demonstrate these APIs.

### Section placement

`kind: "section"` is a named free-layout container. Its label appears above its
bounds. Sections use the existing `parentId` hierarchy and subtree operations.
Children fully inside a section can be adopted by the container policy; their
coordinates remain unchanged. Explicit ownership on inserted children is retained.

```ts
import { findVacantObjectBounds } from "@interactive-os/json-document-object-document";
const bounds = findVacantObjectBounds(document.objects,
  { x: 0, y: 0, width: 1280, height: 720 }, 64);
```

The function finds the first horizontal slot at the requested row, including
section title space and the requested gap. It does not mutate or reserve data.
The Editing `section.create` intent allocates identity and commits the region.
Live Usage: `/applications/canvas`; Source: `src/object-placement.ts`.
