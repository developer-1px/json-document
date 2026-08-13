# Editor와 Intent 만들기

먼저 블록 두 개를 가진 Document editor를 만듭니다. 그런 다음 사용자의
클릭을 편집 요청으로 바꿔 `dispatch`에 넘기겠습니다. 여기서 만든 editor는
이후 문서에서도 계속 사용합니다.

## 1. Editor 만들기

```ts
import { createDocumentEditor } from "@interactive-os/json-document-editing";

const editor = createDocumentEditor({
  blocks: [
    { id: "welcome", text: "Hello" },
    { id: "next", text: "Next" },
  ],
});
```

화면에서 `welcome` 블록을 클릭하면 editor에는 클릭 이벤트 자체보다 사용자가
하려는 일이 중요합니다. 이 요청을 `type`과 대상 ID가 있는 객체로 나타냅니다.

```ts
const intent = {
  type: "selection.set" as const,
  blockId: "welcome",
};
```

이런 요청의 공통 모양을 `EditingIntent`라고 하며, 줄여서 Intent라고
부릅니다. `type`은 수행할 동작이고 나머지 필드는 그 동작에 필요한 값입니다.

## 2. 요청 보내기

`dispatch`에 Intent를 넘기면 editor가 현재 문서와 편집 상태를 기준으로
처리합니다. 반환되는 `EditingResult`에서 성공 여부를 확인할 수 있습니다.

```ts
const result = editor.dispatch(intent);

if (result.ok) {
  console.log(editor.selectedBlockIds); // ["welcome"]
}
```

성공한 `selection.set`은 Selection만 바꾸므로 블록의 text와 History는
유지됩니다. 없는 블록처럼 처리할 수 없는 대상을 보내면 실패 결과가
돌아옵니다.

```ts
const missed = editor.dispatch({
  type: "selection.set",
  blockId: "missing",
});

if (!missed.ok) {
  console.log(missed.code); // "selection.block-not-found"
}
```

같은 `editor`에 Intent를 계속 보내며 편집 상태를 바꿀 수 있습니다. 방금
바뀐 [Selection](selection.md)이 무엇을 저장하는지부터 확인합니다. editor가
받을 수 있는 전체 `type`과 각 필드는 [Intent 레퍼런스](intent.md)에 정리되어
있습니다.
