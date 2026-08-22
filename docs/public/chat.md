# Chat

TBD.

Chat은 DM 말풍선으로 메시지를 주고받는 손입니다. 내 말은 한쪽에, 상대
말은 다른 쪽에 붙고, 이어진 말은 묶입니다. Enter는 보내고, Shift+Enter는
composer 안에서 줄을 바꿉니다.

```ts
function onComposerKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter" && event.shiftKey) return;
  if (event.key === "Enter") {
    event.preventDefault();
    editor.dispatch({ type: "message.send", text: composer });
  }
}
```

호스트는 말풍선과 composer를 그립니다. 생성 스트림은 [Agent](agent.md)입니다.

닫는 손:
- Enter: 메시지 확정
- Shift+Enter: composer 줄바꿈
- 말풍선 좌우, 연속 묶기

근거: [Apple Messages](https://support.apple.com/guide/messages/ichtc78b3bff/mac)
