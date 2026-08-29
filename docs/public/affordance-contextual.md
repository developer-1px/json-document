# Contextual affordance

콘텐츠가 쉬고 있을 때 control을 숨기고, pointer approach와 keyboard focus,
selection, editing이 요구하는 control만 콘텐츠 가까이에 드러냅니다. 입력 장치가
아니라 콘텐츠 상태가 phase를 결정하므로 hover가 없는 touch도 selection으로
같은 기능에 도달합니다.

```ts
import { contextualAffordance } from "@interactive-os/json-document-affordance";

const snapshot = contextualAffordance({
  focused: true,
  capabilities: [
    { id: "create", phases: ["approach"] },
    { id: "delete", phases: ["selected"] },
    { id: "title", phases: ["editing"] },
  ],
});

// { phase: "approach", visible: ["create"] }
```

React Host는 `ContextualControls`로 같은 계약을 소비합니다. Host는 capability
ID와 배치를 고르지만 rest/approach/selected/editing 우선순위를 다시 구현하지
않습니다.

```tsx
import { ContextualControls } from "@interactive-os/json-document-ui-primitives-react";

<ContextualControls
  capabilities={[{ id: "navigate", phases: ["approach"] }]}
>
  {(state) => state.visible.includes("navigate") ? <CalendarNavigation /> : <PeriodTitle />}
</ContextualControls>
```

닫는 계약:

- rest에서는 `visible`이 비어 있습니다.
- pointer approach와 keyboard focus는 같은 `approach` phase입니다.
- selection은 hover 없이 `selected` control을 유지합니다.
- editing은 가장 안쪽 phase이며 필요한 editor capability만 드러냅니다.
- capability의 구체적인 command 의미와 화면 배치는 각 정본 owner와 Host에 남습니다.

