# Rename

TBD.

Rename은 고른 대상의 레이블을 고치는 손입니다. F2와 느린 double-click이
같은 손을 엽니다. Escape는 [Escape](affordance-cancel.md)입니다.

```ts
import { renameAffordance } from "@interactive-os/json-document-affordance";

renameAffordance({ key: "F2" });
// "begin"

renameAffordance({ type: "pointer", detail: 2, intervalMs: 900 });
// "begin"

renameAffordance({ type: "pointer", detail: 2, intervalMs: 200 });
// null

renameAffordance({ key: "Enter" });
// "commit"

renameAffordance({ key: "Escape" });
// "cancel"
```

호스트는 레이블 필드를 그립니다. 글 편집 자체는 Hands와 [Caret](affordance-caret.md)입니다.

닫는 손:
- F2
- 느린 double-click (빠른 것은 [Double-click](affordance-double-click.md))
- Enter로 확정, Escape로 취소

근거: Finder/Explorer/VS Code, [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
