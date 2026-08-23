# Contenteditable Adapter

Contenteditable Adapter는 local `JSONDocument`의 문자열 pointer를 React
contenteditable root에 붙입니다. IME와 native input 동안 해당 root의
model-to-DOM render만 유예하고, 변경은 document의 `commit`으로 들어갑니다.

```tsx
const document = createJSONDocument({ title: "Shared title" });

<ContentEditable document={document} pointer="/title" />;
```

toolbar, slash palette, 전송 action과 marks 의미는 이 Adapter의 책임이
아닙니다.

## Live Demo

```live-demo
/adapters/contenteditable
```
