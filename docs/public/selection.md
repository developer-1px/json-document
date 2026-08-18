# Selection

사용자가 블록을 클릭하면 다음 편집 명령은 그 블록을 대상으로 삼습니다.
편집기는 이 대상을 `document.value`와 별도인 상태로 기억합니다. 현재 편집
대상을 나타내는 이 상태가 Selection입니다.

블록을 골라도 `document.value`는 유지되고 선택 표시만 옮겨갑니다. 실행 취소
기록도 생기지 않습니다. History는 값이 바뀐 편집만 기록하기 때문입니다.

## 대상을 하나 고르기

앞 문서에서 만든 `editor`는 블록 ID를 받아 Selection을 갱신합니다.

```ts
const result = editor.dispatch({
  type: "selection.set",
  blockId: "welcome",
});

if (result.ok) {
  console.log(editor.selectedBlockIds); // ["welcome"]
}
```

선택 상태에는 화면 좌표 대신 JSON이 바뀌어도 다시 찾을 수 있는 ID를
저장합니다. 포인터가 어느 블록 위에 있는지는 화면이 계산하고, editor에는
찾아낸 ID를 넘깁니다.

## 범위를 늘리기

문서와 표, 트리처럼 항목이 순서대로 놓인 화면에서는 시작점과 끝점으로
범위를 만듭니다. 첫 클릭은 기준점인 `anchor`와 현재 끝점인 `focus`를 같은
대상에 둡니다. Shift 클릭은 `anchor`를 유지한 채 `focus`를 옮깁니다.

두 점 사이에 어떤 항목이 포함되는지는 화면의 순서에 따라 달라집니다. 이
순서를 Selection과 함께 사용하기 위해 [Topology](topology.md)를 넘깁니다.

[Selection Demo](/demo/selection)에서는 같은 블록 목록에 `replace`, `extend`,
`toggle` 입력을 차례로 보내며 Selection만 어떻게 달라지는지 확인할 수
있습니다. 문서 값과 History가 그대로인 것도 결과 옆에서 함께 보입니다.

## 값을 바꿀 때 선택도 함께 넘기기

선택만 바뀐 동안에는 문서 기록이 생기지 않습니다. 이후 삭제나 붙여넣기로
JSON 값이 바뀌면 editor는 변경 전후의 Selection을 patch와 함께 기록합니다.
실행 취소는 값과 사용자가 작업하던 위치를 함께 복원합니다.

다음 [Topology](topology.md) 문서에서는 범위 Selection에 화면 순서를
더합니다. React에서 그 범위와 커서를 그리려면
[React에서 선택과 커서 그리기](react-editing.md)의 `useEditing`
질의를 씁니다. KeyboardEvent를 command로 바꾸는 일은
[Adapters](adapters.md)입니다.
