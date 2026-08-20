# Delete

TBD.

Delete는 고른 대상을 없애는 손입니다. `resolveAffordanceKey`는 이미
Delete를 `delete` command로 닫습니다. Backspace와의 차이, 칸 비우기와
항목 제거의 차이는 아직 닫히지 않았습니다.

```ts
import { resolveAffordanceKey } from "@interactive-os/json-document-affordance";

resolveAffordanceKey({ key: "Delete", shiftKey: false, metaKey: false, ctrlKey: false });
// { type: "delete" }
```

남은 TBD:
- Backspace와 Delete
- 칸 비우기 vs 항목 제거 (Sheet vs Order)
- 지울 것이 없을 때

호스트는 장르 Intent만 가집니다. 값 삽입은 Hands입니다.

근거: 이미 닫힌 Delete chord, [APG](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
