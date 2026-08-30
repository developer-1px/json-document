# Interaction Handles

InteractionHandle은 화면 위의 작은 손잡이를 **무엇을 바꾸는 손인지**로
표현하는 생태계 계약입니다. 캘린더 일정의 끝, Canvas 선택 상자의 모서리,
Database 열 경계, 벡터의 제어점은 모양은 달라도 같은 포인터 수명과 cursor
문법을 사용합니다.

```text
@interactive-os/json-document-affordance
└─ InteractionHandle 의미 정본
   ├─ descriptor: drag / resize / control
   ├─ geometry: axis / edge / delta
   ├─ cursor: idle / active
   └─ lifecycle: start → preview → commit | cancel
              │
              ▼
@interactive-os/json-document-ui-primitives-react
└─ Web pointer capture + React/ARIA binding
   ├─ useInteractionHandle
   ├─ DragHandle
   ├─ ResizeHandle
   └─ ControlHandle
              │
              ▼
Calendar / Canvas / Database / Annotation
└─ delta를 제품의 Intent로 변환
```

## 책임 경계

| 위치 | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| Affordance | handle 종류, 축·edge, delta, cursor 의미, lifecycle | DOM, React, 제품 Intent |
| Web/React binding | pointer capture, platform event, ARIA와 CSS cursor 투영 | 크기 제한, snap, 문서 변경 정책 |
| 제품 | 좌표 변환, min/max, snap, 권한, preview, 최종 Intent | 별도의 pointer lifecycle과 cursor 표 |

제품이 preview 중 handle DOM을 다시 그리더라도 binding은 시작한 포인터를
`commit` 또는 `cancel`까지 이어 갑니다. `pointercancel`과 예기치 않은 capture
손실은 저장하지 않고 취소합니다.

## 세 역할

| 역할 | descriptor | 쓰는 곳 | 기본 cursor |
| --- | --- | --- | --- |
| DragHandle | `{ kind: "drag", axis? }` | 카드 grip, 패널 이동, 선택 객체 이동 | `grab` → `grabbing` |
| ResizeHandle | `{ kind: "resize", edge }` | 모서리, 열·행 경계, splitter | edge별 resize cursor |
| ControlHandle | `{ kind: "control", axis? }` | 벡터 endpoint, 곡선 제어점, 회전점 | `crosshair` |

Drag는 대상을 옮기고, Resize는 경계를 바꾸며, Control은 도형 내부의 의미
있는 점을 조절합니다. 같은 lifecycle을 쓴다고 역할까지 하나로 합치지 않습니다.

## 정본 session

```ts
import {
  createInteractionHandleSession,
  type InteractionHandleEvent,
} from "@interactive-os/json-document-affordance";

const session = createInteractionHandleSession();

const started = session.start({ kind: "resize", edge: "se" }, origin);
const preview = session.preview(point);
const committed = session.commit(point);

function consume(event: InteractionHandleEvent) {
  if (event.phase === "preview") renderPreview(event.delta);
  if (event.phase === "commit") dispatchResizeIntent(event.delta);
  if (event.phase === "cancel") clearPreview();
}
```

모든 event는 같은 `descriptor`, `origin`, 현재 `point`, 축이 반영된 `delta`,
현재 `cursor`를 가집니다. `cancel`에는 `cancel`, `lost-capture`, `superseded`
중 하나의 reason이 붙습니다.

## React에서 선택하기

버튼 형태의 손잡이는 역할별 primitive를 사용합니다.

```tsx
import {
  ControlHandle,
  DragHandle,
  ResizeHandle,
} from "@interactive-os/json-document-ui-primitives-react";

<DragHandle label="Move card" onHandle={moveCard} />

<ResizeHandle
  label="Resize column"
  orientation="horizontal"
  onResize={(delta, phase) => resizeColumn(delta, phase)}
/>

<ControlHandle label="Move endpoint" onHandle={moveEndpoint} />
```

SVG나 기존 제품 markup을 유지해야 하면 `useInteractionHandle`을 사용합니다.

```tsx
const binding = useInteractionHandle<SVGCircleElement>({
  descriptor: { kind: "control" },
  onHandle: (event) => updateEndpoint(event),
});

return <circle {...binding.handleProps} style={{ cursor: binding.cursor }} />;
```

`handleProps`는 손잡이 종류를 `data-interaction-handle`로, pointer session이
진행 중인 동안에는 `data-active="true"`로 투영합니다. 제품은 이 상태를
hover·focus·active 시각 피드백에 사용할 수 있으며 pointer lifecycle을 다시
구현하지 않습니다. `binding.cursor`는 descriptor에 맞는 idle·active cursor를
그대로 제공합니다.

## 제품 Intent로 닫기

InteractionHandle은 문서를 직접 수정하지 않습니다. Calendar는 날짜 범위,
Canvas는 객체 geometry, Database는 열 너비, Annotation은 selector를 각각의
정본 Intent로 변환합니다.

```text
pointer input
  → InteractionHandleEvent
    → product preview
      → commit
        → Calendar / Object / Database / Annotation Intent
          → json-document history
```

따라서 같은 handle API를 사용하면서도 각 제품의 min/max, snap, modifier,
권한과 undo 의미는 보존됩니다. 제품에 `setPointerCapture`, 전역 `pointerup`,
독자적인 cursor map이 다시 생기면 정본 경계를 우회한 것입니다.

## 함께 보기

- [Drag](affordance-drag.md): 선택한 대상을 옮기는 손
- [Resize](affordance-resize.md): resize geometry와 modifier 정책
- [Snap](affordance-snap.md): preview delta를 격자·가이드에 맞추기
- [Affordance API Reference](/docs/api/affordance)
- [UI Primitives React API Reference](/docs/api/ui-primitives-react)

```live-demo
/affordances/handles
```
