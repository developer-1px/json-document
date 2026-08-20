# Double-click

TBD.

Double-click은 `UIEvent.detail === 2`입니다. 글에서는 단어를 고르고,
목록·파일에서는 열거나 [Rename](affordance-rename.md)으로 갈 수 있습니다.
횟수 손 자체는 닫혀 있고, 뜻은 장르 Intent입니다.

```ts
import { clickCountAffordance } from "@interactive-os/json-document-affordance";

clickCountAffordance(1);
// "click"

clickCountAffordance(2);
// "double-click"

clickCountAffordance(3);
// "triple-click"
```

호스트는 장르 Intent만 가집니다. 글 단어 범위는 [Caret](affordance-caret.md)에
붙입니다.

닫는 손:
- click / dblclick, `detail` 2
- 글: 단어 범위
- 항목: 열기 또는 Rename

근거: [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
