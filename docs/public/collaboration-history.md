# Collaborative History

협업 중 undo가 현재 화면의 값을 과거 값으로 덮어쓰면 다른 actor의 작업까지
지울 수 있습니다. Collaborative History는 현재 actor가 만든 causal
contribution만 선택적으로 비활성화하거나 다시 활성화합니다.

## Editing History와 구분하기

| History | 맡는 것 |
| --- | --- |
| Editing History | 한 editor의 document patch와 structural Selection을 함께 복원 |
| Collaborative History | 한 actor의 causal contribution을 selective undo/redo |

둘은 같은 이름의 편의 기능이 아니라 서로 다른 기록 단위와 복원 의미를
가집니다. Collaborative History는 inverse value를 새로 써서 다른 actor의
현재 값을 덮지 않습니다.

## History runtime 만들기

History authoring은 opt-in entrypoint에서 엽니다.

```ts
import {
  createHistoryRuntime,
} from "@interactive-os/json-document-collaboration/history";

const runtime = createHistoryRuntime(initial, options);

runtime.document.commit([
  { op: "replace", path: "/title", value: "My title" },
]);

runtime.history.undo();
runtime.history.redo();
```

기본 Collaboration runtime도 다른 replica가 보낸 history wire operation을
ingest하고 materialize합니다. 다만 `runtime.history` authoring surface는
`/history` profile을 선택한 caller에게만 제공합니다.

## Causal contribution 복원하기

Selective undo는 원래 Change의 contribution을 비활성화하는 새 causal record를
작성합니다. Concurrent Change가 같은 위치에 기여했다면 그 Change는 그대로
남습니다. Selective redo는 아직 유효한 undo contribution을 다시 활성화합니다.

History status는 현재 undo/redo target, depth와 revision을 알려 줍니다. Product
Host는 이를 버튼 상태와 사용자 안내에 연결하고, 다른 actor의 history를 대신
작성하지 않습니다.

[Collaboration API](collaboration-api.md)에서 `/history` entrypoint를 확인할 수
있습니다.
