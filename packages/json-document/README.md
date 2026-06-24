# json-document

Zod schema로 보호되는 JSON state를 읽고, 바꾸고, 선택하고, 복사하고,
붙여넣고, 되돌리기 위한 headless document layer입니다.

`json-document`는 UI component library, CRUD framework, app state manager가
아닙니다. Form, CMS block, kanban board, outliner, settings editor처럼 서로
다른 제품이 반복해서 구현하는 document editing core를 제공합니다.

```txt
schema -> document -> pointer/query -> can* -> change -> result
```

- 공식 사이트: https://developer-1px.github.io/json-document/
- GitHub Wiki: https://github.com/developer-1px/json-document/wiki

## 왜 json-document인가

JSON을 단순 data blob으로만 다루면 값 하나를 바꾸는 일은 쉽습니다. 하지만 실제
제품에서는 곧 더 많은 질문이 생깁니다.

- 이 변경이 schema를 통과하는가?
- 실행 전에 버튼이나 command palette에서 가능 여부를 알 수 있는가?
- 실패하면 어떤 `code`, `pointer`, `violations`로 설명할 수 있는가?
- 선택된 항목을 삭제, 이동, 복제할 때 source는 어떻게 정해지는가?
- 여러 항목을 copy/cut/paste하면 array insertion target에서 어떻게 들어가는가?
- undo/redo는 value뿐 아니라 selection도 함께 복원하는가?
- React 밖에서도 같은 document behavior를 쓸 수 있는가?

`json-document`는 이 질문들을 UI 밖의 stable core로 옮깁니다. 앱은 rendering,
focus, keyboard, drag/drop, network sync를 계속 소유하고, `json-document`는
schema-safe JSON document semantics를 소유합니다.

## 설치

```sh
npm install @interactive-os/json-document zod
```

`zod`는 peer dependency입니다. React 앱에서만
`@interactive-os/json-document/react`를 import합니다.

## 60초 시작

```ts
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document";

const Card = z.object({
  id: z.string(),
  title: z.string().min(1),
  status: z.enum(["todo", "doing", "done"]),
});

const doc = createJSONDocument(Card, {
  id: "c1",
  title: "Write docs",
  status: "todo",
}, {
  history: 100,
  selection: true,
});

const canChange = doc.canReplace("/status", "doing");

if (canChange.ok) {
  doc.replace("/status", "doing");
}
```

모든 실행 API는 성공 또는 실패 result를 반환합니다. UI는 같은 `can*` result를
사용해 button disabled, command availability, validation message를 만들 수
있습니다.

```ts
const result = doc.canReplace("/title", "");

if (!result.ok) {
  result.code;
  result.reason;
  result.violations;
}
```

## 작업별 진입점

| 하고 싶은 일 | 공개 API |
| --- | --- |
| headless document 만들기 | `createJSONDocument(schema, initial, options?)` |
| React에서 같은 표면 쓰기 | `useJSONDocument(schema, initial, options?)` |
| 현재 값 읽기 | `doc.value`, `doc.lastPatch` |
| 한 위치 읽기 | `doc.at(pointer)` |
| 하위 항목 나열 | `doc.entries(pointer)` |
| 여러 위치 찾기 | `doc.find(jsonPath)`, `doc.query(jsonPath)` |
| 값 삽입, 교체, 삭제, 이동 | `doc.insert(...)`, `doc.replace(...)`, `doc.delete(...)`, `doc.move(...)` |
| 실행 전 확인 | `doc.canPatch`, `doc.canFind`, `doc.canInsert`, `doc.canReplace`, `doc.canDelete`, `doc.canMove`, `doc.canDuplicate`, `doc.canCopy`, `doc.canCut`, `doc.canPaste`, `doc.canUndo`, `doc.canRedo` |
| sibling 복제 | `doc.duplicate(pointer?, options)` |
| 선택 상태 저장 | `doc.selection` |
| copy, cut, paste | `doc.copy(...)`, `doc.cut(...)`, `doc.paste(...)` |
| 외부 payload 삽입 | `doc.insert(target, value, options?)` |
| undo, redo | `doc.undo()`, `doc.redo()`, `doc.history` |
| 위치별 schema 확인 | `doc.schema.at`, `doc.schema.kind`, `doc.schema.describe`, `doc.schema.accepts` |

## 1.0 public contract

1.x에서 고정되는 것은 export 이름만이 아닙니다. 사용자 코드가 의존하는 result
shape, error code, signature/call shape, selection/history semantics도 public
contract입니다.

- public import는 `@interactive-os/json-document`와
  `@interactive-os/json-document/react`입니다.
- 실패 분기는 `reason` 문구가 아니라 stable `code`와 구조로 합니다.
- 기본값은 `strict: false`입니다. 실패는 throw가 아니라 result로 돌아옵니다.
- `doc.undo()`와 `doc.redo()`는 top-level command이며
  `JSONCapabilityResult`를 반환합니다.
- `createJSONDocument`와 `useJSONDocument`는 trusted/untrusted initial overload를
  유지합니다.
- `doc.insert(value)`, `doc.insert(target, value, options)`,
  `doc.move(source, target)`, `doc.move(target)`,
  `doc.paste(target, options)` call shape는 public API입니다.
- `commit(..., { selectionAfter })`는 patch와 final selection을 같은 history
  entry에 기록합니다.

상세 API와 method reference는 GitHub Wiki에 있습니다.

- Core API Reference: https://github.com/developer-1px/json-document/wiki/Core-API-Reference
- JSONDocument Method Reference: https://github.com/developer-1px/json-document/wiki/JSONDocument-Method-Reference
- 1.0 Semantic Contract: https://github.com/developer-1px/json-document/wiki/1.0-Semantic-Contract

## 핵심 규칙

- Patch path와 source는 JSON Pointer입니다.
- JSONPath는 값을 찾는 언어이며 직접 변경하지 않습니다.
- `doc.at(pointer)`는 raw value가 아니라 `ReadResult`를 반환합니다.
- `can*`는 boolean이 아니라 이유 있는 capability result입니다.
- `doc.duplicate`, `doc.cut`, `doc.paste`는 성공하면 즉시 적용됩니다.
- 성공 결과의 `applied` patch는 이미 적용된 record이므로 다시 `commit`하지 않습니다.
- Pointer 배열을 copy/cut하면 clipboard payload도 배열입니다.
- Multi-source clipboard payload를 array insertion target에 paste하면 기본적으로
  item별 sibling insert가 됩니다.
- Tree semantics는 app-owned입니다. json-document는 JSON을 검증하고 mutate합니다.

## Selection, clipboard, history

Selection은 DOM focus가 아니라 JSON-safe document state입니다.

```ts
doc.selection?.selectRanges([
  "/lists/0/cards/0",
  "/lists/0/cards/1",
]);

doc.copy(doc.selection?.selectedPointers ?? []);
doc.paste("/lists/1/cards/-");
```

Clipboard는 browser clipboard가 아니라 document instance 안의 headless JSON
payload buffer입니다. Browser system clipboard는
`@interactive-os/json-document-clipboard-web` extension에서 조립합니다.

History는 사용자 의도 단위로 묶을 수 있습니다.

```ts
doc.history.transaction({ label: "bulk status change" }, () => {
  doc.replace("/status", "doing");
  doc.replace("/title", "In progress");
});

doc.undo();
doc.redo();
```

구조 편집 후 다음 selection을 command가 정확히 알고 있으면 `selectionAfter`를
명시합니다.

```ts
doc.commit([
  { op: "replace", path: "/status", value: "done" },
], {
  label: "complete card",
  selectionAfter: "/status",
});
```

## Placement targets

삽입/이동 위치를 이미 알고 있으면 `/items/-`나 `/lists/1/cards/-` 같은 exact
Pointer를 그대로 넘깁니다.

```ts
doc.insert("/items/-", item);
doc.move("/items/0", "/items/2");
```

Array container 안에 append할 때는 `{ into }`, array item 기준으로 배치할 때는
`{ before }`, `{ after }`를 사용합니다. 기존 값을 바꾸는 작업은 `replace`이고,
document clipboard paste만 `{ replace: pointer }`를 추가로 지원합니다.

```ts
doc.insert({ into: "/items" }, item);
doc.move("/items/0", { after: "/items/2" });
doc.paste({ replace: "/items/0" });
```

삽입 위치를 직접 지정하려면 placement object를 만들지 말고 pointer 문자열을
그대로 넘깁니다.

## React — `useJSONDocument`

```tsx
import { z } from "zod";
import { useJSONDocument } from "@interactive-os/json-document/react";

const Schema = z.object({
  title: z.string(),
  tasks: z.array(z.object({ id: z.string(), done: z.boolean() })),
});

export function App() {
  const doc = useJSONDocument(Schema, { title: "", tasks: [] }, { history: 50 });

  return (
    <>
      <input
        value={doc.value.title}
        onChange={(event) =>
          doc.patch({ op: "replace", path: "/title", value: event.target.value })
        }
      />
      <button
        onClick={() =>
          doc.insert("/tasks/-", { id: "task-1", done: false })
        }
      >
        insert task
      </button>
      <button onClick={() => doc.undo()} disabled={!doc.canUndo().ok}>
        undo
      </button>
    </>
  );
}
```

Root package는 React-free입니다. React hook은 별도 entrypoint에만 있습니다.

## Official extensions

공식 extension은 core에 plugin 등록하지 않고 public `JSONDocument` surface를
함수로 조립합니다.

```ts
import { createCollection } from "@interactive-os/json-document-collection";
import { createOutline } from "@interactive-os/json-document-outline";
import { createSchemaForm } from "@interactive-os/json-document-schema-form";
import { createFormDraft } from "@interactive-os/json-document-form-draft";
import { createProtectedRanges } from "@interactive-os/json-document-protected-ranges";
import { createSnippets } from "@interactive-os/json-document-snippets";
import { createDirtyState } from "@interactive-os/json-document-dirty-state";
import { createBulkEdit } from "@interactive-os/json-document-bulk-edit";
import { createPatchLog } from "@interactive-os/json-document-patch-log";
import { createDocumentPersistence } from "@interactive-os/json-document-persist-web";
import { createIdResolver } from "@interactive-os/json-document-id-resolver";
import { createPatchPreview } from "@interactive-os/json-document-patch-preview";
import { createSearchReplace } from "@interactive-os/json-document-search-replace";
import { createGrouping } from "@interactive-os/json-document-grouping";
import { createProposedChanges } from "@interactive-os/json-document-proposed-changes";
import { createComments } from "@interactive-os/json-document-comments";
import { createWebClipboard } from "@interactive-os/json-document-clipboard-web";
import { createContentEditableAdapter } from "@interactive-os/json-document-contenteditable-web";
import { useContentEditable } from "@interactive-os/json-document-contenteditable-react";
```

공식 package는 현재 `packages/*`에 있는 extension만 뜻합니다.
`labs/extensions/*`는 후보이며 public API로 약속하지 않습니다.

Extension guide: https://github.com/developer-1px/json-document/wiki/Labs-and-Extensions

## 순수 core

Root helper는 React-free이며 외부 JSON 경계에서 유용합니다.

```ts
import * as z from "zod";
import { applyPatch } from "@interactive-os/json-document";

const Schema = z.object({ title: z.string(), tags: z.array(z.string()) });
const initial = { title: "draft", tags: [] };

const r = applyPatch(Schema, initial, [
  { op: "add", path: "/tags/-", value: "docs" },
  { op: "replace", path: "/title", value: "final" },
]);
```

## 직렬화

State, operation, selection snapshot, patch record는 JSON입니다.

```ts
import * as z from "zod";

const Schema = z.object({ title: z.string() });
const state = { title: "draft" };

const json = JSON.stringify(state);
const restored = Schema.parse(JSON.parse(json));
const safe = Schema.safeParse(JSON.parse(json));
```

Operation은 `application/json-patch+json`으로 보낼 수 있습니다.

```ts
const operations = [{ op: "replace", path: "/title", value: "final" }];
const body = JSON.stringify(operations);

body satisfies string;
```

## 문서

- Overview: https://developer-1px.github.io/json-document/docs
- Tutorial: https://developer-1px.github.io/json-document/docs/tutorial
- API reference: https://developer-1px.github.io/json-document/docs/api
- Recipes: https://developer-1px.github.io/json-document/docs/recipes
- Wiki: https://github.com/developer-1px/json-document/wiki
