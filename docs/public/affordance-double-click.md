# Double-click

Double-click은 `UIEvent.detail === 2`입니다. 글에서는 단어를 고르고,
목록·파일에서는 열거나 [Rename](affordance-rename.md)으로 갈 수 있습니다.
횟수 손 자체는 닫혀 있고, 뜻은 장르 Intent입니다.

```ts
import { clickCountAffordance } from "@interactive-os/json-document-affordance";

function onClick(event: MouseEvent, itemId: string) {
  if (clickCountAffordance(event.detail) !== "double-click") return;
  hostOpen(itemId);
}
```

호스트는 장르 Intent만 가집니다. 글 단어 범위는 [Caret](affordance-caret.md)에
붙입니다.

닫는 손:
- click / dblclick, `detail` 2
- 글: 단어 범위
- 항목: 열기 또는 Rename
- 평면: 그룹이면 한 단계 들어가기, 텍스트면 편집. [Activate](affordance-activate.md)

근거: [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail), Figma double-click or Enter = child
