# Collaborative History

Collaborative History는 지금 참여자가 만든 인과 기여를 끄거나 다시 켭니다.
다른 참여자가 그 위에 쓴 글을 지우고 값을 덮어쓰지 않습니다.

Editing의 로컬 History와 다릅니다. 로컬 undo는 한 editor의 값과 Selection을
같이 되돌립니다. 여기서의 undo는 문서 시간 여행이 아닙니다.

## Editor에 연결하기

`createCollaborationEditingHistory(runtime)`는
`@interactive-os/json-document-collaboration/editing`의 공개 API입니다.
같은 runtime의 document와 history를 editor에 함께 전달합니다.

```ts
import { createTextRuntime } from "@interactive-os/json-document-collaboration/text";
import { createCollaborationEditingHistory } from "@interactive-os/json-document-collaboration/editing";
import { createRichTextEditor } from "@interactive-os/json-document-rich-text";

const runtime = createTextRuntime(initialRichText, {
  actorId: "browser-a",
  epochId: "draft-42/v1",
  ruleset: { id: "rich-text/v1", digest: "my-schema/v1" },
});
const editor = createRichTextEditor({
  document: runtime.document,
  history: createCollaborationEditingHistory(runtime),
});

editor.dispatch({ type: "text.insert", text: "안녕하세요" });
editor.undo();
editor.redo();
editor.snapshot.canUndo;
editor.snapshot.canRedo;
```

Document·Order·Object·Sheet·Tree·Database·Kanban·Calendar·Annotation editor도
두 번째 인자로 `{ history }`를 받습니다. 연결 없이 협업 document만 넣으면
기존 local inverse history가 유지되며 외부 변경 시 비워집니다.

## 하나의 history owner

Toolbar, Cmd/Ctrl+Z, native history input은 모두 editor의 undo/redo를 호출합니다.
별도 Host stack을 만들지 않습니다. availability와 값이 바뀌지 않는 인과 history
통지도 Collaboration이 소유합니다.

Editor는 자신이 기록한 target의 Selection을 복원하되 현재 문서로 mapping합니다.
다른 참여자의 text 삽입은 위치 계산에 반영하고, 삭제된 domain ID는 정리합니다.
Editor가 생성되기 전에 작성된 target은 알 수 없는 과거 Selection을 만들지 않고
현재 Selection을 reconcile합니다. Selection은 collaboration wire에 들어가지 않습니다.

`runtime.history.undo/redo`의 성공 결과는 자기 작업의 `change`와 `status`를
담습니다. `change`는 실제 `JSONAppliedChange`이며, 문서 값이 그대로면 `null`입니다.
`status`는 구독자 통지 전의 undo/redo target·revision·`canUndo`·`canRedo`입니다.
구독자가 별도 편집을 실행해도 그 변경을 원래 undo/redo 결과에 섞지 않습니다.
공식 연결 API가 이 정보를 Editing에 전달하므로 Host는 알림 순서로 작업을
구분할 필요가 없습니다.

직접 `EditingHistory`를 구현한다면 성공 결과에 `target`, `change`, `status`를
모두 반환합니다. `change`는 해당 작업 직전 문서에 적용할 수 있는 자기 변경이고,
`status`는 해당 작업 직후의 `EditingHistoryStatus`입니다. 이전의 target-only
구현은 이 두 필드를 추가해야 합니다.

선택 mapping/reconciliation 콜백이 예외를 던지면 일관된 snapshot이 준비될 때까지
세션은 새 편집이나 undo/redo를 실행하지 않습니다. 이미 성공한 협업 undo/redo는
취소되지 않으며, 다음 읽기는 보관한 작업 결과의 선택 복원만 재시도합니다.
콜백을 수정하거나 editor를 다시 구성한 뒤 진행합니다. 콜백 예외를 history 작업의
거절로 해석해 같은 작업을 다시 실행하지 않습니다.

협업 undo 단위는 인과 commit 하나입니다. Local `historyGroup`은 이 단위를 합치지
않으며, external history에서 `history: "ignore"` plan은 변경 전에 거절됩니다.
기본 local 사용에서는 기존 grouping을 유지합니다.

## Usage

[Rich Text 협업 history 실행 예](/editing/rich-text?history=collaboration)에서
직접 입력 → 원격 변경 수신 → Undo/Redo를 확인할 수 있습니다.
Usage와 Source 탭은 공개 editor와 connection의 정본 구현으로 연결됩니다.
API 타입은 [Collaboration API](/docs/api/collaboration)와
[Editing API](/docs/api/editing)에 있습니다.
