# Interaction Adapter

Pointer Events와 HTML Drag and Drop은 서로 다른 Web platform lifecycle입니다.
`@interactive-os/json-document-web`은 두 lifecycle의 active session과
preview·commit·cancel 전이를 닫고, geometry와 제품 Intent는 Host에 남깁니다.

## Pointer Session

```ts
import { createWebPointerSession } from "@interactive-os/json-document-web";

const pointer = createWebPointerSession<DragPreview>({
  onPreview: renderPreview,
  onCommit: commitProductIntent,
  onCancel: clearPreview,
});

function onPointerDown(event: PointerEvent) {
  pointer.begin(event.currentTarget, event.pointerId, initialPreview(event));
}

function onPointerMove(event: PointerEvent) {
  pointer.preview(event.pointerId, (state) => previewFromPoint(state, event));
}

function onPointerUp(event: PointerEvent) {
  pointer.commit(event.pointerId);
}

function onPointerCancel(event: PointerEvent) {
  pointer.cancel(event.pointerId);
}
```

### API Reference

#### `createWebPointerSession(options?)`

한 `pointerId`의 capture lifecycle을 소유합니다. `begin`은
`setPointerCapture`를 호출하고, `preview`는 같은 pointer의 state만 갱신하며,
`commit`과 `cancel`은 capture를 해제한 뒤 대응 callback을 호출합니다.
새 pointer가 기존 session을 대체하면 이전 session은 `superseded`로
취소됩니다. `pointercancel`은 `cancel`, `lostpointercapture`는
`lost-capture` reason으로 연결합니다.

## Drag and Drop Session

```ts
import { createWebDragDropSession } from "@interactive-os/json-document-web";

const dragDrop = createWebDragDropSession<CardId, DropTarget>({
  onPreview: showDropPreview,
  onCommit: (cardId, target) => moveCard(cardId, target),
  onCancel: clearDropPreview,
});

function onDragStart(cardId: CardId) {
  dragDrop.begin(cardId);
}

function onDragOver(target: DropTarget) {
  dragDrop.preview(target);
}

function onDrop(target: DropTarget) {
  dragDrop.commit(target);
}

function onDragEnd() {
  dragDrop.cancel();
}
```

### API Reference

#### `createWebDragDropSession(options?)`

HTML Drag and Drop의 active item을 보존하고 preview target과 최종 drop target을
Host callback에 전달합니다. 유효한 target과 drop policy는 Host가 결정합니다.
거부된 drop은 `cancel("drop-rejected")`로 명시합니다.

## Responsibility Boundary

- Web Adapter: capture, active item, lifecycle ordering, cancel reason
- Affordance: drag/drop이 사용자에게 의미하는 preview·commit hand
- Host/Hands: hit testing, geometry, valid target, document Intent, rendering

Canvas·Board·Kanban·Database는 이 API를 실제 interaction surface에서
사용합니다.

### Kanban drop target projection

`webKanbanColumnProps`와 `webKanbanCardProps`가 안정된 markup attribute를 만들고,
`kanbanCardDropTargetFromWebElement`가 HTML drag target을 Editing의
`KanbanCardDropTarget`으로 투영합니다. Pointer 좌표 경로는
`findWebKanbanCardDropTarget`이 같은 projection core를 사용합니다. Web은 target을
해석할 뿐 move validity와 permission은 결정하지 않습니다.
