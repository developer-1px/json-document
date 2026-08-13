# History

잘라내기나 붙여넣기로 JSON 값이 바뀌면 사용자는 그 작업을 되돌릴 수 있어야
합니다. Editing은 적용한 patch와 그 변경을 되돌릴 patch를 함께 기록합니다.
이 기록을 순서대로 되돌리고 다시 적용하는 기능이 History입니다.

## 값과 Selection 복원하기

문서 값을 되돌린 뒤 선택이 사라진 위치에 남아 있으면 사용자는 작업을
이어가기 어렵습니다. 그래서 각 History 항목에는 patch와 함께 변경 전후의
Selection이 들어갑니다.

블록을 고르고 잘라낸 뒤 실행 취소하면 제거된 블록이 돌아오고 Selection도
잘라내기 전 위치로 복원됩니다. 다시 실행하면 값과 Selection이 잘라내기 직후
상태로 이동합니다.

```ts
const cut = editor.cut();

if (cut?.result.ok) {
  editor.undo();
  editor.redo();
}
```

## 기록이 생기는 시점

History 항목은 JSON 값이 실제로 바뀐 편집에서 생깁니다. Selection 이동은
현재 편집 대상만 바꾸므로 기록을 추가하지 않습니다. 검사를 통과하지 못한
요청과 결과가 같은 요청도 되돌릴 값이 없어 기록되지 않습니다.

다른 구독자가 document에 직접 변경을 적용하면 editor의 로컬 History는
비워집니다. 이후의 undo가 외부에서 들어온 새 값을 이전 로컬 상태로 덮는
상황을 막기 위해서입니다.

이 History는 한 editor에서 수행한 작업을 되돌리는 기록입니다. 여러 사용자의
변경을 합치고 각 참여자의 작업을 추적하는 협업 기록은 별도의 협업 계층에서
다룹니다.

Selection, Topology, Clipboard, History가 준비되면 사용자의 편집 요청을
editor에 보낼 수 있습니다. 다음 [Intent guide](intent-guide.md)에서는 블록을
고르고 추가하는 요청을 코드로 만들어 봅니다.
