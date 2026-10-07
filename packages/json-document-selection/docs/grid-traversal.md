# Grid traversal

`traverseGrid(index, options)`는 보이는 두 축의 순번을 순회합니다. row ID, A1 이름, DOM, 문서 변경은 소비자가 변환합니다. `row-major`는 Tab 입력 순서, `column-major`는 Enter 입력 순서이며 `reverse`로 역방향, `wrap`으로 선택 사각형 안의 순환을 지정합니다. 범위 밖 이동과 유효하지 않은 좌표는 `null`입니다. 전체 셀 배열을 만들지 않으므로 큰 희소 시트에도 사용할 수 있습니다.

```ts
import { traverseGrid } from '@interactive-os/json-document-selection';
traverseGrid({rowIndex:1,columnIndex:1}, {rowCount:2,columnCount:2,order:'row-major',wrap:true});
// {rowIndex:0,columnIndex:0}
```

[Sheet Usage](/demo/sheet)의 `selection.navigate`와 Web의 순차 이동이 이 API를 사용합니다. 형제 `dogfooding-sheet`의 `rangeTabTarget`과 `rangeEnterTarget`도 같은 함수를 사용하며 A1 및 숨김 축의 변환을 유지합니다. 포인터 기반 선택 시작·미리보기·종료는 두 소비자 모두 기존 `reducePressInteraction`을 사용합니다.
