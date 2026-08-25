# @interactive-os/json-document-composer API

**Owner:** Hands

Composer draft와 reference/trigger command 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-composer/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `COMPOSER_MENTION_NODE`

```ts
const COMPOSER_MENTION_NODE: "os.interactive/mention"
```
## `COMPOSER_PROFILE_V1`

```ts
const COMPOSER_PROFILE_V1: "urn:interactive-os:json-document:composer:1"
```
## `COMPOSER_SKILL_NODE`

```ts
const COMPOSER_SKILL_NODE: "os.interactive/skill"
```
## `ComposerAttachment`

```ts
interface ComposerAttachment extends Record<string, JSONValue> {
  readonly id: string;
  readonly kind: "document" | "image";
  readonly name: string;
  readonly size: number;
  readonly mediaType: string | null;
}
```
## `ComposerCommandResult`

```ts
type ComposerCommandResult = ReturnType<RichTextEditor["dispatch"]>;
```
## `ComposerDraft`

```ts
interface ComposerDraft<Model extends string = string> extends Record<string, JSONValue> {
  readonly id: string;
  readonly profile: typeof COMPOSER_PROFILE_V1;
  readonly instruction: RichTextDocument;
  readonly attachments: ReadonlyArray<ComposerAttachment>;
  readonly model: Model;
}
```
## `ComposerReference`

```ts
type ComposerReference =
  | { readonly kind: "mention"; readonly id: string; readonly label: string }
  | { readonly kind: "skill"; readonly id: string; readonly label: string };
```
## `composerSchema`

```ts
const composerSchema: RichTextSchema
```
## `composerText`

```ts
composerText(document: RichTextDocument): string
```
## `ComposerTrigger`

```ts
interface ComposerTrigger {
  readonly kind: "mention" | "skill";
  readonly query: string;
  readonly range: { readonly nodeId: string; readonly from: number; readonly to: number };
}
```
## `createComposerDraft`

```ts
createComposerDraft<Model extends string>(options: { readonly id: string; readonly instructionId: string; readonly paragraphId: string; readonly model: Model; }): ComposerDraft<Model>
```
## `findComposerTrigger`

```ts
findComposerTrigger(document: RichTextDocument, selection: RichTextSelection): ComposerTrigger | null
```
## `hasComposerContent`

```ts
hasComposerContent(draft: ComposerDraft): boolean
```
## `insertComposerReference`

```ts
insertComposerReference(editor: RichTextEditor, trigger: ComposerTrigger, reference: ComposerReference, options: { readonly createId: () => string; }): ComposerCommandResult
```
## `insertComposerText`

```ts
insertComposerText(editor: RichTextEditor, text: string): ComposerCommandResult
```
