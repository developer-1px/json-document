# 튜토리얼: 작은 카드 편집기 만들기

Inbox에 카드 하나를 두고, 제목을 읽고, 상태를 바꾸고, 그 변경을 구독합니다.

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

입력 JSON은 document가 복사해서 가집니다. 이후에는 `commit`으로만 바꿉니다.

## 2. Pointer로 읽고 JSONPath로 찾기

한 곳은 JSON Pointer로 읽습니다.

```ts
const title = document.at("/lists/0/cards/0/title");

if (title.ok) {
  title.value;
}
```

여러 곳은 JSONPath로 찾습니다.

```ts
const todos = document.query(
  "$..cards[?(@.status=='todo')]",
);
```

JSONPath는 찾기만 합니다. 바꿀 때는 결과로 받은 Pointer를 JSON Patch의
`path`에 넣습니다.

## 3. 확인하고 적용하기

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

`validatePatch`는 미리 검사만 합니다. `commit`은 목록 전체를 적용하거나
아무것도 적용하지 않습니다.

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

실패한 commit이나 값이 그대로인 commit은 listener를 부르지 않습니다.

## 5. document 없이 preview하기

저장 전 미리보기처럼 document가 필요 없으면 `applyPatch`를 씁니다.

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

입력 값과 operation은 그대로 남고, 성공 결과는 새 값입니다.

## 6. 스키마 붙이기

잘못된 보드가 들어가지 않게 `validate`를 넘길 수 있습니다.

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

`validate`는 허용하거나 거절합니다. Zod가 만든 변환 값을 몰래 넣지 않습니다.
같은 일을 패키지로 쓰려면 `@interactive-os/json-document-zod`의
`createZodValidator`를 보면 됩니다.

다음으로 React에 붙이려면 [Connectors](connectors.md), 함수 목록은
[API](api.md)입니다.
