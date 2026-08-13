# Intent 가이드

Document editor에 블록 두 개를 만들고, 사용자의 클릭을 편집 요청으로 바꿔
보겠습니다. 같은 방식으로 블록을 추가하고 붙여넣을 수 있습니다.

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

화면에서 `welcome` 블록을 클릭하면 editor에는 클릭 event 자체보다 사용자가
하려는 일이 중요합니다. 이 요청을 `type`과 대상 ID가 있는 객체로 나타냅니다.

```ts
const intent = {
  type: "selection.set" as const,
  blockId: "welcome",
};
```

이 객체가 Intent입니다. `type`은 수행할 동작이고 나머지 필드는 그 동작에
필요한 값입니다.

## 2. 요청 보내기

`dispatch`에 Intent를 넘기면 editor가 현재 문서와 Selection을 기준으로
처리합니다.

```ts
const result = editor.dispatch(intent);

if (result.ok) {
  console.log(editor.selectedBlockIds); // ["welcome"]
}
```

`selection.set`은 Selection만 바꾸므로 블록의 text와 History는 유지됩니다.
없는 블록처럼 처리할 수 없는 대상을 보내면 failure result가 돌아옵니다.

```ts
const missed = editor.dispatch({
  type: "selection.set",
  blockId: "missing",
});

if (!missed.ok) {
  console.log(missed.code); // "selection.block-not-found"
}
```

## 3. 문서 값 바꾸기

블록을 추가할 때도 같은 진입점을 사용합니다.

```ts
const inserted = editor.dispatch({
  type: "block.insert",
  afterId: "welcome",
  text: "Inserted",
});

if (inserted.ok) {
  console.log(inserted.change?.applied);
}
```

이 요청은 JSON에 블록을 추가합니다. 값이 바뀌었으므로 History 항목이 생기고
`undo()`로 되돌릴 수 있습니다.

## 4. Clipboard 붙여넣기

복사는 현재 Selection을 읽어 Clipboard payload를 만듭니다. 만들어진
payload를 문서에 적용할 때는 `clipboard.paste` Intent를 보냅니다.

```ts
const clipboard = editor.copy();

if (clipboard) {
  editor.dispatch({
    type: "clipboard.paste",
    clipboard,
    afterId: "next",
  });
}
```

복사 자체는 값을 바꾸지 않고, 붙여넣기는 새 블록과 History 항목을 만듭니다.

Document 외의 editor가 받는 `type`과 각 필드는
[Intent 레퍼런스](intent.md)에 정리되어 있습니다.
