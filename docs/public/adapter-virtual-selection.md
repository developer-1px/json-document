# Virtual Selection Adapter Reference

Virtual Selection Adapter는 일부 콘텐츠만 DOM에 마운트하는 surface에서도 브라우저의
Native Selection 표시와 전체 model text 복사를 같은 사용자 작업으로 연결합니다.
가상화 engine이나 document selection을 소유하지 않습니다.

## `registerWebVirtualSelectionScope`

framework-neutral consumer는 selection root와 전체 text reader를 owner document에
등록합니다.

```ts
const registration = registerWebVirtualSelectionScope(root.ownerDocument, {
  activation: "fallback",
  selectionRef: { current: root },
  readAllText: () => transcript.items.map(renderPlainText).join("\n"),
});

registration.unregister();
```

`Cmd/Ctrl+A`는 현재 마운트된 root에 실제 DOM Range를 만들고, 이어지는 native
`copy` event는 `readAllText()` 결과를 `text/plain`으로 기록합니다. 사용자가 Range를
부분 선택으로 바꾸면 model-backed 전체 복사는 해제됩니다.

한 document에는 `fallback` scope가 하나만 존재할 수 있습니다. `contained` scope는
자기 boundary 안에서 가장 가까운 scope가 우선하므로 transcript 안의 log panel이나
code surface처럼 중첩된 전체 선택 의미를 표현합니다. input, textarea, select와
contenteditable은 브라우저 기본 선택을 유지합니다.

## `useVirtualSelectionScope`

React consumer는 callback ref 하나로 Web 등록 lifecycle을 조립합니다.

```tsx
const transcriptRef = useVirtualSelectionScope({
  activation: "fallback",
  readAllText: () => conversationItemsPlainText(items),
});

return <section ref={transcriptRef}>{visibleItems.map(renderItem)}</section>;
```

Hook은 rerender 후 최신 reader를 사용하고 callback ref가 다른 element를 받거나
unmount될 때 document 등록을 정리합니다.

## Live Demo

```live-demo
/adapters/virtual-selection
```

## 경계

- Adapter는 document event coordination, Native Range와 model-backed plain-text copy를 소유합니다.
- Host는 전체 model text projection과 어느 scope가 fallback/contained인지 결정합니다.
- Virtualizer는 visible window와 scroll을 계속 소유합니다.
- 구조화된 Clipboard payload, cut/paste, Editing selection과 History는 기존 정본 계약에 남습니다.
