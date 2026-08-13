# Checkpoints와 Epochs

Replica를 재시작하거나 causal history의 운영 경계를 바꾸려면 현재 JSON value만
저장해서는 부족합니다. Checkpoint는 같은 epoch의 Change, pending input,
history control과 conflict 진단을 다시 구성할 수 있는 복구 artifact입니다.

## Checkpoint export와 restore

```ts
import {
  restoreCollaborationRuntime,
} from "@interactive-os/json-document-collaboration";

const checkpoint = runtime.replica.exportCheckpoint();
const restored = restoreCollaborationRuntime(checkpoint, {
  actorId: "browser-a",
  ruleset: options.ruleset,
});
```

Restore는 cached document value를 그대로 신뢰하지 않고 checkpoint의 integrity와
epoch identity를 검증한 뒤 causal state를 replay합니다. 같은 actor가 다시
작성하려면 보존된 counter와 causal lineage를 먼저 복구해야 합니다.

## Membership와 ruleset 고정하기

Epoch는 base document, ruleset과 optional membership이 고정되는 collaboration
generation입니다. Membership은 Change를 작성하도록 admitted된 actor와
credential identifier를 epoch digest에 묶지만 authentication 자체를 수행하지
않습니다.

`ruleset.id`와 `ruleset.digest`는 validation과 materialization 정책의
compatibility identity입니다. 같은 epoch의 모든 writer는 동일한 결과를 내는
synchronous validation 규칙을 사용해야 합니다.

## 새 epoch로 compaction하기

Compaction은 causal history를 현재 valid JSON document value로 접고 새 epoch를
만듭니다. 기존 epoch 안에서 history를 삭제하는 작업이 아닙니다.

```ts
import {
  compactCollaborationCheckpoint,
} from "@interactive-os/json-document-collaboration";

const compacted = compactCollaborationCheckpoint(checkpoint, {
  mode: "new-epoch",
  nextEpochId: "document-42/v2",
  nextRuleset: options.ruleset,
});
```

Pending Change가 없어야 하며, Host가 writer를 멈추고 모든 participant의 epoch
전환을 조정해야 합니다. Collaboration Engine은 transport, storage나 server
coordination 권한을 가정하지 않습니다.

[Replica & Sync](collaboration-replica.md)에서 checkpoint가 보존하는 causal
state를 확인할 수 있습니다.
