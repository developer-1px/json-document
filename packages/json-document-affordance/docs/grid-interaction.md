# Grid fill and axis resize

`extendGridFill(source, point, bounds)`는 셀 범위 채우기의 방향을 결정합니다. 시작 사각형에서 더 멀리 벗어난 축을 택하고, 동률이면 세로 축을 택하며, 표 경계로 제한합니다. 셀 값 복제·수식 이동·History는 이 함수의 책임이 아닙니다.

`clampResizeValue`, `storedResizeValue`, `resizeValueForKey`, `collapseResizeValue`는 한 축의 크기 제한·저장 시 반올림·키보드 증감·접기/복원을 제공합니다. 기본 폭과 최소/최대 크기는 소비자가 정책으로 제공합니다. 일반 증감은 10, Shift 증감과 PageUp/Down은 50이며 Home/End는 경계 크기를 선택합니다.

두 계약은 형제 `dogfooding-sheet`에서 가져와 정본으로 옮겼습니다. 형제의 `fillTargetForCell`과 `resizeRules`는 좌표 변환과 제품 기본값을 유지하며 이 API를 소비합니다. 작은 엔진이 Web/React나 다른 runtime을 로드하지 않도록 `@interactive-os/json-document-affordance/grid-fill` 및 `/axis-resize` subpath도 제공합니다. package root와 같은 구현입니다.

```ts
import { extendGridFill, storedResizeValue } from '@interactive-os/json-document-affordance';
const target=extendGridFill({rMin:0,rMax:1,cMin:0,cMax:1},{row:3,column:1},{rowCount:10,columnCount:5});
const width=storedResizeValue(143.6,{min:40,max:1200});
```

[Sheet Usage](/demo/sheet)의 채우기 핸들과 행열 리사이즈에서 확인할 수 있습니다. 드래그 미리보기는 문서를 변경하지 않고 확정 시 Editing Intent 하나를 실행합니다. 기존 Sheet의 수식 및 수열 채우기는 해당 Sheet 엔진에 유지되며, JSON/Markdown Hand의 `range.fill`은 원본 값 패턴을 반복 복제합니다.
