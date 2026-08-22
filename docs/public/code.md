# Code

TBD.

Code는 줄을 드래그해 코멘트를 다는 손입니다. 버퍼에 값을 타이핑하지
않습니다. 고른 줄 범위가 코멘트의 자리이고, 수정은 그 코멘트를 읽은
쪽이 적용합니다.

```ts
function onLinePointer(event: PointerEvent) {
  const range = hostLineRange(event);
  editor.dispatch({
    type: "comment.draft",
    startLine: range.start,
    endLine: range.end,
  });
}

function onCommentSubmit(text: string) {
  editor.dispatch({ type: "comment.add", text });
}
```

호스트는 읽기 줄과 코멘트 스레드를 그립니다. 패치 적용은 [Agent](agent.md)입니다.

닫는 손:
- 줄 번호 드래그, 또는 Shift+클릭: 범위
- 파란 코멘트 자리: 초안
- 제출: 코멘트 확정
- Resolve: 스레드 닫기

근거: [GitHub PR 코멘트](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request)
