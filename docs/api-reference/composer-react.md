# @interactive-os/json-document-composer-react API

**탐색 분류:** Hands

Composer React interaction과 reference projection의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-composer-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `ComposerBinding`

```ts
interface ComposerBinding<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate> {
  readonly document: JSONDocument;
  readonly draft: ComposerDraft<Model>;
  readonly editor: RichTextEditor;
  readonly editorElementRef: React.RefObject<HTMLElement | null>;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly attachments: ComposerDraft<Model>["attachments"];
  readonly model: Model;
  readonly hasContent: boolean;
  readonly commandKind: "mention" | "skill" | null;
  readonly commandMenu: RichTextSuggestionBinding<Suggestion>;
  readonly commandOpen: boolean;
  readonly editorCommandProps: Omit<RichTextSuggestionBinding<Suggestion>["referenceProps"], "onKeyDown">;
  submit(): void;
  addWebFiles(files: WebFileCandidateList | ReadonlyArray<WebFileCandidate>): void;
  handleFileInputChange(event: ChangeEvent<HTMLInputElement>): void;
  handlePaste(event: ClipboardEvent<HTMLElement>): void;
  handleKeyDown(event: KeyboardEvent<HTMLElement>): void;
  handleHistoryKeyDown(event: KeyboardEvent<HTMLElement>): void;
  openFilePicker(): void;
  removeAttachment(attachmentId: string): void;
  selectModel(model: Model): void;
  insertText(text: string): void;
  chooseTrigger(trigger: "/" | "@"): void;
  renderReference(node: RichTextNode, props?: Omit<ComposerReferenceAtomProps, "node" | "editor">): ReactNode;
}
```
## `ComposerReferenceAtom`

```ts
ComposerReferenceAtom({ node, editor, ...props }: ComposerReferenceAtomProps): ReactNode
```
## `ComposerReferenceAtomProps`

```ts
interface ComposerReferenceAtomProps extends HTMLAttributes<HTMLSpanElement> {
  readonly node: RichTextNode;
  readonly editor?: RichTextEditor;
}
```
## `useComposer`

```ts
useComposer<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate>(options: UseComposerOptions<Model, Suggestion>): ComposerBinding<Model, Suggestion>
```
## `UseComposerOptions`

```ts
interface UseComposerOptions<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate> {
  readonly id: string;
  readonly config: ComposerHostConfig<Model> & { readonly suggestions: ReadonlyArray<Suggestion> };
  readonly ports: ComposerHostPorts<Model>;
  readonly labels: {
    readonly mentionSuggestions: string;
    readonly skillSuggestions: string;
  };
}
```
