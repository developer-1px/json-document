# Marquee

TBD.

Marquee는 빈 평면에서 사각형(또는 올가미)을 끌어 여러 대상을 집는
손입니다. 고른 대상을 옮기는 [Drag](affordance-drag.md)와 다릅니다.
`crosshair` / `cell` 커서가 이 손을 가리킬 수 있습니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- 빈 곳에서 pointerdown → move → up
- Shift: 기존 고르기에 더함
- Mod: 토글
- 칸 위 `cell` 커서, 그림 위 `crosshair`

호스트는 히트 테스트와 기하를 계산합니다.

근거: [Apple HIG band selection](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor `cell` / `crosshair`](https://www.w3.org/TR/css-ui-4/#cursor)
