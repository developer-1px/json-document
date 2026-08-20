# Expand/Collapse

Expand/Collapse는 나무에서 가지를 접고 펼치는 손입니다. 오른쪽은 닫힌 부모를 펼치고,
왼쪽은 열린 부모를 접습니다. 펼칠 가지가 없으면 그 방향은 이웃 이동으로
남습니다. 위아래 화살표는 보이는 줄을 옮깁니다.

```ts
import { treeAffordance } from "@interactive-os/json-document-affordance";

treeAffordance(
  { type: "move", direction: "right" },
  { expanded: false, hasChildren: true },
);
// { type: "expand" }

treeAffordance(
  { type: "move", direction: "left" },
  { expanded: true, hasChildren: true },
);
// { type: "collapse" }
```

접힘 상태는 호스트가 가진 화면 상태입니다. editor는 보이는 줄 Topology만
받습니다. 호스트는 `expand` / `collapse`를 접힘 집합에 적용하고, `move`만
Topology 이웃으로 보냅니다.

## TBD

```ts
import { disclosureAffordance } from "@interactive-os/json-document-affordance";

disclosureAffordance({ key: "Enter", expanded: false });
// "expand"

disclosureAffordance({ key: "Enter", expanded: true });
// "collapse"
```

- Accordion / Disclosure의 Enter·Space 접힘
- `aria-expanded`와 호스트 접힘 집합의 동기
- 가로 나무에서 위·아래가 접힘인지 이웃인지
