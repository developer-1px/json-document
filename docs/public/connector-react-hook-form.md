# React Hook Form Connector

React Hook Form은 아직 document에 적용되지 않은 draft와 field state를
관리합니다. Connector는 검사를 통과한 submit을 하나의 document 변경으로
적용하고, 외부 commit이나 undo 뒤에는 form을 canonical value에 맞춥니다.

```tsx
const binding = useReactHookFormConnector(document, {
  errorName: ({ pointer }) => pointer === "/profile/name"
    ? "profile.name"
    : "root.canonical",
});

return <form onSubmit={binding.submit}>...</form>;
```

Selection만 바뀐 경우에는 입력 중인 draft를 유지합니다.

## Live Demo

```live-demo
/connectors/react-hook-form
```
