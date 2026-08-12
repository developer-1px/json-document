# 튜토리얼: 작은 카드 편집기 만들기

작은 board state를 여섯-member Core로 읽고, 검증하고, 변경하고, 구독합니다.
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

const validation = document.validatePatch(operations);

if (validation.ok) {
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

`validatePatch`는 state와 subscriber를 바꾸지 않습니다. `commit`은 ordered batch
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

## 6. 선택한 validator 연결하기

Core는 Zod를 요구하지 않습니다. 어떤 validator든 canonical `validate`
callback으로 연결할 수 있습니다.

```ts
import * as z from "zod";
import {
  createJSONDocument,
  type JSONPatchValidationResult,
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

function validateBoard(candidate: JSONValue): JSONPatchValidationResult {
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
  validate: validateBoard,
});
```

Acceptance는 candidate를 허용하거나 거부할 뿐 commit-time transform을 몰래
state에 적용하지 않습니다.

Selection, clipboard와 history는 optional editing companion이 조합합니다. React
binding은 Root subpath가 아니라 공식 `@interactive-os/json-document-react`
Connector로 제공합니다. DOM lifecycle과 제품별 의미는 host가 소유합니다.
