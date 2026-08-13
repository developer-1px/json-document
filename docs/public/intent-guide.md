# Intent 가이드

처음 쓰는 사람용 따라 하기입니다. 블록을 고르고, 넣고, 복사하고,
붙여 넣는 일을 코드와 화면에서 같이 봅니다.

타입과 동사 목록은 [Intent 레퍼런스](intent.md)에, 눌러 보는 화면은
[코어 컨셉](concepts.md)에 있습니다.

## 1. 하려는 일을 한 줄로 적는다

```ts
const editor = createDocumentEditor({
  blocks: [
    { id: "welcome", text: "Hello" },
    { id: "next", text: "Next" },
  ],
});
```

사용자가 `welcome`을 클릭했습니다. JSON 주소를 계산하지 않습니다.

```ts
{
  type: "selection.set",
  blockId: "welcome",
}
```

이게 Intent입니다. `type`은 동사, `blockId`는 대상입니다.

## 2. dispatch로 보낸다

```ts
const result = editor.dispatch({
  type: "selection.set",
  blockId: "welcome",
});

if (result.ok) {
  editor.selectedBlockIds;
  // ["welcome"]
}
```

고르기만 했으므로 블록 `text`는 그대로이고 실행 취소는 꺼져 있습니다.

없는 블록이면 거절됩니다. 문서와 선택은 그대로입니다.

```ts
const missed = editor.dispatch({
  type: "selection.set",
  blockId: "missing",
});

missed.ok;
// false
missed.code;
// "selection.block-not-found"
```

## 3. 값을 바꿀 때도 같은 방식이다

```ts
editor.dispatch({
  type: "block.insert",
  afterId: "welcome",
  text: "Inserted",
});
```

이제 JSON에 블록이 늘고 실행 취소를 누를 수 있습니다.

## 4. 오른쪽 패널에서 눌러 본다

[컨셉 페이지](concepts.md) 오른쪽이 같은 순서입니다.

1. 블록을 누른다. Intent 칸에 `selection.set`이 보인다. JSON은
   그대로다.
2. 복사를 누른다. Clipboard만 생긴다. Intent 칸은 그대로다.
3. 붙여넣기를 누른다. Intent 칸이 `clipboard.paste`가 되고 JSON에
   블록이 늘며 실행 취소가 켜진다.

복사와 실행 취소는 새 Intent가 아닙니다. 붙여넣기만 문서를 바꾸는
말입니다. 표 칸의 `cell.commit` 같은 나머지 동사는
[레퍼런스](intent.md)에 있습니다.
