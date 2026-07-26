# 튜토리얼: 작은 카드 편집기 만들기

작은 board state를 여섯-member v2 Core로 읽고, 검증하고, 변경하고, 구독합니다.
루트 package에는 schema provider나 UI framework가 필요하지 않습니다.

## 1. JSON document 만들기

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const initialBoard = {
  lists: [{
    id: "inbox",
    title: "Inbox",
    cards: [{
      id: "c1",
      title: "Write docs",
      status: "todo",
    }],
  }],
};

const document = createJSONDocument(initialBoard);
```

입력은 caller와 격리된 immutable JSON snapshot으로 소유됩니다. 이후 변경은
직접 대입하지 않고 `commit`으로만 수행합니다.

## 2. Pointer로 읽고 JSONPath로 찾기

정확한 한 위치는 JSON Pointer로 읽습니다.

```ts
const title = document.at("/lists/0/cards/0/title");

if (title.ok) {
  title.value;
}
```

여러 위치는 JSONPath로 찾습니다.

```ts
const todos = document.query(
  "$..cards[?(@.status=='todo')]",
);
```

JSONPath는 변경 언어가 아닙니다. Query 결과의 Pointer를 JSON Patch path로
사용합니다.

## 3. 변경 전에 확인하고 commit하기

```ts
const operations = [{
  op: "replace",
  path: "/lists/0/cards/0/status",
  value: "doing",
}] as const;

const capability = document.canPatch(operations);

if (capability.ok) {
  const result = document.commit(operations, {
    metadata: {
      origin: "card-status",
      label: "Start card",
    },
  });

  if (result.ok) {
    result.change.applied;
    document.value;
  }
}
```

`canPatch`는 state와 subscriber를 바꾸지 않습니다. `commit`은 ordered batch
전체를 적용하거나 아무것도 적용하지 않습니다.

## 4. 변경 구독하기

```ts
const unsubscribe = document.subscribe((change) => {
  console.log(change.applied);
  console.log(change.metadata);
});

document.commit([
  {
    op: "replace",
    path: "/lists/0/title",
    value: "Doing",
  },
]);

unsubscribe();
```

실패하거나 최종 state가 같은 no-op commit은 notification을 만들지 않습니다.

## 5. 순수 patch 적용하기

저장 전 preview나 import 검토처럼 document instance가 필요 없는 경우에는
`applyPatch`를 씁니다.

```ts
import { applyPatch } from "@interactive-os/json-document";

const preview = applyPatch(initialBoard, [{
  op: "add",
  path: "/lists/0/cards/-",
  value: {
    id: "c2",
    title: "Review API",
    status: "todo",
  },
}]);

if (preview.ok) {
  preview.value;
  preview.change.applied;
}
```

입력 state와 operation은 변경되지 않으며, 성공 result는 caller input과 격리됩니다.

## 6. 선택한 provider로 acceptance 연결하기

Core는 Zod를 요구하지 않습니다. 어떤 validator든 작은 acceptance callback으로
연결할 수 있습니다.

```ts
import * as z from "zod";
import {
  createJSONDocument,
  type JSONCapabilityResult,
  type JSONValue,
} from "@interactive-os/json-document";

const Board = z.object({
  lists: z.array(z.object({
    id: z.string(),
    title: z.string(),
    cards: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(["todo", "doing", "done"]),
    })),
  })),
});

function acceptsBoard(candidate: JSONValue): JSONCapabilityResult {
  const result = Board.safeParse(candidate);
  return result.success
    ? { ok: true }
    : {
        ok: false,
        code: "schema_violation",
        reason: JSON.stringify(result.error.issues),
      };
}

const acceptedDocument = createJSONDocument(initialBoard, {
  accepts: acceptsBoard,
});
```

Acceptance는 candidate를 허용하거나 거부할 뿐 commit-time transform을 몰래
state에 적용하지 않습니다.

## 7. Candidate Editing Session

Selection, clipboard, history와 `insert`, `replace`, `delete`, `move`,
`duplicate`, `copy`, `cut`, `paste`, `undo`, `redo`가 필요하면 선택적인
`/session` binding을 사용할 수 있습니다.

```ts
import * as z from "zod";
import {
  createJSONDocument as createJSONEditingSession,
} from "@interactive-os/json-document/session";

const Board = z.object({
  lists: z.array(z.object({
    id: z.string(),
    title: z.string(),
    cards: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(["todo", "doing", "done"]),
    })),
  })),
});

const session = createJSONEditingSession(
  Board,
  initialBoard,
  { history: 100, selection: true },
);

session.insert("/lists/0/cards/-", {
  id: "c2",
  title: "Review API",
  status: "todo",
});
session.undo();
```

위 `createJSONEditingSession`은 현재 동명 export를 구분하기 위한 local import
alias입니다. `/session`은 Candidate이며 portable v2 Core 계약이 아닙니다.
Pointer 배열을 copy하면 clipboard payload도 배열이라는 규칙 역시 이 Session
계층의 계약입니다.

## 8. React에서 쓰기

현재 `/react`의 `useJSONDocument`는 Candidate Editing Session adapter입니다.

```tsx
import { useJSONDocument } from "@interactive-os/json-document/react";

const session = useJSONDocument(Board, initialBoard, {
  history: 100,
  selection: true,
});
```

React 없이 Core를 쓰는 코드는 루트 `createJSONDocument`를 사용합니다. `/react`
hook을 여섯-member provider-neutral Projection adapter로 가정하지 않습니다.
