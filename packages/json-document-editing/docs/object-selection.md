## Object Selection · primary와 집합 편집

`selection.set`은 `objectIds`, `mode`와 선택적인 `primaryKey`를 받습니다.
`primaryKey`를 생략하면 Selection key family의 기본 전이를 사용합니다.
명시하면 **전이 후 선택 집합에 포함된 key**여야 하며, 아니면
`selection.primary-not-selected`로 기존 상태·문서·History를 보존합니다.

`object.translate`, `object.resize`, `object.text`의 대상이 현재 선택의 부분집합이면
선택 집합과 primary를 보존합니다. 선택 밖 대상을 직접 지정하면 기존대로 그 대상을
선택합니다. 따라서 전체 선택 이동, primary만 resize/text 편집을 같은 ObjectEditor로
실행할 수 있습니다. 문서 연산·검증은 Object Document Type이 소유합니다.

```ts
editor.dispatch({ type: "selection.set", objectIds: ["a", "b"], primaryKey: "a" });
editor.dispatch({ type: "object.translate", objectIds: ["a", "b"], dx: 20, dy: 10 });
editor.dispatch({ type: "object.resize", objectIds: ["a"], dx: 0, dy: 0, dw: 10, dh: 0 });
```

선택은 문서 밖의 Editing session 상태입니다. 선택 전이는 문서 commit이나 Undo 기록을
만들지 않고 redo도 제거하지 않습니다. 집합 이동·삭제는 객체마다 dispatch하지 않고 하나의
Intent를 사용합니다. Undo/Redo는 해당 문서 변경과 함께 원인 선택 집합·primary를 복원합니다.

실제 public API 소비: [Canvas Usage와 Source](/demo/canvas).
