# Zod Connector

Zod Connector는 object schema와 record를 Database document로 번역합니다.
string, number, boolean, enum field를 property로 만들고 `id` string field를
record ID로 사용합니다.

```ts
const translated = databaseDocumentFromZod(rowSchema, records);

if (translated.ok) {
  const database = createDatabaseEditor(translated.value);
}
```

nested object, array, date처럼 번역할 수 없는 field는 실패 결과로 돌려줍니다.
document validation 연결은 [Validate](connector-zod-validate.md)에서
분리해 설명합니다.

## Live Demo

```live-demo
/connectors/zod
```
