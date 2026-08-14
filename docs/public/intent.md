# Intent 레퍼런스

[Editor와 Intent 만들기](intent-guide.md)에서 사용한 `EditingIntent`, `dispatch`,
`EditingResult`의 공개 시그니처입니다.

## 진입점

값이나 Selection을 바꾸는 요청은 `dispatch`로 보냅니다. 성공과 실패는
`EditingResult`로 돌아옵니다.

| 작업 | API | 결과 |
| --- | --- | --- |
| 편집 요청 보내기 | `editor.dispatch(intent)` | `EditingResult` |
| 선택한 내용 읽기 | `editor.copy()` | Clipboard 또는 `null` |
| 선택한 내용 잘라내기 | `editor.cut()` | Clipboard와 `EditingResult`, 또는 `null` |
| 실행 취소 | `editor.undo()` | `EditingResult` |
| 다시 실행 | `editor.redo()` | `EditingResult` |

## 공통 타입

```ts
import type {
  JSONAppliedChange,
  JSONValue,
} from "@interactive-os/json-document";

interface EditingIntent {
  readonly type: string;
}

interface EditingSnapshot<Selection extends JSONValue> {
  readonly value: JSONValue;
  readonly selection: Selection;
  readonly revision: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

interface EditingDispatch<
  Intent extends EditingIntent,
  Selection extends JSONValue,
> {
  dispatch(intent: Intent): EditingResult<Selection>;
}

type EditingResult<Selection extends JSONValue> =
  | {
      readonly ok: true;
      readonly snapshot: EditingSnapshot<Selection>;
      readonly change?: JSONAppliedChange;
    }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```

`EditingSnapshot`은 처리 뒤의 값과 Selection, revision, 실행 취소 상태를
묶습니다. `type`은 editor가 수행할 동작을 나타내고, 각 동작에 필요한 필드는
editor별 Intent union에서 정합니다. 성공 결과에는 snapshot이 들어 있으며
JSON 값까지 바뀌었다면 적용된 `change`도 함께 들어 있습니다. 실패하면
문서와 Selection은 요청 전 상태를 유지합니다.

값이 바뀐 요청은 History 항목을 만들고
`change.metadata.editing.origin`에 `intent.type`을 남깁니다. Selection만 바뀐
요청은 성공 snapshot을 돌려주지만 History 항목은 만들지 않습니다.

## DocumentIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `blockId`, `mode?`, `offset?` | 블록 선택 변경 |
| `text.replace` | `blockId`, `text`, `offset?` | 블록 text 변경 |
| `block.insert` | `afterId?`, `text?` | 블록 추가 |
| `selection.remove` | | 선택한 블록 제거 |
| `selection.move` | `direction` | 선택한 블록 이동 |
| `selection.duplicate` | | 선택한 블록 복제 |
| `clipboard.paste` | `clipboard`, `afterId?` | Clipboard 블록 붙여넣기 |

`selection.set`의 `mode`는 `"replace" | "extend" | "toggle"`입니다.
선택한 블록을 읽을 때는 `copy()`를, payload를 만든 뒤 블록까지 지울 때는
`cut()`을 사용합니다.

## SheetIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `rowId`, `columnId`, `mode?` | 셀 선택 변경 |
| `selection.fill` | `value`, `topology?` | 선택한 셀 채우기 |
| `cell.commit` | `rowId`, `columnId`, `value` | 한 셀의 값 확정 |
| `clipboard.paste` | `clipboard`, `topology?` | Clipboard 셀 붙여넣기 |

`copy(topology?)`는 선택한 셀을 읽고, `cut(topology?)`은 같은 payload를 만든
뒤 선택한 셀을 비웁니다.

## TreeIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `nodeId`, `topology`, `mode?` | 보이는 노드 선택 변경 |
| `selection.remove` | `topology` | 선택한 노드 제거 |
| `clipboard.paste` | `clipboard`, `topology`, `afterId?` | 붙여넣기 |

`copy(topology)`와 `cut(topology)`은 보이는 순서에서 선택된 노드를 찾고 그
후손까지 payload에 담습니다. `cut(topology)`은 payload를 만든 뒤 같은
노드들을 제거합니다.

## ObjectIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `objectIds`, `mode?` | 객체 선택 변경 |
| `selection.remove` | | 선택한 객체 제거 |
| `selection.fill` | `color` | 선택한 객체 색 변경 |
| `object.translate` | `objectIds`, `dx`, `dy` | 선택한 객체 위치 이동 |
| `clipboard.paste` | `clipboard` | 붙여넣기 |

`selection.set`의 `mode`는 `"replace" | "add" | "subtract" | "toggle"`입니다.
`copy()`는 선택한 객체를 읽고, `cut()`은 같은 객체를 읽은 뒤 제거합니다.

## OrderIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `itemId`, `mode?` | 항목 선택 변경 |
| `selection.remove` | | 선택한 항목 제거 |
| `clipboard.paste` | `clipboard`, `afterId?` | 붙여넣기 |

`copy()`는 선택한 항목을 읽고, `cut()`은 같은 항목을 읽은 뒤 제거합니다.

## KanbanIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `cardId`, `mode?` | 카드 선택 변경 |
| `card.move` | `cardId`, `columnId`, `beforeCardId?` | 카드를 다른 칸으로 옮김 |
| `selection.remove` | | 선택한 카드 제거 |

## DatabaseIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `recordId`, `propertyId`, `mode?` | 셀 선택 변경 |
| `cell.commit` | `recordId`, `propertyId`, `value` | 한 셀의 값 확정 |
| `record.add` | `recordId` | 레코드 추가 |
| `record.delete` | `recordId` | 레코드 삭제 |
| `view.configure` | `viewId`, 보기 필드 | 저장된 view 변경 |
| `clipboard.paste` | `clipboard`, `topology?` | 붙여넣기 |

`copy(topology?)`는 선택한 셀을 읽습니다. Topology를 넘기면 현재 화면에
보이는 행과 열로 직사각형을 계산합니다.

## 별도 메서드로 제공하는 작업

`copy()`는 현재 Selection을 읽어 Clipboard payload를 돌려줍니다. `cut()`은
payload를 만든 다음 선택한 내용을 제거하거나, Sheet에서는 고른 칸을
비웁니다. Database에는 `cut()`이 없습니다. `undo()`와 `redo()`는 History에
이미 기록된 변경을 이동합니다. 이 작업들은 새 편집 요청을 만들지 않으므로
`dispatch` 대신 각각의 메서드로 호출합니다.

붙여넣기는 Clipboard payload를 문서에 적용하는 새 요청입니다. 각 editor의
`clipboard.paste` Intent를 `dispatch`에 넘깁니다.

editor를 React, schema library, table, 브라우저 API와 연결하는 방법은
[Connectors](connectors.md)에 정리되어 있습니다.
