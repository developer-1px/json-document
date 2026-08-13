# Replica와 synchronization

Replica는 한 participant가 소유하는 causal state와 synchronization
surface입니다. 사용자 presence나 network connection 자체가 아니라, 알고 있는
Change와 그 관계를 검증하고 현재 JSON document value를 materialize합니다.

## Change와 dependency

각 commit은 actor-local counter를 가진 Change ID와 causal predecessor인
dependency를 포함하는 Change가 됩니다. 이 dependency들이 Change DAG를 만들고,
알려진 successor가 없는 Change가 현재 head입니다.

```txt
Change A ──> Change B ──┐
                        ├─> deterministic materialization
Change A ──> Change C ──┘
```

동시에 작성된 object member와 array placement는 stable identity와 정해진
materialization 규칙으로 처리합니다. Conflict는 winner만 남기고 입력을 버리는
것이 아니라, 결정된 winner와 concurrent alternative를 replica 진단에 함께
보존합니다.

## Bundle export와 ingest

`exportBundle()`은 epoch와 Change를 담은 transport-neutral artifact를 만듭니다.
`ingest()`는 외부에서 받은 bundle 전체를 먼저 검증한 뒤 replica에 원자적으로
통합합니다.

```ts
const outbound = runtime.replica.exportBundle();
const result = other.replica.ingest(outbound);

if (!result.ok) {
  console.error(result.code, result.reason);
}
```

중복 delivery는 상태를 바꾸지 않습니다. 순서가 뒤바뀌어 dependency가 없으면
pending으로 유지하고, dependency가 도착한 뒤 같은 DAG에서 다시 계산합니다.

## Replica status 읽기

Replica status에는 현재 heads, pending Changes, conflicts와 suppressed Changes가
있습니다. 이는 복구 artifact인 checkpoint나 document value의 snapshot이
아닙니다.

`runtime.replica.subscribe`는 ingest가 causal state나 진단을 바꿀 때 immutable
status를 발행합니다. Transport와 제품 UI는 이 status를 관찰해 전송 대기나
conflict 표시 정책을 결정할 수 있습니다.

[Collaboration](collaboration.md)으로 돌아가 전체 runtime 경계를 보거나
[Checkpoints & Epochs](collaboration-lifecycle.md)에서 causal state를 복구하는
방법을 이어서 볼 수 있습니다.
