# Zod Validate

`createZodValidator`는 Zod schema를 document validator로 연결합니다. 첫
Zod issue의 path는 JSON Pointer가 되고, root issue는 빈 pointer `""`를
사용합니다.

```ts
const validate = createZodValidator(schema, {
  code: "schema_violation",
});

const document = createJSONDocument(initial, { validate });
```

Zod transform이 만든 값은 검사 결과에만 사용합니다. document에는 검사할 때
받은 값을 그대로 적용합니다.

## Live Demo

```live-demo
/connectors/zod/validate
```
