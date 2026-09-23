# Drag

Drag는 고른 대상을 포인터로 옮기는 손입니다. 누른 점에서 현재 점까지
이동량이 생기고, 이동량이 있을 때만 옮기기를 확정합니다. 기하와 히트
테스트는 호스트가 계산하고, editor에는 대상 ID와 이동량만 넘깁니다.

```ts
import {
  applyAffordance,
  commitAffordance,
  dragAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  applyAffordance(
    dragAffordance(origin, { x: event.clientX, y: event.clientY }),
    {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
      hand: (hand) => {
        if (hand.type === "translate") setOffset({ dx: hand.dx, dy: hand.dy });
      },
    },
  );
}

function onPointerUp(event: PointerEvent) {
  const committed = commitAffordance(
    dragAffordance(origin, { x: event.clientX, y: event.clientY }),
  );
  if (!committed) return;
  applyAffordance(committed, {
    commit: (hand) => {
      if (hand.type !== "translate") return;
      editor.dispatch({
        type: "object.translate",
        objectIds,
        dx: hand.dx,
        dy: hand.dy,
      });
    },
  });
}
```

모양과 그림은 제품이 정합니다. 고른 것을 잡고 옮기는 문법은 닫혀 있습니다.
Shift는 축을 구속하고, Alt는 [Duplicate](affordance-copy-drag.md)입니다.

## Canvas gesture session

`createCanvasGestureSession`은 Canvas에서 동시에 하나만 활성화되는 semantic gesture의
`begin → preview → commit/cancel` 수명을 소유합니다. `drag`, `marquee`, `pan`, `resize`처럼
입력 장치와 무관한 gesture state를 전달하며, Web pointer capture는
`createWebPointerSession`이 별도로 소유합니다.

```ts
import { createCanvasGestureSession } from "@interactive-os/json-document-affordance";

const gestures = createCanvasGestureSession<CanvasGesture>({
  onBegin: setGesture,
  onPreview: setGesture,
  onCommit: () => setGesture(null),
  onCancel: () => setGesture(null),
});

gestures.begin({ type: "drag", ids, originX, originY, dx: 0, dy: 0 });
gestures.preview((drag) => ({ ...drag, dx, dy }));
gestures.commit();
```

### Public API

- `createCanvasGestureSession(options?)`
- `CanvasGestureSession<Gesture>`: `getActive`, `begin`, `preview`, `commit`, `cancel`
- `CanvasGestureState`, `CanvasGestureType`, `CanvasGestureCancelReason`

Canvas에 한정되지 않은 create/draw/move/resize lifecycle은
`createGestureSession<Gesture>()`을 사용합니다. `GestureState`는 string `type`만
요구하며 begin/preview/commit/cancel과 supersede 의미를 소유합니다.

좌표 변환은 Web Adapter, hit target·renderer·tool 조합은 Hand, 문서 기하는
Document Type이 소유합니다. Host에는 권한·잠금 정책 값과 레이아웃만 남습니다.

## 키보드로 옮기기

포인터 없이도 같은 옮기기 문법이 성립합니다. Space나 Enter가 고른 대상을
잡고, 화살표가 이동량을 누적하고(Shift는 10), 같은 키가 놓아 확정하고,
Escape는 미리보기를 폐기합니다. 이동 없이 놓으면 cancel로 끝나 값이
바뀌지 않습니다.

```ts
import { applyAffordance, keyboardDragAffordance } from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(
    keyboardDragAffordance({
      key: event.key,
      shiftKey: event.shiftKey,
      grabbing,
      dx: offset.dx,
      dy: offset.dy,
    }),
    {
      hand: (hand) => {
        if (hand.type === "grab") setGrabbing(true);
        if (hand.type === "translate") setOffset({ dx: hand.dx, dy: hand.dy });
        if (hand.type === "cancel") reset();
      },
      commit: (hand) => {
        if (hand.type !== "translate") return;
        editor.dispatch({ type: "object.translate", objectIds, dx: hand.dx, dy: hand.dy });
        reset();
      },
    },
  );
}
```

잡힘 상태와 누적 이동량은 호스트 화면 상태입니다. 단위는
[Nudge](affordance-nudge.md)와 같이 1과 10으로 닫습니다.

## Live Demo

[Canvas Hand의 Usage 및 Source](/docs/api/canvas)에서 같은 drag 문법을 확인할 수 있습니다.

```live-demo
/widgets/board
```
