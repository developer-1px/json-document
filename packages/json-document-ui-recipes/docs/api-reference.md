# @interactive-os/json-document-ui-recipes API

**탐색 분류:** UI Primitives

UI 레시피 규격: 수렴 근거·해부·행동 규칙과 conformance vector의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-recipes/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `previewPopover`

```ts
const previewPopover: RecipeSpec
```
## `Recipe`

```ts
interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly evidence: readonly RecipeEvidence[];
  readonly standards: readonly RecipeStandard[];
  readonly anatomy: { readonly required: readonly string[]; readonly optional: readonly string[] };
  readonly rules: readonly RecipeRule[];
  readonly variants: readonly RecipeVariant[];
}
```
## `RecipeAction`

```ts
type RecipeAction =
  | { readonly do: "open"; readonly content: string; readonly modifier?: "Shift" | "Meta" | "Control" | "Alt" }
  | { readonly do: "scroll"; readonly by: number }
  | { readonly do: "press"; readonly key: string }
  | { readonly do: "click-outside" };
```
## `RecipeCase`

```ts
interface RecipeCase {
  readonly id: string;
  /** The rule IDs this case exercises. */
  readonly requirements: readonly string[];
  /** Variants the case does not apply to. */
  readonly variants?: Readonly<Record<string, "skip">>;
  readonly steps: readonly RecipeStep[];
}
```
## `RecipeEvidence`

```ts
interface RecipeEvidence {
  readonly product: string;
  readonly url: string;
}
```
## `RecipeObservation`

```ts
type RecipeObservation =
  | { readonly expect: "open"; readonly count: number; readonly content?: string }
  | { readonly expect: "scrollTop"; readonly value: number }
  | { readonly expect: "focused"; readonly value: "panel" | "anchor" }
  | { readonly expect: "placement"; readonly value: "beside-anchor" | "within-viewport" };
```
## `RecipeRule`

```ts
interface RecipeRule {
  readonly id: string;
  readonly name: string;
  readonly statement: string;
  /** `host` while Hosts implement the rule; the json-document module once one owns it. */
  readonly owner: string;
}
```
## `recipeSpec`

```ts
recipeSpec(id: string): RecipeSpec | undefined
```
## `RecipeSpec`

```ts
interface RecipeSpec {
  readonly recipe: Recipe;
  readonly vectors: RecipeVectors;
}
```
## `recipeSpecs`

```ts
const recipeSpecs: readonly RecipeSpec[]
```
## `RecipeStandard`

```ts
interface RecipeStandard {
  readonly name: string;
  readonly url: string;
}
```
## `RecipeStep`

```ts
type RecipeStep = RecipeAction | RecipeObservation;
```
## `RecipeVariant`

```ts
interface RecipeVariant {
  readonly id: string;
  readonly status: "candidate" | "adopted";
  readonly statement: string;
}
```
## `RecipeVectors`

```ts
interface RecipeVectors {
  readonly recipe: string;
  /** Contents the Host prepares; `scrollable` is the least scroll room its body must have. */
  readonly fixture: { readonly contents: readonly { readonly id: string; readonly scrollable?: number }[] };
  readonly cases: readonly RecipeCase[];
}
```
