# Grid cell Adapter

`@interactive-os/json-document-web`의 Grid cell Adapter는 canonical `GridPoint`를
렌더링된 DOM cell의 주소로 투영합니다. Sheet, Database, Grid Widget이 서로
다른 domain 이름을 쓰더라도 같은 Web binding을 공유할 수 있습니다.

## Usage

```tsx
import { gridPointKey } from "@interactive-os/json-document-editing";
import {
  findWebGridCell,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";

const point = { rowId: row.id, columnId: column.id };

<td
  key={gridPointKey(point)}
  {...webGridCellAddressProps(point)}
/>

findWebGridCell<HTMLElement>(table, point)?.focus();
```

## API reference

### `webGridCellAddressProps(point)`

`GridPoint`를 `data-grid-row-id`와 `data-grid-column-id` 속성으로 투영합니다.
식별자를 CSS selector 문자열로 조합하지 않으므로 따옴표나 제어 문자를 별도로
escape할 필요가 없습니다.

### `findWebGridCell(root, point)`

`webGridCellAddressProps`로 등록한 descendant 중 같은 point를 가진 element를
반환합니다. 찾지 못하거나 root가 `null`이면 `null`을 반환합니다.

## Boundary

Adapter는 GridPoint와 DOM 주소의 correspondence만 소유합니다. Host는
cell 자체, 내부 `input`/`select`, 또는 active descendant 중 어느 곳에 focus할지
결정합니다. React component의 markup과 styling은 UI Primitive 책임입니다.
