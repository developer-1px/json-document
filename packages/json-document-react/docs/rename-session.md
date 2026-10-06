# 초안 세션의 React 연결

`useRenameSession({owner, tryCommit, onFinish})`는 Affordance의 `createRenameSession`을 React에 연결합니다. `snapshot`으로 렌더링하고 `session.begin/update/commit/cancel`로 명령합니다. `tryCommit`이 false이면 초안을 닫지 않으며, owner가 바뀌면 이전 owner의 초안을 가져오지 않습니다.

React owner는 관찰과 교체 수명을 소유하고, 초안 상태 전이는 Affordance가 소유합니다. [Sheet Usage](/demo/sheet)의 셀 편집과 Source에서 실제 연결을 확인할 수 있습니다.
