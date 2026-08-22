# Calendar

TBD.

Calendar는 시간 격자 위 이벤트를 집는 손입니다. `c`는 만들고, `e`는
고치고, 일·주·월은 같은 이벤트의 보기입니다.

```ts
function onCalendarKeyDown(event: KeyboardEvent) {
  if (event.key === "c") {
    editor.dispatch({ type: "event.create" });
    return;
  }
  if (event.key === "e") {
    editor.dispatch({ type: "event.open" });
  }
}

function onGridDrop(start: string, end: string) {
  editor.dispatch({ type: "event.move", start, end });
}
```

호스트는 격자와 이벤트 블록을 그립니다. 반복 규칙은 Calendar Intent입니다.

닫는 손:
- `c`: 이벤트 생성
- `e`: 상세
- 드래그: 시작과 끝
- `1` / `2` / `3`: 일·주·월

근거: [Google Calendar](https://support.google.com/calendar/answer/37034)
