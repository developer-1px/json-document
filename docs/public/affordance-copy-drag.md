# Duplicate

TBD.

Duplicate는 수정 키를 누른 채 드래그하면 원본을 복제하는 손입니다.
`copy` / `alias` 커서가 이 손을 가리킵니다.

```ts
import {
  dragOperation,
  dropAffordance,
} from "@interactive-os/json-document-affordance";

dragOperation({ altKey: false, metaKey: false, ctrlKey: false });
// "move"

dragOperation({ altKey: true, metaKey: false, ctrlKey: false });
// "copy"

dropAffordance({
  canDrop: true,
  operation: dragOperation({ altKey: true, metaKey: false, ctrlKey: false }),
});
// { accept: true, cursor: "copy" }
```

값의 클립보드 복사/붙이기는 Hands입니다. 이 손은 포인터 복제입니다.

닫는 손:
- Alt/Option + 드래그 → copy
- 커서 `copy` 또는 `alias`

근거: [Apple HIG pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor `copy` / `alias`](https://www.w3.org/TR/css-ui-4/#cursor)
