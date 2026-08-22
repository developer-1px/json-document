# Not-allowed

Not-allowed는 지금 그 손을 쓸 수 없음을 커서로 말하는 손입니다. 비활성
대상은 `not-allowed`, 놓을 수 없는 자리는 `no-drop`입니다.

```ts
import { forbiddenCursor } from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent, itemId: string) {
  event.currentTarget.style.cursor = forbiddenCursor({
    allowed: hostCanEdit(itemId),
    dropping: drag !== null,
  });
}
```

이 손은 json-document가 아니라 호스트 커서입니다. 거절된 포인터는
`editor.dispatch`를 호출하지 않습니다.

닫는 손:
- `not-allowed`: 요청한 동작 불가
- `no-drop`: 이 자리에 놓을 수 없음
- 비활성 대상의 초점 가능 여부는 APG 규칙, 호스트가 가짐
- 평면 잠긴 객체: 일반 click으로 안 집어짐

근거: [CSS UI cursor `not-allowed` / `no-drop`](https://www.w3.org/TR/css-ui-4/#cursor), [APG disabled focus](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), Figma locked layers
