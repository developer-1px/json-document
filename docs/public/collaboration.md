# Collaboration

한 문서를 여러 participant가 편집하려면 각자가 만든 변경의 인과관계를
보존하면서 같은 JSON value로 수렴해야 합니다. Collaboration Engine은 이
작업을 맡지만 기존 editor가 사용하는 document 계약은 바꾸지 않습니다.

```txt
Local JSON Document ─────┐
                         ├─> same JSONDocument port ─> Editing
Collaboration Engine ───┘
```

## Runtime 만들기

`createCollaborationRuntime`은 초기 JSON과 한 actor의 epoch 설정으로 runtime을
만듭니다.

```ts
import {
  createCollaborationRuntime,
} from "@interactive-os/json-document-collaboration";

const runtime = createCollaborationRuntime(
  { title: "Shared title" },
  {
    actorId: "browser-a",
    epochId: "document-42/v1",
    ruleset: {
      id: "example/document",
      digest: "example/document/v1",
    },
  },
);

runtime.document.commit([
  { op: "replace", path: "/title", value: "Edited together" },
]);
```

`runtime.document`는 Local implementation과 같은 여섯 member `JSONDocument`를
제공합니다. `runtime.replica`는 Change DAG와 다른 replica와 교환할
Collaboration Bundle을 소유합니다.

| Surface | 맡는 것 |
| --- | --- |
| `runtime.document` | document value, read, validation, commit, subscription |
| `runtime.replica` | Change authoring, bundle export/ingest, replica status와 checkpoint |

## Bundle로 동기화하기

Collaboration Engine은 transport를 제공하지 않습니다. Host가 WebSocket,
HTTP, 파일 또는 다른 전송 수단으로 bundle을 옮기고, replica는 도착 순서와
중복에 관계없이 이를 검증해 ingest합니다.

```ts
send(runtime.replica.exportBundle());
receive((bundle) => runtime.replica.ingest(bundle));
```

Change dependency가 아직 도착하지 않았다면 pending Change로 보관합니다.
필요한 Change가 도착하면 다시 materialize하고 valid JSON document value와
canonical change notification을 발행합니다.

## 선택 기능 조합하기

기본 runtime 위에 필요한 authoring surface만 선택합니다.

- [Replica & Sync](collaboration-replica.md): Change, dependency와 replica status
- [Collaborative History](collaboration-history.md): actor-local selective undo/redo
- [Collaborative Text](collaboration-text.md): string leaf의 text splice authoring
- [Checkpoints & Epochs](collaboration-lifecycle.md): restore와 장기 causal state 경계
- [Collaboration API](collaboration-api.md): package entrypoint와 공개 호출

Transport, authentication, presence, persistence와 제품별 conflict UI는 Product
Host가 조립합니다.
