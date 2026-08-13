# Intent가 적용되기까지

이 글은 제품 문장 하나가 문서 값이 되기까지의 순서입니다. 계약만
보려면 [Intent](intent.md)를, 편집 층 전체 지도는
[코어 컨셉](concepts.md)을 보면 됩니다.

## 왜 문이 하나인가

표 칸을 채우는 일과 블록을 붙이는 일은 화면에서 다릅니다. 아래를
보면 둘 다 “이 문장을 받아 plan으로 바꾸고, 한 번에 적용한다”입니다.
그 받는 자리가 editor마다 다른 이름이면, Connector와 문서는 편집
층을 `commit`처럼 가리킬 수 없습니다.

그래서 문은 `dispatch` 하나입니다. 문장만 제품이 가집니다.

## 문장을 보낸다

블록을 고르는 일은 이런 문장입니다.

```ts
editor.dispatch({ type: "selection.set", blockId: "welcome" });
```

표 칸을 확정하는 일은 다른 문장입니다. 문은 같습니다.

```ts
sheet.dispatch({
  type: "cell.commit",
  rowId: "task-1",
  columnId: "status",
  value: "Ready",
});
```

둘 다 `EditingIntent`입니다. `type`이 동사이고 나머지는 그 제품의
자리입니다. DocumentIntent와 SheetIntent를 한 유니온으로 합치지
않습니다.

## editor가 plan으로 바꾼다

`dispatch` 안에서 editor는 문장을 `EditingPlan`으로 번역합니다.
plan에는 적용할 JSON Patch, 그 다음 선택, 그리고 `origin`이
들어 있습니다. `origin`은 `intent.type`입니다.

선택만 옮기는 문장은 값이 그대로입니다. 값은 바꾸는 문장만
`operations`를 채웁니다. UI가 Pointer를 조립하지 않습니다.

## session이 적용한다

`EditingSession`이 plan을 `JSONDocument.commit`으로 넘깁니다.
성공하면 값과 선택이 같이 바뀌고 `EditingResult`는
`{ ok: true, snapshot }`입니다. 검사에 걸리면 `{ ok: false, code }`이고
문서는 한 칸도 바뀌지 않습니다.

읽기 층의 실패와 같은 이야기입니다. 예외로 숨기지 않습니다.

## History가 남는 때

값이 실제로 바뀐 뒤에만 로컬 History 항목이 생깁니다. 항목은
앞으로의 patch와 되돌릴 patch, 그리고 그 순간 앞뒤 선택을 같이
기억합니다.

선택만 옮긴 Intent는 항목이 아닙니다. 실패한 Intent도 항목이
아닙니다. 바깥에서 문서가 바뀌면 이 편집기의 undo 스택은 비웁니다.

## 복사와 붙여넣기와 실행 취소

복사는 고른 것을 payload로 읽습니다. 문서를 바꾸지 않으므로
Intent가 아닙니다. `copy()`가 그 읽기입니다.

붙여넣기는 그 payload를 다시 문서로 돌려보내는 문장입니다.
`clipboard.paste`가 Intent입니다.

실행 취소는 새 문장이 아닙니다. History가 이미 기록된 역방향
patch를 다시 `commit`합니다. 문은 `undo`와 `redo`입니다.

오른쪽 [컨셉 패널](concepts.md)에서 그 차이를 볼 수 있습니다.
블록을 고르면 Intent 칸에 `selection.set`이 보입니다. 복사해도
그 칸은 바뀌지 않습니다. 붙여넣으면 `clipboard.paste`가 보이고
아래 문서와 History가 같이 움직입니다.

## 여섯 editor

Document, Sheet, Tree, Object, Order, Database는 모두
`EditingDispatch`를 만족합니다. 각자 제품 문장을 가지고, 실패와
성공은 같은 `EditingResult`로 돌아옵니다.

Topology는 이 문과 별개입니다. 화면 줄은 선택과 복사가 직접
받습니다. Intent가 없어도 Topology는 움직입니다.
