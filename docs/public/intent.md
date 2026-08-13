# Intent 레퍼런스

[Intent 가이드](intent-guide.md)에서 사용한 `EditingIntent`, `dispatch`,
`EditingResult`의 공개 시그니처입니다.

## 진입점

값이나 Selection을 바꾸는 요청은 `dispatch`로 보냅니다. 성공과 실패는
`EditingResult`로 돌아옵니다.

| 작업 | API | 결과 |
| --- | --- | --- |
| 편집 요청 보내기 | `editor.dispatch(intent)` | `EditingResult` |
| 선택한 내용 읽기 | `editor.copy()` | Clipboard 또는 `null` |
| Document의 선택한 블록 잘라내기 | `editor.cut()` | cut result |
| 실행 취소 | `editor.undo()` | `EditingResult` |
| 다시 실행 | `editor.redo()` | `EditingResult` |

## 공통 타입

```ts
interface EditingIntent {
  readonly type: string;
}

interface EditingDispatch<Intent extends EditingIntent, Selection> {
  dispatch(intent: Intent): EditingResult<Selection>;
}

type EditingResult<Selection> =
  | {
      readonly ok: true;
      readonly snapshot: EditingSnapshot<Selection>;
      readonly change?: JSONAppliedChange;
    }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```

`type`은 editor가 수행할 동작을 나타냅니다. 각 동작에 필요한 필드는 editor별
Intent union에서 정합니다. 성공 result에는 처리 뒤 snapshot이 들어 있고,
JSON 값까지 바뀌었다면 적용된 `change`도 들어 있습니다. failure result를
받으면 문서와 Selection은 요청 전 상태를 유지합니다.

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
`createDocumentEditor`는 선택한 블록을 읽고 제거하는 `copy()`와 `cut()`도
제공합니다.

## SheetIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `rowId`, `columnId`, `mode?` | 셀 선택 변경 |
| `selection.fill` | `value`, `topology?` | 선택한 셀 채우기 |
| `cell.commit` | `rowId`, `columnId`, `value` | 한 셀의 값 확정 |
| `clipboard.paste` | `clipboard`, `topology?` | Clipboard 셀 붙여넣기 |

## TreeIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `nodeId`, `topology`, `mode?` | 보이는 노드 선택 변경 |
| `selection.remove` | `topology` | 선택한 노드 제거 |

## ObjectIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `objectIds`, `mode?` | 객체 선택 변경 |
| `selection.remove` | | 선택한 객체 제거 |
| `selection.fill` | `color` | 선택한 객체 색 변경 |

`selection.set`의 `mode`는 `"replace" | "add" | "subtract" | "toggle"`입니다.

## OrderIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `itemId`, `mode?` | 항목 선택 변경 |
| `selection.remove` | | 선택한 항목 제거 |

## DatabaseIntent

| `type` | 필드 | 결과 |
| --- | --- | --- |
| `selection.set` | `recordId`, `propertyId`, `mode?` | 셀 선택 변경 |
| `cell.commit` | `recordId`, `propertyId`, `value` | 한 셀의 값 확정 |
| `record.add` | `recordId` | 레코드 추가 |
| `record.delete` | `recordId` | 레코드 삭제 |
| `view.configure` | `viewId`, 보기 필드 | 저장된 view 변경 |

## 별도 메서드로 제공하는 작업

`copy()`는 현재 Selection을 읽어 Clipboard payload를 돌려줍니다. `cut()`은
payload를 만든 다음 Document에서 선택한 블록을 제거합니다. `undo()`와
`redo()`는 History에 이미 기록된 변경을 이동합니다. 이 작업들은 새 편집
요청을 만들지 않으므로 `dispatch` 대신 각각의 메서드로 호출합니다.

붙여넣기는 Clipboard payload를 문서에 적용하는 새 요청입니다. 각 editor의
`clipboard.paste` Intent를 `dispatch`에 넘깁니다.

editor를 React, schema library, table과 browser API에 연결하는 방법은 다음
[Connectors](connectors.md) 문서에서 이어집니다.
