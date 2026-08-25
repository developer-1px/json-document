# @interactive-os/json-document-composer-react API

**Owner:** Hands

Composer React interaction과 reference projection의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-composer-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

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
