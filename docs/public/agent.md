# Agent

TBD.

Agent는 버블 없는 트랜스크립트에 응답이 살아 나타나는 손입니다. 줄은
아바타와 이름과 시각이 있는 행이고, 생성 중인 행은 think·stream·tool·done으로
움직입니다. 애니메이션이 이 손의 전형입니다.

```ts
function onComposerKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter" && event.shiftKey) return;
  if (event.key === "Enter") {
    event.preventDefault();
    editor.dispatch({ type: "message.send", text: composer });
  }
  if (event.key === "Escape") {
    editor.dispatch({ type: "agent.cancel" });
  }
}

function onDelta(delta: string) {
  editor.dispatch({ type: "agent.stream", delta });
}

function onStatus(status: "think" | "tool" | "done") {
  editor.dispatch({ type: "agent.status", status });
}
```

호스트는 행과 스트림 애니메이션을 그립니다. 말풍선은 [Chat](chat.md)입니다.
도구가 만지는 값은 다른 Hands로 갑니다.

닫는 손:
- Enter: 사용자 턴 확정
- Shift+Enter: composer 줄바꿈
- 델타 스트림: 생성 중인 행
- think / tool / done: 상태 애니메이션
- Esc: 생성 중단

근거: [Slack 메시지 표시](https://slack.com/help/articles/213893898-Change-how-messages-are-displayed), [OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
