# React에서 선택과 커서 그리기

문서 값은 이미 구독하고 있습니다. 남은 일은 사용자가 고른 위치를 화면에
그리는 일입니다. 블록마다 `Set`을 만들고, 클릭마다 modifier를 해석하고,
키마다 Topology 이웃을 찾으면 표와 보드와 문서가 같은 코드를 복제합니다.

`useEditing`은 그 질의를 React Connector가 제공합니다. 마크업과 장르
Intent는 제품이 가지고, hook은 범위·커서·글자 위치만 답합니다.

설치는 React Connector와 같습니다.

```sh
npm i @interactive-os/json-document-react
```

실제 동작은 [/connectors/react](/connectors/react)에서 범위와 커서를 눌러
확인할 수 있습니다. KeyboardEvent를 command로 바꾸는 일은
[Adapters](adapters.md)가, 값 구독과 다른 Connector는
[Connectors](connectors.md)가 정본입니다.

## 두 가지 그림

선택은 모델에 있고, 화면 순서는 [Topology](topology.md)가 정합니다. 그
둘을 화면에 투영하면 그림이 두 장 나옵니다.

object 그림은 이산 대상입니다. 여러 카드나 셀이 범위에 들어갈 수 있고,
그중 하나가 커서입니다. 커서는 `primaryKey`이거나 range의 `focus`입니다.

text 그림은 그 커서 대상 안의 글자 위치입니다. Document point의 `offset`
이 그 값입니다. object 선택에는 offset이 없습니다.

한 화면이 둘을 같이 가질 수 있습니다. Document 데모의 블록 하이라이트는
object 그림이고, textarea 캐럿은 text 그림입니다. 두 질의를 하나로
합치지 않습니다. 범위에 들어 있다고 커서는 아니고, 커서가 있다고
글자 위치가 있는 것도 아닙니다.

## 어떤 hook을 쓸지

`@interactive-os/json-document-react`는 구독과 선택 질의를 나눠 둡니다.

| hook | 돌려주는 값 | 쓸 때 |
| --- | --- | --- |
| `useReactConnector(document)` | 현재 `JSONDocument` 값 | 값만 그릴 때 |
| `useJSONDocumentValue(document)` | 같은 값 구독 | 하위 진입점이 필요할 때 |
| `useEditingSnapshot(source)` | `EditingSnapshot` | 값·선택·revision·undo 가능 여부만 그릴 때 |
| `useEditing(options)` | snapshot + 항목 질의 + 키 입력 | 범위·커서·글자 위치를 화면에 붙일 때 |
| `useRestoreTextCursor(ref, offset)` | 없음. 캐럿만 맞춤 | 모델 offset을 input/textarea에 되돌릴 때 |

`useEditing`은 안에서 `useEditingSnapshot`을 호출합니다. 값과 선택을 같이
읽으면서 항목마다 표시를 붙일 때는 `useEditing` 하나면 됩니다.

## 최소로 붙이기

Document editor의 블록 목록을 그릴 때는 보이는 ID를 `selectedKeys`로
넘기고, 지금 커서가 있는 블록과 offset을 함께 넘깁니다.

```tsx
import { useDocumentEditor, useEditing } from "@interactive-os/json-document-react";

const editor = useDocumentEditor({
  blocks: [
    { id: "welcome", text: "Hello" },
    { id: "next", text: "Next" },
  ],
});

const focus = editor.snapshot.selection.ranges[
  editor.snapshot.selection.primaryIndex ?? 0
]?.focus;

const editing = useEditing({
  source: editor,
  selectedKeys: editor.selectedBlockIds,
  focusKey: focus?.blockId ?? null,
  textOffset: focus?.offset ?? null,
  onSelect: (blockId, mode) => {
    editor.dispatch({ type: "selection.set", blockId, mode });
  },
});
```

`source`는 `snapshot`과 `subscribe`를 가진 editor입니다.
`useEditingSnapshot`과 같은 구독 표면입니다. `onSelect`는 장르 Intent로
번역하는 자리입니다. hook은 `selection.set`이라는 이름을 모릅니다.

항목마다 질의를 읽어 마크업에 붙입니다.

```tsx
const item = editing.getItem(block.id);

<article
  data-selected={item.getIsSelected() ? "true" : "false"}
  data-focus={item.getIsFocus() ? "true" : "false"}
  onClick={item.getPressHandler()}
>
  {block.text}
</article>
```

속성 이름과 className은 제품이 정합니다. hook은 `data-selected`를 강제하지
않습니다. 범위와 커서를 다른 표시로 그리려면 두 질의를 따로 붙입니다.

## 항목이 알려 주는 값

`getItem(key)`가 돌려주는 값입니다. 같은 `key`로 여러 번 불러도 그 순간의
선택 상태를 읽습니다.

| 질의 | 의미 | 없을 때 |
| --- | --- | --- |
| `getIsSelected()` | `selectedKeys`에 있으면 범위 안 | `false` |
| `getIsFocus()` | `key`가 `focusKey`와 같으면 커서 | `focusKey`가 없으면 `false` |
| `getTextOffset()` | 커서 대상의 글자 위치 | object이거나 커서가 아니면 `null` |
| `getPressHandler()` | 클릭을 `onSelect(key, mode)`로 보냄 | |

`getTextOffset()`은 커서 항목에서만 숫자를 돌려줍니다. 같은 범위에 들어
있어도 커서가 아닌 항목은 `null`입니다.

키는 문자열이라면 됩니다. 셀은 `"rowId\\u0000columnId"`처럼 host가 만든
합성 키를 씁니다. hook은 그 문자열을 다시 쪼개지 않습니다. `onSelect`와
`neighbor`에서 같은 규칙을 써서 다시 풀어 Intent로 보냅니다.

`editing.snapshot`은 구독한 `EditingSnapshot`입니다.

| 필드 | 의미 |
| --- | --- |
| `value` | 현재 JSON |
| `selection` | 장르 Selection |
| `revision` | 구독이 바뀐 횟수 |
| `canUndo` / `canRedo` | History 버튼 활성 |

## 클릭과 선택 mode

`getPressHandler`는 클릭을 `onSelect(key, mode)`로 바꿉니다. 기본 mode는
modifier에서 옵니다.

| 입력 | mode |
| --- | --- |
| Shift | `extend` |
| Mod (Meta 또는 Ctrl) | `toggle` |
| 그 밖 | `replace` |

같은 규칙을 직접 쓰려면 `selectionModeFromModifiers(event)`를 호출합니다.
제품이 다른 규칙을 쓰면 `operationFromEvent`를 넘깁니다.

```tsx
const editing = useEditing({
  source: editor,
  selectedKeys: editor.selectedBlockIds,
  onSelect: (blockId, mode) => {
    editor.dispatch({ type: "selection.set", blockId, mode });
  },
  operationFromEvent: (event) => {
    if (event.shiftKey) return "extend";
    return "replace";
  },
});
```

textarea 안 클릭처럼 선택을 바꾸면 안 되는 입력은 `ignorePress`로
걸러 냅니다. 이 함수가 `true`를 돌려주면 `onSelect`는 호출되지 않습니다.

```tsx
ignorePress: (event) => (
  event.target instanceof Element
  && event.target.closest("textarea") !== null
),
```

`mode`는 hook의 공통 단어입니다. Object editor처럼 장르 Intent가
`extend` 대신 `add`를 받으면 `onSelect`에서 번역합니다.

```tsx
onSelect: (objectId, mode) => {
  editor.dispatch({
    type: "selection.set",
    objectIds: [objectId],
    mode: mode === "extend" ? "add" : mode,
  });
},
```

## 옵션

`useEditing(options)`의 입력입니다.

| 옵션 | 역할 |
| --- | --- |
| `source` | editor 또는 `snapshot`/`subscribe` 표면 |
| `selectedKeys` | 지금 범위에 들어 있는 키 |
| `focusKey` | 커서 키. object는 primary/focus, text는 글자를 가진 대상 |
| `textOffset` | `focusKey` 안의 글자 위치 |
| `onSelect` | 키와 mode를 장르 Intent로 번역 |
| `operationFromEvent` | 클릭 modifier 해석. 기본은 Shift=`extend`, Mod=`toggle` |
| `ignorePress` | 이 클릭을 선택으로 쓰지 않을 때 |
| `keyboard` | 표면 키보드. 없으면 `getKeyDownHandler`는 아무 일도 하지 않음 |

`focusKey`와 `textOffset`을 생략하면 object 범위만 그립니다. 커서가 없는
선택이 아니라, 커서 질의가 항상 꺼진 상태입니다. object 보드처럼 offset이
없는 화면은 `focusKey`만 넘깁니다.

`selectedKeys`는 배열이 아니어도 됩니다. `Set`이나 editor가 돌려주는
iterable이면 됩니다. hook은 그 순간의 내용을 `Set`으로 읽어
`getIsSelected`에 씁니다.

## text 커서를 컨트롤에 되돌리기

모델 `offset`은 그려야 캐럿이 됩니다. 컨트롤된 textarea는 값이 바뀌어도
브라우저 캐럿을 그 위치로 돌리지 않습니다. `useRestoreTextCursor`가 그
일을 합니다.

```tsx
import { useRef } from "react";
import { useRestoreTextCursor } from "@interactive-os/json-document-react";

function BlockText(props: {
  readonly text: string;
  readonly offset: number | null;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useRestoreTextCursor(ref, props.offset);
  return <textarea ref={ref} value={props.text} />;
}
```

`offset`이 `null`이면 캐럿을 건드리지 않습니다. 숫자가 오면 그 위치로
접힌 선택을 복원합니다. 길이를 벗어나면 `0`과 `value.length` 사이로
맞춥니다. 범위 선택이 아니라 collapsed caret입니다.

레이아웃 밖에서 한 번만 쓰려면 `restoreTextCursor(control, offset)`를
직접 호출할 수 있습니다. `control`은 `value`와 `setSelectionRange`만
있으면 됩니다.

항목의 `getTextOffset()`을 그대로 넘기면 커서 블록만 캐럿을 맞추고,
나머지 블록은 `null`이라 브라우저 위치를 유지합니다.

## 키보드

Keyboard Adapter가 chord를 command로 바꿉니다. hook은 그 command를 받아
대상 이동이나 글자 이동으로 나눕니다. `keyboard`를 넘기지 않으면
`getKeyDownHandler()`는 아무 일도 하지 않습니다.

```tsx
import {
  createWebKeyboardAdapter,
  moveLinePoint,
  lineBoundary,
} from "@interactive-os/json-document-web";

const keyboard = createWebKeyboardAdapter();
const blocks = editor.snapshot.value.blocks;
const focusBlock = blocks.find((block) => block.id === focus?.blockId);

const editing = useEditing({
  source: editor,
  selectedKeys: editor.selectedBlockIds,
  focusKey: focus?.blockId ?? null,
  textOffset: focus?.offset ?? null,
  onSelect: (blockId, mode) => {
    editor.dispatch({ type: "selection.set", blockId, mode });
  },
  keyboard: {
    resolve: (stroke) => keyboard.resolve(stroke),
    focusKey: () => editor.selectedBlockIds.at(-1),
    neighbor: (key, command) => {
      const ids = blocks.map((block) => block.id);
      return command.type === "move"
        ? moveLinePoint(ids, key, command.direction)
        : lineBoundary(ids, command.edge);
    },
    text: {
      offset: () => focus?.offset ?? 0,
      length: () => focusBlock?.text.length ?? 0,
      onOffset: (offset, mode) => {
        if (focus === undefined) return;
        editor.dispatch({
          type: "selection.set",
          blockId: focus.blockId,
          mode,
          offset,
        });
      },
    },
    onDelete: () => editor.dispatch({ type: "selection.remove" }),
    onUndo: () => editor.undo(),
    onRedo: () => editor.redo(),
  },
});

<div tabIndex={0} onKeyDown={editing.getKeyDownHandler()}>
  {/* 항목 */}
</div>
```

`resolve`는 Keyboard Adapter의 일입니다. hook은 `ArrowDown`이 무엇인지
모릅니다. `neighbor`는 보이는 순서를 아는 host가 채웁니다. 한 줄 목록은
`moveLinePoint`와 `lineBoundary`, 격자는 `moveGridPoint`와
`gridBoundary`를 씁니다.

### command가 가는 길

입력 칸(`input`, `textarea`, `[contenteditable]`) 안에서는 먼저 text
이동을 봅니다. 왼쪽·오른쪽·Home·End는 `offset`을 바꿉니다. 위·아래처럼
글자 축이 아닌 방향은 `neighbor`로 넘어가 object 커서를 옮깁니다.

text 이동이 아니면, 입력 칸 안에서는 undo/redo만 통과하는 것이 기본입니다.
표처럼 칸 안 화살표도 셀을 옮겨야 하면 `ignoreCommand`를 직접 씁니다.

| command | 기본 동작 |
| --- | --- |
| `move` / `boundary` in field, text 있음, 좌우·끝 | `text.onOffset` |
| `move` / `boundary` 그 밖 | `neighbor` 후 `onSelect` |
| `toggle` | 현재 `focusKey`를 `onSelect(..., "toggle")` |
| `delete` | `onDelete` |
| `undo` / `redo` | `onUndo` / `onRedo` |

`keyboard.text`가 있을 때 필드 안 방향이 offset으로 바뀌는 규칙입니다.

| command | 다음 offset |
| --- | --- |
| `boundary` `start` | `0` |
| `boundary` `end` | `length` |
| `move` `left` 또는 `previous` | `max(0, offset - 1)` |
| `move` `right` 또는 `next` | `min(length, offset + 1)` |
| `move` `up` / `down` | 글자 축이 아님. `neighbor`로 넘어감 |

기본 `ignoreCommand`는 필드 안에서 undo/redo가 아닌 command를 무시합니다.
Sheet 데모는 칸 안 화살표로 셀을 옮기기 위해 이 기본값을 바꿉니다. 스페이스와
Backspace만 필드에 남기고 나머지는 셀 이동으로 보냅니다.

```tsx
ignoreCommand: (command, context) => (
  context.inField
  && (
    (command.type === "toggle" && context.event.key === " ")
    || (command.type === "delete" && context.event.key === "Backspace")
  )
),
```

`afterMove`는 object 커서가 옮겨진 뒤 포커스를 셀에 되돌릴 때 씁니다.
Sheet 데모가 그 자리를 사용합니다. text `onOffset` 뒤에는 호출되지
않습니다.

`onDelete`, `onUndo`, `onRedo`를 생략하면 해당 command는 아무 일도 하지
않습니다. hook이 History나 삭제를 직접 호출하지 않습니다.

플랫폼 chord 표는 [Adapters](adapters.md)가 정본입니다.

## object만 그릴 때

키 가족의 보드는 범위와 primary만 있으면 됩니다. offset은 넘기지 않습니다.

```tsx
const editing = useEditing({
  source: editor,
  selectedKeys: editor.selectedObjects.map((object) => object.id),
  focusKey: editor.snapshot.selection.primaryKey,
  onSelect: (objectId, mode) => {
    editor.dispatch({
      type: "selection.set",
      objectIds: [objectId],
      mode: mode === "extend" ? "add" : mode,
    });
  },
});
```

`getIsSelected()`는 범위, `getIsFocus()`는 primary입니다. 여러 객체를
골라도 커서는 하나입니다.

## 표의 셀

표는 보이는 격자를 Topology로 읽고, 셀 키를 만듭니다.

```tsx
import { createWebKeyboardAdapter, moveGridPoint, gridBoundary } from "@interactive-os/json-document-web";

function cellKey(rowId: string, columnId: string) {
  return `${rowId}\u0000${columnId}`;
}

function parseCellKey(key: string) {
  const split = key.indexOf("\u0000");
  return { rowId: key.slice(0, split), columnId: key.slice(split + 1) };
}

const keyboard = createWebKeyboardAdapter();
const focus = editor.snapshot.selection.focus;
const topology = {
  rowIds: editor.snapshot.value.rows.map((row) => row.id),
  columnIds: editor.snapshot.value.columns.map((column) => column.id),
};

const editing = useEditing({
  source: editor,
  selectedKeys: editor.selectedCells.map((cell) => cellKey(cell.rowId, cell.columnId)),
  focusKey: focus ? cellKey(focus.rowId, focus.columnId) : null,
  onSelect: (key, mode) => {
    const { rowId, columnId } = parseCellKey(key);
    editor.dispatch({ type: "selection.set", rowId, columnId, mode });
  },
  keyboard: {
    resolve: (stroke) => keyboard.resolve(stroke),
    focusKey: () => {
      const next = editor.snapshot.selection.focus;
      return next ? cellKey(next.rowId, next.columnId) : undefined;
    },
    neighbor: (key, command) => {
      const current = parseCellKey(key);
      const next = command.type === "move"
        ? moveGridPoint(topology, current, command.direction)
        : gridBoundary(topology, current, command.edge);
      return next ? cellKey(next.rowId, next.columnId) : null;
    },
    afterMove: (key) => focusCell(parseCellKey(key)),
  },
});
```

`focusCell`은 옮겨진 셀 DOM에 포커스를 두는 host 함수입니다. 정렬·필터
뒤의 범위는 editor가 Topology로 계산합니다. hook에는 그 결과 키만
넘깁니다. 보이는 행·열을 Sheet Topology로 바꾸는 일은
[TanStack Table Connector](connectors.md)가 맡습니다.

## 하지 않는 일

hook은 툴바, 테마, `role`, 기본 className을 넣지 않습니다. Document나
Sheet Intent 이름을 알지 않습니다. KeyboardEvent를 command로 바꾸는 일은
[Adapter](adapters.md)입니다. 값 구독만 필요하면 `useReactConnector`와
`useEditingSnapshot`으로 충분합니다.

## API

패키지 `@interactive-os/json-document-react`가 선택·커서 질의로 공개하는
함수입니다.

```ts
function useEditing<Selection extends JSONValue, Key extends string = string>(
  options: UseEditingOptions<Selection, Key>,
): Editing<Selection, Key>

function useRestoreTextCursor(
  control: { readonly current: TextCursorControl | null },
  offset: number | null,
): void

function restoreTextCursor(control: TextCursorControl, offset: number): void

function selectionModeFromModifiers(event: EditingPressEvent): EditingSelectionMode
```

### `UseEditingOptions`

```ts
interface UseEditingOptions<Selection extends JSONValue, Key extends string = string> {
  readonly source: EditingSnapshotSource<Selection>;
  readonly selectedKeys: Iterable<Key>;
  readonly focusKey?: Key | null;
  readonly textOffset?: number | null;
  readonly onSelect: (key: Key, mode: EditingSelectionMode) => void;
  readonly operationFromEvent?: (event: EditingPressEvent) => EditingSelectionMode;
  readonly ignorePress?: (event: EditingPressEvent) => boolean;
  readonly keyboard?: EditingKeyboardOptions<Key>;
}
```

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `source` | 예 | `snapshot`과 `subscribe`를 가진 editor 또는 같은 모양의 객체 |
| `selectedKeys` | 예 | 범위에 들어 있는 키. 매 렌더의 iterable |
| `focusKey` | 아니오 | 커서 키. 없으면 `getIsFocus`는 항상 `false` |
| `textOffset` | 아니오 | 커서 항목의 글자 위치. 없으면 `getTextOffset`은 `null` |
| `onSelect` | 예 | 클릭과 키보드 이동이 도착하는 곳 |
| `operationFromEvent` | 아니오 | 클릭 mode. 기본은 `selectionModeFromModifiers` |
| `ignorePress` | 아니오 | `true`면 그 클릭은 선택을 바꾸지 않음 |
| `keyboard` | 아니오 | 없으면 `getKeyDownHandler`는 no-op |

### `Editing`과 `EditingItem`

```ts
interface Editing<Selection extends JSONValue, Key extends string = string> {
  readonly snapshot: EditingSnapshot<Selection>;
  getItem(key: Key): EditingItem<Key>;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
}

interface EditingItem<Key extends string = string> {
  getIsSelected(): boolean;
  getIsFocus(): boolean;
  getTextOffset(): number | null;
  getPressHandler(): (event: EditingPressEvent) => void;
}

type EditingSelectionMode = "replace" | "extend" | "toggle";
```

`getKeyDownHandler()`는 항상 함수를 돌려줍니다. `keyboard`가 없으면 그
함수는 event를 무시합니다. 표면 노드에 `tabIndex={0}`과 함께 붙입니다.

### 키보드 옵션과 command

```ts
interface EditingKeyboardOptions<Key extends string = string> {
  readonly resolve: (stroke: EditingKeyboardStroke) => EditingKeyboardCommand | null;
  readonly focusKey: () => Key | undefined;
  readonly neighbor: (
    key: Key,
    command: Extract<EditingKeyboardCommand, { readonly type: "move" } | { readonly type: "boundary" }>,
  ) => Key | null;
  readonly onDelete?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (key: Key) => void;
  readonly text?: {
    readonly offset: () => number;
    readonly length: () => number;
    readonly onOffset: (offset: number, mode: "replace" | "extend") => void;
  };
  readonly ignoreCommand?: (
    command: EditingKeyboardCommand,
    context: { readonly inField: boolean; readonly event: EditingKeyDownEvent },
  ) => boolean;
}

type EditingKeyboardCommand =
  | {
    readonly type: "move";
    readonly direction: "previous" | "next" | "up" | "down" | "left" | "right";
    readonly operation: "replace" | "extend";
  }
  | {
    readonly type: "boundary";
    readonly edge: "start" | "end";
    readonly operation: "replace" | "extend";
  }
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" };
```

`resolve`가 `null`을 돌려주면 hook은 그 키를 처리하지 않습니다. 브라우저
기본 동작도 막지 않습니다. command를 처리하기로 하면 `preventDefault`를
호출한 뒤 host 문을 엽니다.

`neighbor`가 `null`을 돌려주면 이동은 일어나지 않습니다. 화면 끝에서
화살표를 눌러도 선택이 바뀌지 않습니다.

`keyboard.focusKey`와 옵션의 `focusKey`는 역할이 다릅니다. 옵션 `focusKey`는
그릴 커서이고, `keyboard.focusKey()`는 이동을 시작할 현재 키입니다.

### 이벤트와 커서 컨트롤

```ts
interface EditingKeyboardStroke {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey?: boolean;
}

interface EditingKeyDownEvent extends EditingKeyboardStroke {
  readonly target: EventTarget | null;
  preventDefault(): void;
}

interface EditingPressEvent {
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly target?: EventTarget | null;
}

interface EditingSnapshotSource<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}

type TextCursorControl = Pick<HTMLInputElement, "value" | "setSelectionRange">;
```

`EditingKeyDownEvent`는 `KeyboardEvent` 전체를 요구하지 않습니다. Adapter가
읽는 chord 필드와 `preventDefault`만 있으면 됩니다. `EditingPressEvent`도
클릭 event의 modifier와 `target`만 읽습니다.

`EditingSnapshotSource`는 Document editor, Sheet editor, TanStack Table
binding처럼 `snapshot`과 `subscribe`가 있으면 됩니다.
