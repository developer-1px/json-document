# Clipboard Adapter

Clipboard Adapter는 브라우저 clipboard event를 Editing의 copy, cut, paste에
연결합니다. 구조화된 MIME과 `text/plain`을 함께 기록하며, 처리하지 않은
event는 브라우저 기본 동작으로 돌려보냅니다.

```ts
const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  cut: () => editor.cut()?.result ?? { ok: false },
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});
```

`selectionOperationFromModifiers`는 보조 키를 `replace`, `extend`, `toggle`로
바꾸고, `textInputFromControl`은 입력 요소의 값과 caret을 관찰합니다.

## Live Demo

```live-demo
/adapters/clipboard
```
