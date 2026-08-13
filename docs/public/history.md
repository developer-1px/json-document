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
요청과 문서 값이 그대로인 요청도 되돌릴 값이 없어 기록되지 않습니다.

여기까지 `editor.dispatch`로 시작한 요청이 Selection과 Topology를 읽고,
Clipboard를 거쳐 문서와 History를 바꾸는 흐름을 살펴봤습니다. editor가
받는 전체 요청은 [Intent 레퍼런스](intent.md)에서 확인할 수 있습니다.
