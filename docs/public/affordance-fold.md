# Expand/Collapse

Expand/Collapse는 나무에서 가지를 접고 펼치는 손입니다. 오른쪽은 닫힌 부모를 펼치고,
왼쪽은 열린 부모를 접습니다. 펼칠 가지가 없으면 그 방향은 이웃 이동으로
남습니다. 위아래 화살표는 보이는 줄을 옮깁니다.

```ts
import {
  resolveAffordanceKey,
  treeAffordance,
} from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent, nodeId: string) {
  const command = resolveAffordanceKey(event);
  if (command?.type !== "move") return;
  const hand = treeAffordance(command, {
    expanded: expanded.has(nodeId),
    hasChildren: hasChildren(nodeId),
  });
  if (hand.type === "expand") {
    setExpanded((current) => new Set(current).add(nodeId));
    return;
  }
  if (hand.type === "collapse") {
    setExpanded((current) => {
      const next = new Set(current);
      next.delete(nodeId);
      return next;
    });
    return;
  }
  editor.dispatch({ type: "selection.set", nodeId, topology, mode: "replace" });
}
```

접힘 상태는 호스트가 가진 화면 상태입니다. editor는 보이는 줄 Topology만
받습니다. expand/collapse는 호스트 접힘 집합으로, move는 json-document
선택으로 갑니다.

## TBD

```ts
function onKeyDown(event: KeyboardEvent) {
  const hand = disclosureAffordance({
    key: event.key,
    expanded: expanded.has(sectionId),
  });
  if (hand === "expand") setExpanded((current) => new Set(current).add(sectionId));
  if (hand === "collapse") {
    setExpanded((current) => {
      const next = new Set(current);
      next.delete(sectionId);
      return next;
    });
  }
}
```

- Accordion / Disclosure의 Enter·Space 접힘
- `aria-expanded`와 호스트 접힘 집합의 동기
- 가로 나무에서 위·아래가 접힘인지 이웃인지
