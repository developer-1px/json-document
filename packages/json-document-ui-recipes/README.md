# @interactive-os/json-document-ui-recipes

UI recipe specification as code: views several products converged on, with
their anatomy, behaviour rules and black-box conformance vectors. The rules
are defined in [UI Recipes v1](../../standards/ui-recipes-v1/profile.md).
It ships no behaviour and no visual tokens; a Host runs the vectors on its
own UI.

```sh
npm i @interactive-os/json-document-ui-recipes
```

```ts
import { recipeSpec } from "@interactive-os/json-document-ui-recipes";

const spec = recipeSpec("preview-popover");
for (const entry of spec?.vectors.cases ?? []) {
  // map entry.steps (open, scroll, press, click-outside; open, scrollTop, focused, placement) onto the Host UI
}
```
