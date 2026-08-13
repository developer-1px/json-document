# 작은 카드 문서 만들기

Inbox에 카드 하나가 있는 문서를 만들고 제목을 읽어 보겠습니다. 이어서 카드
상태를 바꾸고, 적용된 변경을 구독합니다.

## 1. 문서 만들기

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

`document.value`에는 생성할 때 넘긴 JSON이 들어 있습니다. document는 이 값을
복사해 보관하므로 이후에 `initialBoard`를 수정해도 현재 값은 달라지지
않습니다.

## 2. 필요한 값 찾기

카드 제목의 위치를 알고 있다면 JSON Pointer로 읽습니다.

```ts
const title = document.at("/lists/0/cards/0/title");

if (title.ok) {
  console.log(title.value); // "Write docs"
}
```

위치를 모르고 조건만 알고 있다면 JSONPath로 찾습니다. 다음 쿼리는 상태가
`todo`인 카드를 모두 찾습니다.

```ts
const todos = document.query(
  "$..cards[?(@.status=='todo')]",
);

if (todos.ok) {
  console.log(todos.pointers); // ["/lists/0/cards/0"]
}
```

쿼리 결과는 JSON Pointer 목록입니다. 찾은 카드의 상태를 바꿀 때 이 주소를
JSON Patch의 `path`로 사용합니다.

## 3. 변경 검사하고 적용하기

카드를 시작한 상태로 바꿀 operation을 만듭니다.

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
    console.log(document.at("/lists/0/cards/0/status"));
    console.log(result.change.applied);
  }
}
```

`validatePatch`는 operation을 적용할 수 있는지만 확인합니다. `commit`이
성공한 뒤에 `document.value`를 읽으면 바뀐 상태를 확인할 수 있습니다.

## 4. 적용된 변경 구독하기

화면이나 저장소가 변경을 받아야 한다면 listener를 등록합니다.

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

listener는 성공해서 값이 달라진 `commit`만 받습니다. 더 이상 변경을 받을
필요가 없으면 반환된 함수를 호출해 구독을 끊습니다.

## 5. 문서를 만들지 않고 변경 결과 보기

저장 전 미리보기처럼 현재 상태를 보관할 필요가 없다면 `applyPatch`로 JSON과
operation만 계산할 수 있습니다.

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
  console.log(preview.value);
}
```

`initialBoard`는 그대로 남고, 계산된 JSON은 성공 결과의 `value`에 들어
있습니다.

## 6. 문서 규칙 추가하기

현재 예제에서는 `status`에 어떤 문자열도 넣을 수 있습니다. 세 가지 상태만
허용하려면 문서를 만들 때 validator를 연결합니다.

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

이제 규칙에 맞지 않는 변경은 실패 결과를 돌려주고 문서 값은 유지됩니다.
Zod를 직접 연결하는 대신 `@interactive-os/json-document-zod`의
`createZodValidator`를 사용할 수도 있습니다.

지금까지 만든 JSON Document에 선택과 실행 취소 같은 편집 기능을 더하는
순서는 [Concepts](concepts.md)에서 이어집니다.
