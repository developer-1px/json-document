# Topology

선택은 어디를 골랐는지입니다. Topology는 지금 무엇이 줄로 서 있는지입니다.
편집기가 JSON 안의 저장 순서가 아니라, 화면에 보이는 줄 위에서 고르고
복사하게 하려면 이 줄이 필요합니다.

이 글은 그 줄이 어떻게 생겼는지, 누가 만드는지, 선택이 어떻게 읽는지
설명합니다. 고르기는 [Selection](selection.md)이, 복사는
[Clipboard](clipboard.md)가 맡습니다.

## 왜 저장 순서만으로는 부족한가

표에 세 행이 있다고 합시다. JSON에는 `r1`, `r2`, `r3` 순으로 들어
있습니다. 사용자가 Status 열로 정렬하면 화면은 `r3`, `r1`, `r2`가
됩니다. 이때 첫 칸과 둘째 칸을 드래그하면, 고른 것은 저장 순서의
이웃이 아니라 화면의 이웃이어야 합니다.

복사도 같습니다. 화면에 보이는 직사각형을 그대로 JSON과 TSV로 남겨야
합니다. Topology가 그 화면 줄을 편집기에 넘겨 주는 값입니다.

트리는 더 분명합니다. 접힌 자식은 화면에 없습니다. 보이는 행만
`visibleIds`로 넘기면, 범위 선택은 펼쳐진 줄 위에서만 움직입니다.

## 한 줄과 격자

줄은 한 축일 수도 있고 두 축일 수도 있습니다.

```ts
import {
  lineTopology,
  lineInterval,
  gridTopology,
  gridCellsInRange,
} from "@interactive-os/json-document-editing";

const visibleRows = lineTopology(["c", "a", "b"]);
lineInterval(visibleRows, "c", "a");
// ["c", "a"]

const visibleGrid = gridTopology(
  ["r3", "r1", "r2"],
  ["score", "name"],
);
gridCellsInRange(visibleGrid, {
  anchor: { rowId: "r3", columnId: "score" },
  focus: { rowId: "r1", columnId: "name" },
});
// r3/score, r3/name, r1/score, r1/name
```

`LineTopology`는 트리의 펼쳐진 행처럼 한 줄입니다. `GridTopology`는
표의 행×열입니다. Sheet의 `SheetTopology`는 Grid와 같은 모양입니다.
`{ rowIds, columnIds }`. Database의 보이는 레코드와 속성은 같은
격자이고, 이름만 `recordIds`와 `propertyIds`입니다.

줄 안의 id는 그 문서에 있는 행·열·노드여야 합니다. 공통 함수는 없는
id를 빈 범위로 읽고, editor에 넘기면 그 줄이 문서와 맞는지 검사합니다.

## 누가 줄을 만드는가

editor가 화면을 모릅니다. 정렬, 필터, 열 순서, 접기/펼치기는 host나
Connector가 가집니다. 그 결과가 Topology입니다.

- TanStack Table Connector는 보이는 행·열을 `SheetTopology`로 만듭니다.
- Database editor는 저장된 뷰에서 `tableTopology(viewId)`를 돌려줍니다.
- Tree는 host가 지금 펼쳐 둔 `visibleIds`를 넘깁니다.

넘긴 뒤에는 선택과 복사가 그 줄을 읽습니다. 줄을 다시 만들 책임은
계속 host에 있습니다. 화면 줄이 바뀌면 새 Topology를 넘기면 됩니다.
선택이 자동으로 화면을 따라갈지, 다시 고를지는 아직 제품이 정합니다.

## 편집기에 넘기는 법

Topology는 명령의 공통 껍질이 없어도 동작합니다. Sheet는 이미 이렇게
받습니다.

```ts
const visible = {
  rowIds: ["r3", "r1", "r2"],
  columnIds: ["status", "name"],
};

editor.selectedCellsIn(visible);
editor.copy(visible);
```

JSON 저장 순서로 충분하면 Topology를 생략할 수 있습니다. Sheet는 그때
문서의 `rows`와 `columns` 순서를 줄로 씁니다. 화면 순서와 저장 순서가
같을 때의 기본값입니다.

Database는 저장된 뷰가 줄을 가지고 있습니다. 정렬과 필터는 뷰에 있고,
editor는 그 뷰를 격자로 펼칩니다.

```ts
const visible = database.tableTopology(view.id);
database.selectedCellsIn(visible);
```

Tree는 보이는 줄이 곧 선택이므로, 고를 때 Topology를 같이 받습니다.

```ts
tree.dispatch({
  type: "selection.set",
  nodeId: "a-1",
  topology: { visibleIds: ["a", "a-1", "b"] },
});
```

그건 “이 노드가 지금 화면에 있다”는 뜻이지, Intent를 통합했다는 뜻이
아닙니다.

## 편집기에서 보이는 이름

| 편집기 | Topology | 줄 |
| --- | --- | --- |
| Sheet | `SheetTopology` | `rowIds` × `columnIds` |
| Database | `DatabaseTopology` | `recordIds` × `propertyIds` |
| Tree | `TreeTopology` | `visibleIds` |
| Document | 저장 순서 | `blocks` |
| Order | 저장 순서 | `items` |

Document와 Order는 화면 줄을 따로 받지 않습니다. 고른 구간은 저장 순서를
`lineInterval`로 읽습니다.

공통으로 줄을 계산할 때는 `lineTopology`, `gridTopology`,
`lineInterval`, `gridCellsInRange`를 쓰면 됩니다. 선택과 Clipboard가
같은 줄을 읽게 하는 것이 이 개념의 일입니다.
