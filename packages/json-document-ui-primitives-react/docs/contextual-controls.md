# ContextualControls

`ContextualControls`는 pointer 접근, keyboard focus, 선택, 편집 상태를
Affordance의 `contextualAffordance`에 전달하고 표시 가능한 capability를 반환합니다.
소비자는 capability와 배치를 정하며 hover/focus 노출 판단을 다시 구현하지 않습니다.

- `rootRef`: root DOM이 필요한 기존 편집·hit-test 연결에 사용합니다.
- `revealWithoutHover`: primary input이 hover를 지원하지 않을 때 접근 상태로
  처리합니다. 기본값은 false이며 media query 변경과 구독 정리는 이 모듈이 소유합니다.
- `selected`, `editing`: 제품의 상태를 전달합니다. phase 우선순위는 Affordance가 소유합니다.

```tsx
<ContextualControls rootRef={surface} revealWithoutHover
  capabilities={[{id: "toolbar", phases: ["approach", "selected", "editing"]}]}>
  {state => <Toolbar label="표 작업" inert={!state.visible.includes("toolbar")}
    aria-hidden={!state.visible.includes("toolbar")}>{commands}</Toolbar>}
</ContextualControls>
```

SheetHand가 같은 root에서 범위 포인터 처리와 contextual 표시를 조합합니다.
[Sheet Usage](/demo/sheet)와 독립 Sheet·Markdown 표가 실행 예제입니다.
숨긴 컨트롤의 DOM 공간 유지 여부는 소비자가 정하되 focus와 접근성 노출도 함께 처리합니다.
