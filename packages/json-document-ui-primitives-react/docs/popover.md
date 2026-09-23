## Popover · 아이콘 trigger

`Popover`는 `label`, `trigger`, `open`, `onOpenChange`와 panel 내용을 받습니다.
`triggerPresentation="icon"`이면 trigger를 공통 `Command`의 아이콘·툴팁으로 표시합니다.
label이 접근성 이름과 툴팁의 정본이며 icon은 `aria-hidden`으로 렌더링합니다.
기본 trigger presentation은 기존 label 표현입니다.

열 때 panel로 focus를 옮기고, Escape로 닫으면 trigger로 복귀합니다. 바깥 pointerdown과
panel 밖으로의 focus 이동은 panel만 닫고 사용자의 새 focus를 가로채지 않습니다.
panel 내부의 입력과 선택은 열린 상태를 유지합니다. Dialog와 달리 focus를 가두지 않습니다.
입력 draft를 언제 확정할지는 소비하는 Hand가 정합니다.

```tsx
import { Popover } from "@interactive-os/json-document-ui-primitives-react";

<Popover label="스타일" trigger={<Palette aria-hidden="true" size={16} />}
  triggerPresentation="icon" open={open} onOpenChange={setOpen}>
  {styleControls}
</Popover>
```

[Canvas Usage/Source](/demo/canvas)의 선택 스타일이 이 API를 사용합니다.
