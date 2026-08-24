# @interactive-os/json-document-ajv API

**Owner:** Connector

Ajv validation connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ajv/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `AjvValidatorOptions`

```ts
interface AjvValidatorOptions {
  readonly code?: string;
  /**
   * `clone` protects canonical candidates from mutating Ajv options and custom
   * keywords. Use `none` only when the compiled validator is proven read-only.
   */
  readonly candidateIsolation?: "clone" | "none";
}
```
## `createAjvValidator`

```ts
createAjvValidator(validate: AjvValidateFunction, options?: AjvValidatorOptions): (candidate: JSONValue) => JSONPatchValidationResult
```
