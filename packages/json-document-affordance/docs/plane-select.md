## 평면 Select 프로파일 · RC

`createPlaneSelectProfile`은 다중 선택까지 닫힌 최소 평면 선택 문법입니다.
Canvas 모델, React, DOM, 문서 저장소 없이 ID·bounds·현재 선택과 정규화한 입력을
받습니다. Selection의 `createKeySelectionFamily`로 집합과 primary를 전이하고,
기존 hit·marquee·drag·copy·nudge Affordance와 `createGestureSession`을 조합합니다.

```text
Web: hit ID, 같은 좌표계의 point, keyboard stroke, pointer capture
  └─ Affordance: createPlaneSelectProfile
      ├─ Selection: key 집합·primaryKey 전이/reconcile
      └─ preview / commit 결과
          ├─ Hand: 선택 윤곽·marquee·이동/복제 preview 렌더링
          └─ Editing: 선택 반영, 집합 이동·복제·삭제, primary 편집, History
```

### API

- `begin(context, { point, hitKey, shiftKey?, altKey? })`: `items: { id, x, y, width, height }[]`와
  `selection: { kind: "explicit", keys, primaryKey }`를 캡처합니다. `hitKey: null`은 빈 곳입니다.
  items의 순서가 선택 순서·primary fallback 순서이며, 사라진 key는 Selection이 제거합니다.
- `preview(point, modifiers?)` / `getPreview()`: `{ selection, marquee, translation } | null`.
  `translation`은 `{ operation: "move" | "copy", keys, dx, dy }` 하나입니다. 문서와 committed selection은 바꾸지 않습니다.
- `updateModifiers({ shiftKey?, altKey? })`: 포인터가 정지해 있어도 modifier 변경을 다시 투영합니다.
  `preview`/`commit`에서 modifiers를 생략하면 마지막 상태를 유지하고, 전달하면 현재 상태로 교체합니다.
- `commit(point, modifiers?)`: 최종 point로 `{ selection, translation } | null`을 한 번 반환하고
  gesture를 비웁니다. Hand가 Selection을 반영한 뒤 translation 전체를 한 Intent로 실행합니다.
- `cancel(reason?)`: preview를 버립니다. 이후 release는 결과를 만들지 않습니다.
- `select(context, key, shiftKey?)`: Space 같은 discrete activation의 선택 결과.
  **focus만으로 호출하지 않습니다.** Focus와 selection은 독립입니다.
- `keyDown(stroke, context, grabbing?)`: selection / delete(keys) / duplicate(keys) /
  translate(keys, dx, dy) / edit(key) / cancel 또는
  null. `grabbing`은 resize 등 다른 gesture의 활성 상태입니다. 처리한 command는
  진행 중 Select preview도 취소합니다. 플랫폼 binding은 native editable/IME를 먼저 제외합니다.

한 mounted Hand마다 하나의 profile instance를 사용합니다. instance 간 상태는 독립입니다.
외부 문서·대상 geometry·committed selection 변경, 도구 전환, capture loss, unmount에서는 binding이 `cancel`을
호출합니다. immutable begin snapshot을 사용하므로 오래된 gesture를 새 문서에 적용하지 않습니다.

### 닫힌 문법

| 입력 | 결과 |
| --- | --- |
| 객체 click | release에서 그 객체 하나로 replace |
| 선택된 객체 press → drag | press에서는 집합 유지, drag는 집합 전체에 같은 delta |
| 선택되지 않은 객체 press → drag | 그 객체 하나로 replace 후 이동 |
| Shift+click | 포함하면 제거, 아니면 추가; 새 대상이 primary |
| Shift+객체 drag | toggle이 아닌 집합 이동; 큰 delta 축으로 고정 |
| Alt/Option+객체 drag | 같은 선택 집합의 복제 요청; Shift와 조합 가능 |
| 빈 곳 click | Shift 여부와 관계없이 clear |
| 빈 곳 drag / Shift+drag | marquee replace / 기존 선택에 add |
| Mod+A 반복 | 전체 선택 유지, 유효한 기존 primary 유지 |
| Delete / Backspace | 선택 집합 삭제 요청 |
| Mod+D | 선택 집합 복제 요청; ID·배치는 Editing 소유 |
| 방향키 / Shift+방향키 | 선택 집합 1 / 10단위 이동 요청 |
| Enter / F2 | primary 하나의 편집 요청 |
| Escape | gesture만 cancel, idle에서는 선택 clear |

click/drag 임계값은 같은 좌표계의 3단위(`dragThreshold`), marquee는 bounds 교차
(`contain: "intersect"`)가 기본입니다. `contain: "inside"`를 명시할 수 있습니다.
임계값을 넘으면 이동을 되돌려도 drag로 유지하며, 최종 delta가 0이면 translation은 null입니다.
primary가 아닌 객체도 선택 윤곽을 그리지만 resize handles와 텍스트 입력은 primary에만 붙입니다.

Selection 변경은 문서 JSON과 History를 건드리지 않습니다. 문서 commit/Undo는 Editing이
소유합니다. Alt-click과 최종 0 delta는 복제를 만들지 않습니다. 복제 preview에서는 원본을
유지하고 변환된 사본을 위에 렌더링하지만, commit 전에 ID를 할당하지 않습니다.
Mod+C/X/V는 처리하지 않습니다. Web의 native clipboard event가 직렬화와 이벤트 소유권을
맡으며 text 입력·IME는 binding에서 먼저 제외합니다.
이 프로파일에는 그룹·다중 resize·중첩 선택·Mod drill-down·snap·zoom/pan·레이어 문법이 없습니다.

### Usage와 Source

실제 [Canvas Usage](/demo/canvas)는 public constructor를 import하여 `CanvasHand`에
주입합니다. 생략하면 Hand가 같은 프로파일을 생성합니다. Source는 Affordance 프로파일,
Selection key family, Object Editing, Canvas binding까지 연결됩니다.

```tsx
import { createPlaneSelectProfile } from "@interactive-os/json-document-affordance";
import { CanvasHand } from "@interactive-os/json-document-canvas";

const [selectProfile] = useState(() => createPlaneSelectProfile());
return <CanvasHand editor={editor} selectProfile={selectProfile} creationStyle={creationStyle} />;
```

다른 평면 Hand는 CanvasHand 없이 같은 프로파일을 소비합니다.

```ts
const select = createPlaneSelectProfile();
const context = {
  items: [{ id: "node", x: 10, y: 20, width: 80, height: 40 }],
  selection: { kind: "explicit" as const, keys: ["node"], primaryKey: "node" },
};
select.begin(context, { hitKey: "node", point: { x: 20, y: 30 } });
const preview = select.preview({ x: 40, y: 50 }); // renderer에만 전달
const result = select.commit({ x: 40, y: 50 }); // operation="move", keys=["node"], dx=20, dy=20
```

`tests/plane-select.test.ts`는 Object·Canvas·React를 import하지 않는 diagram 소비자로
동일 계약을 검증합니다. 실제 문서 commit/취소/Undo는 Canvas 통합 테스트가 검증합니다.
