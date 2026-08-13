# 편집 Intent

읽기 층의 문은 `commit`입니다. 편집 층의 문은 `dispatch`입니다.
제품 문장이 Pointer와 Patch로 번역되기 전에 모이는 곳이 Intent입니다.

한 줄 지도는 [코어 컨셉](concepts.md)에, 문장이 적용되는 순서는
[Intent guide](intent-guide.md)에 있습니다.

## 껍질과 문

모든 Intent는 `type`이 동사인 JSON입니다. 그 껍질이 `EditingIntent`입니다.
모든 editor는 `dispatch(intent)`로 받아 `EditingResult`를 돌려줍니다.
그 문이 `EditingDispatch`입니다.

```ts
import {
  createDocumentEditor,
  type EditingDispatch,
  type EditingIntent,
} from "@interactive-os/json-document-editing";

const editor = createDocumentEditor({
  blocks: [{ id: "welcome", text: "Hello" }],
});

const intent: EditingIntent = { type: "selection.set", blockId: "welcome" };
const result = editor.dispatch(intent);
```

문장은 제품마다 다릅니다. Document는 `selection.set`과 `block.insert`를
받습니다. Sheet는 `cell.commit`과 `selection.fill`을 받습니다. 공통인
것은 껍질과 문이지, 한 유니온이 아닙니다.

## 번역

UI는 JSON Patch를 짜지 않습니다. editor가 Intent를 `EditingPlan`으로
바꿉니다. `EditingSession`이 그 plan을 `commit`합니다. 적용된 변경의
`origin`은 `intent.type`입니다.

```txt
UI / Connector
  → dispatch(intent)
  → EditingPlan { operations, selectionAfter, origin }
  → JSONDocument.commit
  → EditingResult
```

## 무엇이 Intent인가

| 하고 싶은 일 | 문 |
| --- | --- |
| 고르기, 채우기, 붙이기, 칸 확정 | `dispatch(intent)` |
| 복사 | `copy` — 읽기 |
| 실행 취소, 다시 실행 | `undo` / `redo` — History |

붙여넣기는 payload를 다시 문서로 돌려보내는 문장이므로 Intent입니다.
복사는 문서를 바꾸지 않습니다. 실행 취소는 이미 기록된 patch를
되감습니다. 새 문장이 아닙니다.

## 결과

실패한 Intent는 읽기 층과 같습니다. `{ ok: false, code }`이고 문서는
그대로입니다. 실패한 편집과 선택만 옮긴 편집은 History 항목이 되지
않습니다. 되돌릴 값의 변화가 없었기 때문입니다.

호출 형식은 [API](api.md)의 editing 예에 있습니다.
