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

카드 상태를 `doing`으로 바꿀 operation을 만듭니다.

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

이 JSON Document에 선택과 실행 취소를 더하려면
[Concepts](concepts.md)의 Editing 단계로 넘어갑니다.
