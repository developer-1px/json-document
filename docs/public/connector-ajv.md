# Ajv Connector

Ajv Connector는 compile된 validator를 `JSONDocumentOptions.validate`에 맞는
함수로 바꿉니다. 첫 Ajv error의 `instancePath`와 message는 JSON Pointer를
가진 실패 결과가 됩니다.

```ts
const validateSchema = ajv.compile(schema);
const validate = createAjvValidator(validateSchema, {
  code: "schema_violation",
});

const document = createJSONDocument(initial, { validate });
```

Ajv가 검사 과정에서 값을 변형하더라도 document에는 검사할 때 받은 값을
적용합니다. validator는 document 계약에 맞춰 동기식이어야 합니다.

## Live Demo

```live-demo
/connectors/ajv
```
