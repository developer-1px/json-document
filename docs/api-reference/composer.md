# @interactive-os/json-document-composer API

**Owner:** Hands

Composer draft와 reference/trigger command 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-composer/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `addComposerAttachments`

```ts
addComposerAttachments(editor: RichTextEditor, draft: ComposerDraft, attachments: ReadonlyArray<ComposerAttachment>): ComposerDraftCommandResult
```
## `COMPOSER_HOST_PROFILE_V1`

```ts
const COMPOSER_HOST_PROFILE_V1: "urn:interactive-os:json-document:composer-host:1"
```
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
## `ComposerAttachmentCandidate`

```ts
interface ComposerAttachmentCandidate extends Record<string, JSONValue> {
  readonly name: string;
  readonly size: number;
  readonly mediaType: string | null;
}
```
## `ComposerAttachmentPolicy`

```ts
interface ComposerAttachmentPolicy extends Record<string, JSONValue> {
  readonly acceptedMediaTypes: ReadonlyArray<string>;
  readonly maxFiles: number | null;
  readonly maxBytesPerFile: number | null;
}
```
## `ComposerAttachmentResult`

```ts
type ComposerAttachmentResult =
  | { readonly ok: true; readonly attachments: ReadonlyArray<ComposerAttachment> }
  | { readonly ok: false; readonly code: "composer.attachments.invalid" | "composer.attachments.limit" | "composer.attachments.media-type" | "composer.attachments.size"; readonly candidate: ComposerAttachmentCandidate };
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
## `ComposerDraftCommandResult`

```ts
type ComposerDraftCommandResult = ReturnType<RichTextEditor["apply"]>;
```
## `ComposerHostConfig`

```ts
interface ComposerHostConfig<Model extends string = string> extends Record<string, JSONValue> {
  readonly profile: typeof COMPOSER_HOST_PROFILE_V1;
  readonly models: ReadonlyArray<ComposerHostModel<Model>>;
  readonly suggestions: ReadonlyArray<ComposerHostSuggestion>;
  readonly attachments: ComposerAttachmentPolicy;
  readonly interaction: ComposerInteractionPolicy;
}
```
## `composerHostConfigSchema`

```ts
const composerHostConfigSchema: { readonly $schema: "https://json-schema.org/draft/2020-12/schema"; readonly $id: "urn:interactive-os:json-document:composer-host:1"; readonly type: "object"; readonly additionalProperties: false; readonly required: readonly [...]; readonly properties: { ...; }; }
```
## `ComposerHostModel`

```ts
interface ComposerHostModel<Model extends string = string> extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
  readonly value: Model;
}
```
## `ComposerHostPorts`

```ts
interface ComposerHostPorts<Model extends string = string> {
  readonly createId: () => string;
  readonly submit: (draft: import("./model.js").ComposerDraft<Model>) => Promise<void>;
}
```
## `ComposerHostSuggestion`

```ts
type ComposerHostSuggestion = ComposerReference & Readonly<Record<string, JSONValue>>;
```
## `ComposerInteraction`

```ts
type ComposerInteraction = "dismiss" | "history.redo" | "history.undo" | "newline" | "submit";
```
## `composerInteractionFromKeyStroke`

```ts
composerInteractionFromKeyStroke(stroke: ComposerKeyStroke, policy: ComposerInteractionPolicy): ComposerInteraction | null
```
## `ComposerInteractionPolicy`

```ts
interface ComposerInteractionPolicy extends Record<string, JSONValue> {
  readonly submit: "enter" | "mod-enter";
  readonly newline: "shift-enter" | "enter";
}
```
## `ComposerKeyStroke`

```ts
interface ComposerKeyStroke {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly commandKey?: boolean;
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
## `createComposerAttachments`

```ts
createComposerAttachments(candidates: ReadonlyArray<ComposerAttachmentCandidate>, options: { readonly createId: () => string; readonly policy: ComposerAttachmentPolicy; readonly currentCount?: number; }): ComposerAttachmentResult
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
## `removeComposerAttachment`

```ts
removeComposerAttachment(editor: RichTextEditor, draft: ComposerDraft, attachmentId: string): ComposerDraftCommandResult | null
```
## `resolveComposerSuggestions`

```ts
resolveComposerSuggestions<Suggestion extends ComposerHostSuggestion>(trigger: ComposerTrigger | null, suggestions: ReadonlyArray<Suggestion>): ReadonlyArray<Suggestion>
```
## `selectComposerModel`

```ts
selectComposerModel<Model extends string>(editor: RichTextEditor, model: Model): ComposerDraftCommandResult
```
