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

기본 local history는 실제 외부 문서 변경이 있으면 비워집니다. UI 구독자가 없거나
구독을 해제한 뒤에도 같은 정책을 따릅니다. 외부 변경 후 값이 원래 값으로
돌아와도 이전 Undo/Redo 기록은 되살아나지 않습니다. 동일 값의 새 snapshot
reference나 문서 no-op은 기록을 지우지 않습니다. 다른 참여자의 변경을
보존하며 내 기여만 취소하려면 [Collaborative History](collaboration-history.md)의
공식 연결 API를 사용합니다. document만 바꾸는 것으로 history 의미까지 바뀌지는 않습니다.

`createEditingSession`의 선택 mapping/reconciliation 콜백은 외부 변경에 맞는
선택을 계산한 뒤 값·선택·history 상태·revision을 함께 확정합니다. 콜백이
예외를 던지면 이전의 일관된 상태를 보관하고, 다음 읽기나 명령에서 동기화를
재시도합니다. 실패가 지속되는 동안에는 오래된 undo를 현재 문서에 적용하지
않습니다. 동기화에 성공하면 local history를 비우고 새 snapshot을 알립니다.
외부 document commit 자체는 이미 완료됐으므로 콜백 오류로 되돌아가지 않습니다.

snapshot 읽기에서 외부 변경을 따라잡아도 그 revision의 알림은 전달됩니다.
다른 구독자가 먼저 읽었다는 이유로 알림이 누락되지 않습니다. 구독 해제 함수는
여러 번 호출해도 같은 콜백으로 새로 만든 구독을 해제하지 않습니다.

여기까지 `editor.dispatch`로 시작한 요청이 Selection과 Topology를 읽고,
Clipboard를 거쳐 문서와 History를 바꾸는 흐름을 살펴봤습니다. editor가
받는 전체 요청은 [Intent 레퍼런스](intent.md)에서 확인할 수 있습니다.

## Live Demo

```live-demo
/demo/history
```
