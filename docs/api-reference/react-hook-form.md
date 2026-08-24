# @interactive-os/json-document-react-hook-form API

**Owner:** Connector

React Hook Form connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-react-hook-form/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `CanonicalFormFailure`

```ts
interface CanonicalFormFailure {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}
```
## `JSONDocumentFormBinding`

```ts
interface JSONDocumentFormBinding<
  Values extends FieldValues,
  Selection extends JSONValue,
> {
  readonly form: UseFormReturn<Values>;
  readonly snapshot: EditingSnapshot<Selection>;
  readonly result: EditingResult<Selection> | null;
  readonly submit: (event?: BaseSyntheticEvent) => Promise<void>;
  readonly undo: () => EditingResult<Selection>;
  readonly redo: () => EditingResult<Selection>;
}
```
## `ReactHookFormConnector`

```ts
type ReactHookFormConnector<Values extends FieldValues> =
  JSONDocumentFormBinding<Values, null>;
```
## `ReactHookFormConnectorOptions`

```ts
type ReactHookFormConnectorOptions<Values extends FieldValues> =
  UseJSONDocumentFormOptions<Values>;
```
## `useJSONDocumentForm`

```ts
useJSONDocumentForm<Values extends FieldValues, Selection extends JSONValue>(session: EditingSession<Selection>, options?: UseJSONDocumentFormOptions<Values>, changeSource?: Pick<JSONDocument, "subscribe" | "at">): JSONDocumentFormBinding<Values, Selection>
```
## `UseJSONDocumentFormOptions`

```ts
interface UseJSONDocumentFormOptions<Values extends FieldValues> {
  readonly form?: Omit<UseFormProps<Values>, "defaultValues" | "values">;
  readonly errorName?: (failure: CanonicalFormFailure) => FieldPath<Values> | `root.${string}`;
  readonly origin?: string;
}
```
## `useReactHookFormConnector`

```ts
useReactHookFormConnector<Values extends FieldValues>(document: JSONDocument, options?: ReactHookFormConnectorOptions<Values>): ReactHookFormConnector<Values>
```
