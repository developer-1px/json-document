# React Connector

React Connector는 document와 editor의 변경 알림을 React 구독으로 바꿉니다.
markup과 장르 Intent는 제품이 소유합니다.

```tsx
function DocumentView({ document }) {
  const value = useReactConnector(document);
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
```

| API | 역할 |
| --- | --- |
| `useReactConnector(document)` | 현재 document value 구독 |
| `useEditingSnapshot(source)` | editor 상태 구독 |
| `useDocumentEditor(initial, options?)` | component가 소유하는 editor lifecycle |
| `useEditing(options)` | range, focus, text cursor 질의 |
| `useEditingObservation(initialAnnouncement)` | 마지막 Intent·결과·announcement 관찰 |

## `useEditingObservation`

Editing Intent를 실행한 Host가 마지막 Intent·결과·announcement를 같은 lifecycle로
관찰할 때 사용합니다.

```tsx
import { useEditingObservation } from "@interactive-os/json-document-react";

const observation = useEditingObservation<DocumentIntent>("Ready");

const result = observation.dispatch(
  intent,
  editor.dispatch,
  "Block added",
  (failure) => failure.ok ? "" : `Rejected: ${failure.code}`,
);
```

```ts
function useEditingObservation<Intent>(initialAnnouncement: string): EditingObservation<Intent>

interface EditingObservation<Intent> {
  readonly announcement: string;
  readonly lastIntent: Intent | null;
  readonly lastResult: EditingObservedResult | null;
  announce(message: string): void;
  dispatch<Result extends EditingOperationResult>(
    intent: Intent,
    action: (intent: Intent) => Result,
    success: EditingResultMessage<Result>,
    failure?: EditingResultMessage<Result>,
  ): Result;
  observe<Result extends EditingOperationResult>(intent: Intent, result: Result): Result;
  observeResult<Result extends EditingOperationResult>(result: Result): Result;
  run<Result extends EditingOperationResult>(
    action: () => Result,
    success: EditingResultMessage<Result>,
    failure: EditingResultMessage<Result>,
  ): Result;
}
```

`dispatch`는 Intent와 결과를 기록하고 성공·실패 문구를 announcement로 투영합니다.
`run`은 undo처럼 새 Intent를 만들지 않는 작업의 문구만 갱신합니다. `observe`와
`observeResult`는 Host가 실행 순서를 직접 조립할 때 사용합니다. 실패 결과에
`code`가 없으면 관찰 결과에는 `editing.rejected`가 기록됩니다. 문구 자체는 제품
의미이므로 Host가 주입합니다.

선택과 cursor를 화면에 붙이는 사용법은 [React editing guide](react-editing.md)에서
이어집니다.

## Live Demo

```live-demo
/connectors/react
```
