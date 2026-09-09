## Resize · 고정 기준과 초기 크기

`resizeAffordance(origin, point, edge, modifiers?, size?)`는 8방향 resize의 정본입니다.
같은 좌표계의 시작점·현재 점, `ResizeEdge`, Shift/Alt 상태와 **시작할 때의**
`{ width, height }`를 받아 `{ hand: { type: "resize", dx, dy, dw, dh, edge }, cursor }`를
반환합니다. 문서, DOM, pointer capture와 History를 소유하지 않습니다.

| 입력 | 고정 기준과 크기 |
| --- | --- |
| `n` / `s` | 반대편 변 고정, 높이 조절 |
| `e` / `w` | 반대편 변 고정, 너비 조절 |
| `ne` / `se` / `sw` / `nw` | 반대 모서리 고정, 너비·높이 조절 |
| Shift | 초기 너비/높이 비율 유지. 변에서는 나머지 축의 중심을 고정 |
| Alt / Option | 객체 중심 고정, 잡은 방향의 반대편도 대칭 조절 |
| Shift + Alt | 초기 비율과 중심 모두 고정 |

`size`를 주면 결과 크기를 최소 1좌표 단위로 제한하고, 그 결과로 위치 delta를
계산하므로 최소 크기를 지나쳐도 고정점이 밀리거나 뒤집히지 않습니다. 비율 유지 시
두 축 모두 최소 크기를 만족합니다. 시작 크기는 유한한 양수여야 하며 아니면
`RangeError`입니다. 1보다 작은 유효한 입력도 정지한 grab에서는 변하지 않고,
실제 resize가 발생했을 때만 최소 크기를 적용합니다.

모서리 Shift는 두 축의 상대 크기 변화 중 절댓값이 큰 값을 사용합니다.
각 preview와 release는 같은 초기 크기에서 다시 계산해야 합니다. 이미 바뀐 preview
크기를 다음 입력의 `size`로 쓰지 않습니다. 포인터가 정지해도 modifier가 바뀌면
마지막 point로 재계산하고, release의 최종 point와 modifier로 결과를 확정합니다.
`commitAffordance`는 0 delta를 null로 거르며 자체적으로 문서를 변경하지 않습니다.

```ts
import { commitAffordance, resizeAffordance } from "@interactive-os/json-document-affordance";

const origin = { x: 300, y: 200 };
const size = { width: 200, height: 100 };
const preview = resizeAffordance(origin, { x: 340, y: 210 }, "se", { shiftKey: true }, size);
// dx=0, dy=0, dw=40, dh=20: 반대 모서리와 2:1 비율을 유지
const result = commitAffordance(preview);
// Hand가 preview를 렌더링하고, release에서만 result를 Object Editing Intent로 전달
```

`size`를 생략한 기존 호출은 기존 delta-only 의미를 유지합니다. 크기를 알 수 없으므로
최소 크기 제한이나 객체 비율을 보장하지 않으며, Shift+모서리는 x/y 이동량을 같게
맞추는 기존 규칙입니다. 객체의 비율을 유지하려는 소비자는 반드시 초기 `size`를 넘깁니다.

### Usage와 Source

[Canvas Usage](/demo/canvas)와 [Canvas Widget](/widgets/canvas)는 같은 `CanvasHand`를
사용합니다. `useCanvasHand`가 이 공개 API에 초기 객체 크기와 현재 modifier를 전달하며,
Source에서 Hand → `resizeAffordance` → Object projection/Editing을 확인할 수 있습니다.
네 변의 연속 hit 영역과 네 모서리는 React의 `useInteractionHandle`을 공유하고,
pointer capture·장치별 이벤트 수명은 Web binding에 남깁니다. 선택 집합 중 primary만
resize하며, 그룹 resize·회전·flip·snap·crop은 이 계약에 포함하지 않습니다.

```live-demo
/demo/canvas
```
