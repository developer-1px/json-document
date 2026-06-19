# @interactive-os/json-document-autosave

Lab autosave extension for `@interactive-os/json-document` documents.

Use it to test whether autosave can stay outside core while using only the
public document subscription and current value.

## 1.0 status

1.0에서는 lab으로 유지한다. Core API 변경도 없고 official 승격도 보류한다.

이 package가 맡는 책임은 valid document change를 구독하고 latest schema-valid
snapshot save를 coalesce하는 headless lifecycle이다. Retry, backoff, offline
queue, conflict resolution, durable transport, save UI는 제품 정책 차이가 크므로
아직 official surface로 얼리지 않는다.

```ts
import { createAutoSave } from "@interactive-os/json-document-autosave";

const autosave = createAutoSave(doc, {
  save: async ({ value }) => {
    await api.saveDraft(value);
  },
});

await autosave.flush();
```

## Scope

- Subscribe to document patch events.
- Schedule host-owned save work.
- Save the latest `doc.value` snapshot.
- Coalesce changes while a save is pending or running.
- Expose headless status and subscriber notifications.

## Non-goals

- No storage, server, fetch, retry, backoff, conflict resolution, or offline
  queue policy.
- No save button, toast, spinner, keyboard, focus, or dirty badge UI.
- No persistence envelope; compose persistence separately if needed.
- No plugin registration; this package composes functions and does not call
  `doc.use(...)`.
- No `@interactive-os/json-document` internal imports.

## Friction report

The public facade is enough for autosave orchestration: `doc.subscribe` tells the
extension that a valid change happened, and `doc.value` gives the latest
schema-valid snapshot.

This lab intentionally keeps scheduler, transport, retry, conflict, and UI
policy outside core.
