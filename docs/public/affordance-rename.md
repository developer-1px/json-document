# Rename

TBD.

Rename은 고른 대상의 레이블을 고치는 손입니다. F2, Enter(어떤 목록),
느린 두 번 누르기가 같은 손을 엽니다. Escape는 [Escape](affordance-cancel.md)입니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- F2
- 느린 두 번 누르기 (빠른 두 번은 [Double-click](affordance-double-click.md))
- Enter로 확정, Escape로 취소

호스트는 레이블 필드를 그립니다. 글 편집 자체는 Hands·캐럿입니다.

근거: Finder/Explorer/VS Code 관례, [UI Events click detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
