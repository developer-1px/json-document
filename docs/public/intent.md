# Intent 레퍼런스

`@interactive-os/json-document-editing`의 Intent 시그니처입니다.
처음 따라 하기는 [Intent 가이드](intent-guide.md)에, 편집 층 지도는
[코어 컨셉](concepts.md)에 있습니다. JSON Document 자체는
[API](api.md)입니다.

```txt
@interactive-os/json-document-editing
|-- EditingIntent
|-- EditingDispatch
|-- EditingResult
`-- DocumentIntent · SheetIntent · TreeIntent
    ObjectIntent · OrderIntent · DatabaseIntent
```

하려는 일은 `{ type, ... }` 객체입니다. 편집기는 `dispatch`로만
받습니다. `copy`와 `undo`/`redo`는 Intent가 아닙니다.

## 진입점

| 작업 | API | 결과 |
| --- | --- | --- |
| 하려는 일 보내기 | `editor.dispatch(intent)` | `EditingResult` |
| 고른 것 읽기 | `editor.copy()` | Clipboard 또는 `null` |
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

`type`은 동사입니다. 나머지 필드는 편집기마다 다릅니다. 성공하면
`ok: true`입니다. 거절되면 `ok: false`이고 문서 값은 그대로입니다.
값이 바뀐 성공만 실행 취소 항목이 됩니다. 선택만 옮긴 성공과 실패한
요청은 항목이 되지 않습니다.

값이 바뀐 뒤 `change.metadata.editing.origin`은 `intent.type`입니다.

## 편집기별 Intent

각 편집기는 자기 유니온만 받습니다. 한 유니온으로 합치지 않습니다.

### DocumentIntent

| `type` | 필드 | 하는 일 |
| --- | --- | --- |
| `selection.set` | `blockId`, `mode?`, `offset?` | 블록 고르기 |
| `text.replace` | `blockId`, `text`, `offset?` | 블록 글자 바꾸기 |
| `block.insert` | `afterId?`, `text?` | 블록 넣기 |
| `selection.remove` | | 고른 블록 지우기 |
| `selection.move` | `direction` | 고른 블록 옮기기 |
| `selection.duplicate` | | 고른 블록 복제 |
| `clipboard.paste` | `clipboard`, `afterId?` | 붙여넣기 |

`mode`는 `"replace" \| "extend" \| "toggle"`입니다.
`createDocumentEditor`는 `copy()`, `cut()`도 줍니다. `cut`은 복사 다음
지우기이며 `dispatch`가 아닙니다.

### SheetIntent

| `type` | 필드 | 하는 일 |
| --- | --- | --- |
| `selection.set` | `rowId`, `columnId`, `mode?` | 칸 고르기 |
| `selection.fill` | `value`, `topology?` | 고른 칸 채우기 |
| `cell.commit` | `rowId`, `columnId`, `value` | 한 칸 확정 |
| `clipboard.paste` | `clipboard`, `topology?` | 붙여넣기 |

### TreeIntent

| `type` | 필드 | 하는 일 |
| --- | --- | --- |
| `selection.set` | `nodeId`, `topology`, `mode?` | 보이는 줄에서 고르기 |
| `selection.remove` | `topology` | 고른 노드 지우기 |

### ObjectIntent

| `type` | 필드 | 하는 일 |
| --- | --- | --- |
| `selection.set` | `objectIds`, `mode?` | 객체 고르기 |
| `selection.remove` | | 고른 객체 지우기 |
| `selection.fill` | `color` | 고른 객체 색 채우기 |

`mode`는 `"replace" \| "add" \| "subtract" \| "toggle"`입니다.

### OrderIntent

| `type` | 필드 | 하는 일 |
| --- | --- | --- |
| `selection.set` | `itemId`, `mode?` | 항목 고르기 |
| `selection.remove` | | 고른 항목 지우기 |

### DatabaseIntent

| `type` | 필드 | 하는 일 |
| --- | --- | --- |
| `selection.set` | `recordId`, `propertyId`, `mode?` | 칸 고르기 |
| `cell.commit` | `recordId`, `propertyId`, `value` | 한 칸 확정 |
| `record.add` | `recordId` | 레코드 추가 |
| `record.delete` | `recordId` | 레코드 삭제 |
| `view.configure` | `viewId`, 보기 필드 | 저장된 보기 바꾸기 |

## Intent가 아닌 메서드

| 메서드 | 이유 |
| --- | --- |
| `copy()` | 읽기만 한다. 문서를 바꾸지 않는다. |
| `cut()` | 복사 다음 삭제. Document만 있다. |
| `undo()` / `redo()` | 이미 기록된 변경을 되돌리거나 다시 적용한다. |

붙여넣기만 Intent입니다. `{ type: "clipboard.paste", clipboard }`를
`dispatch`합니다.
