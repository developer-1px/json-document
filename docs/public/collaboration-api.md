# Collaboration API

Collaboration package는 같은 `JSONDocument` port와 별도의 replica sidecar를
제공합니다. Base, History와 Text profile은 독립 entrypoint로 선택합니다.

## 설치하기

```sh
npm install @interactive-os/json-document \
  @interactive-os/json-document-collaboration
```

Collaborative contenteditable DOM Adapter가 필요할 때만 다음 package를 더합니다.

```sh
npm install @interactive-os/json-document-contenteditable-collaboration
```

## Entrypoint 선택하기

| Entrypoint | Runtime | 추가 authoring surface |
| --- | --- | --- |
| `@interactive-os/json-document-collaboration` | `CollaborationRuntime` | document와 replica |
| `@interactive-os/json-document-collaboration/history` | `HistoryRuntime` | selective `history` |
| `@interactive-os/json-document-collaboration/text` | `TextRuntime` | `text`와 selective `history` |
| `@interactive-os/json-document-contenteditable-collaboration` | DOM Adapter | contenteditable native-input lease |

## Base runtime

```ts
const runtime = createCollaborationRuntime(initial, options);

runtime.document.value;
runtime.document.read("/title");
runtime.document.validatePatch(operations);
runtime.document.commit(operations);
runtime.document.subscribe(listener);

runtime.replica.exportBundle();
runtime.replica.ingest(bundle);
runtime.replica.exportCheckpoint();
runtime.replica.subscribe(listener);
```

`createCollaborationRuntime`은 새 epoch runtime을 만들고,
`restoreCollaborationRuntime`은 checkpoint를 검증해 runtime을 재구성합니다.
`compactCollaborationCheckpoint`는 checkpoint에서 새 epoch artifact를 만듭니다.

## History와 Text profile

```ts
const historyRuntime = createHistoryRuntime(initial, options);
historyRuntime.history.undo();
historyRuntime.history.redo();

const textRuntime = createTextRuntime(initial, options);
const captured = textRuntime.text.capture("/title");
```

각 Result는 `{ ok: true } | { ok: false }` 형태의 expected outcome입니다.
실패한 ingest, restore, text plan과 history operation은 부분 상태를 적용하지
않습니다.

개념과 lifecycle은 [Collaboration](collaboration.md), [Collaborative
History](collaboration-history.md), [Collaborative Text](collaboration-text.md),
[Checkpoints & Epochs](collaboration-lifecycle.md)에서 설명합니다.
