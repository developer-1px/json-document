# Topology

Selection의 `anchor`와 `focus`만으로는 두 점 사이에 무엇이 있는지 알 수
없습니다. 편집기에는 현재 화면에 보이는 항목의 순서가 함께 필요합니다. 이
순서를 나타내는 값이 Topology입니다.

## 저장 순서와 화면 순서

JSON에 `r1`, `r2`, `r3` 순서로 저장된 표를 Status 열로 정렬했다고
가정해 보겠습니다. 화면에는 `r3`, `r1`, `r2`가 보일 수 있습니다. 사용자가
첫 행부터 둘째 행까지 드래그했다면 선택 범위는 `r3`, `r1`이어야 합니다.

정렬과 필터를 담당하는 화면이나 Connector가 이 순서를 만듭니다. editor는
받은 Topology에서 선택 범위를 계산합니다. 복사와 채우기도 같은 값을
사용하므로 화면에서 본 순서와 결과의 순서가 일치합니다.

## 한 줄 나타내기

문서 블록이나 펼쳐진 트리처럼 한 축으로 이어지는 항목은
`LineTopology`로 나타냅니다.

```ts
import {
  lineInterval,
  lineTopology,
} from "@interactive-os/json-document-editing";

const visibleRows = lineTopology(["c", "a", "b"]);
const selected = lineInterval(visibleRows, "c", "a");

console.log(selected); // ["c", "a"]
```

트리에서 접힌 자식은 `visibleIds`에 넣지 않습니다. 범위 선택은 사용자가
현재 볼 수 있는 노드만 따라갑니다.

## 행과 열 나타내기

표의 범위는 행과 열 두 축이 필요합니다. `GridTopology`는 두 배열을 조합해
선택한 직사각형의 셀을 계산합니다.

```ts
import {
  gridCellsInRange,
  gridTopology,
} from "@interactive-os/json-document-editing";

const visibleGrid = gridTopology(
  ["r3", "r1", "r2"],
  ["score", "name"],
);

const cells = gridCellsInRange(visibleGrid, {
  anchor: { rowId: "r3", columnId: "score" },
  focus: { rowId: "r1", columnId: "name" },
});

// r3/score, r3/name, r1/score, r1/name
```

격자형 editor는 다루는 데이터에 맞춰 같은 모양에 이름을 붙입니다. Sheet는
이를 `SheetTopology`라고 부르고, Database는 행과 열을 `recordIds`와
`propertyIds`로 나타냅니다.

## Editor에 전달하기

Sheet editor는 선택을 읽거나 복사할 때 화면 순서를 받을 수 있습니다. 다음
함수는 `editor`를 매개변수로 받아 정렬된 행 순서를 전달합니다.

```ts
import type { SheetEditor } from "@interactive-os/json-document-editing";

function copyVisibleSelection(editor: SheetEditor) {
  const visible = {
    rowIds: ["r3", "r1", "r2"],
    columnIds: ["status", "name"],
  };

  editor.selectedCellsIn(visible);
  return editor.copy(visible);
}
```

화면 순서와 JSON 저장 순서가 같으면 Topology를 생략할 수 있습니다. 이때
Sheet는 문서의 `rows`와 `columns` 순서를 사용합니다.

Topology가 정한 범위는 선택 표시뿐 아니라 구조화된 복사 결과에도
쓰입니다. 이 범위를 옮길 값으로 만드는 과정은
[Clipboard](clipboard.md)에서 이어집니다.
