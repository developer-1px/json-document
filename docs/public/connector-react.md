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

선택과 cursor를 화면에 붙이는 계약은 [React editing](react-editing.md)에서
이어집니다.

## Live Demo

```live-demo
/connectors/react
```
