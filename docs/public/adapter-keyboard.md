# Keyboard Adapter

Keyboard Adapter는 브라우저의 key chord를 의미 command로 바꿉니다. host는
그 command를 Topology 이웃이나 `editor.dispatch`에 연결합니다.

```ts
const keyboard = createWebKeyboardAdapter();

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
});
```

`pressInteractionFromWeb`은 Enter, Space, primary pointer와 cancellation을
제품 action이 없는 Press fact로 번역합니다. `projectWebWidgetState`는
canonical state를 ARIA state로 투영합니다. 둘 다 제품 Intent를 고르거나
logical focus를 소유하지 않습니다.

## Live Demo

```live-demo
/adapters/keyboard
```
