## Chat draft clearing

`clearComposerDraft(editor, draft, { createId })`는 제출이 수락된 draft를 비우는 정본 연산입니다.
현재 model을 유지하고 새 draft·instruction·paragraph ID를 할당합니다. 기존 Rich Text editor에
하나의 undoable patch를 적용한 뒤 새 paragraph 시작으로 selection을 둡니다.
반환값은 `ComposerCommandResult`이며 실패는 `ok: false`로 노출합니다.

React 소비자는 `useComposer({ shouldClearAfterSubmit: true, ... })`로 이 연산을 사용합니다.
React binding이 비동기 전송 중 draft가 바뀌었는지 검사하므로 늦은 성공으로 새 입력을 잃지 않습니다.
직접 호출하는 소비자도 현재 draft에 대해 호출해야 하며 진행 중인 첨부 준비를 먼저 취소해야 합니다.
[Chat Usage](/demo/chat)의 Source에서 제출 lifecycle과 이 구현을 함께 확인할 수 있습니다.
