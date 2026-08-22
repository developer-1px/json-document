# Slides

TBD.

Slides는 순서 있는 페이지와 그 위 객체를 집는 손입니다. 필름스트립에서
슬라이드를 고르고 옮기고, 캔버스에서 도형을 넛지하고 그룹합니다. Present는
편집과 갈립니다.

```ts
function onFilmstripSelect(slideId: string) {
  editor.dispatch({ type: "selection.set", slideId, mode: "replace" });
}

function onCanvasNudge(event: KeyboardEvent) {
  editor.dispatch({
    type: "object.translate",
    objectIds: selectedIds,
    dx: event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0,
    dy: event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0,
  });
}
```

호스트는 필름스트립과 한 슬라이드 캔버스를 그립니다. 발표 모드는 장르
Intent입니다.

닫는 손:
- 필름스트립 클릭, 드래그: 슬라이드 순서
- 캔버스 클릭, 넛지, 그룹: 객체
- Present / Esc: 발표와 편집

근거: [Google Slides](https://support.google.com/docs/answer/1696717?hl=en&co=GENIE.Platform%3DDesktop)
