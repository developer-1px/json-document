# Triple-click

TBD.

Triple-click은 `UIEvent.detail === 3`입니다. 글에서는 줄 또는 문단을
고릅니다. 항목 목록에서는 보통 쓰지 않습니다.

```ts
import { clickCountAffordance } from "@interactive-os/json-document-affordance";

function onClick(event: MouseEvent, blockId: string) {
  if (clickCountAffordance(event.detail) !== "triple-click") return;
  editor.dispatch({
    type: "selection.set",
    blockId,
    mode: "replace",
    offset: 0,
  });
}
```

호스트는 줄/문단 기하를 그립니다. 횟수는 [Double-click](affordance-double-click.md)과
같은 손을 씁니다.

닫는 손:
- click `detail` 3
- 글: 줄 / 문단 범위

근거: [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
