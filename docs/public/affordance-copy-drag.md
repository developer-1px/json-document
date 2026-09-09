# Duplicate

Duplicate는 원본을 남기고 새 ID를 가진 사본 집합을 만드는 손입니다.
평면 선택에서는 [`createPlaneSelectProfile`](/docs/api/affordance)이 기존
`dragAffordance`·`dragOperation`을 조합하여 `operation: "copy"`를 반환합니다.
ID·문서·Selection·History는 Object Editing이 소유합니다.

```ts
import { createPlaneSelectProfile } from "@interactive-os/json-document-affordance";

const profile = createPlaneSelectProfile();
profile.begin({ items: document.objects, selection: editor.snapshot.selection }, {
  point: origin, hitKey: objectId, altKey: true,
});
const preview = profile.preview(point, modifiers); // 원본과 변환된 사본 렌더링; 문서/ID 불변
const result = profile.commit(point, modifiers);
if (result) {
  editor.dispatch({ type: "selection.set", objectIds: result.selection.keys,
    ...(result.selection.primaryKey === null ? {} : { primaryKey: result.selection.primaryKey }) });
  const delta = result.translation;
  if (delta) editor.dispatch(delta.operation === "copy"
    ? { type: "object.duplicate", objectIds: delta.keys, placement: { type: "offset", dx: delta.dx, dy: delta.dy } }
    : { type: "object.translate", objectIds: delta.keys, dx: delta.dx, dy: delta.dy });
}
```

Alt/Option+drag는 copy, release 전에 Alt를 놓으면 move입니다. Shift는 큰 delta 축을
고정합니다. 원본은 문서 순서 그대로 남고 사본 preview는 위에 그립니다. 취소·Alt-click·
최종 zero delta는 복제하지 않습니다. 사본 생성과 위치 변경은 하나의 Intent/Undo이며
사본 집합·대응 primary를 선택합니다. Host에 별도 복제 구현을 두지 않습니다.

Mod+D와 공통 아이콘 툴바의 복제는 같은 `object.duplicate`를 사용합니다. 기본 offset은
x/y 각각 24단위이고 반복 복제는 방금 생성한 선택을 대상으로 합니다. Clipboard는 건드리지
않습니다. 값의 복사·잘라내기·붙여넣기는 별도로 Web Clipboard와 Object Editing이 연결합니다.

실제 [Canvas Usage와 Source](/demo/canvas)에서 이 정본 경로를 확인할 수 있습니다.
