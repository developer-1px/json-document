/** A product that independently converged on the recipe's view, with its source. */
export interface RecipeEvidence {
  readonly product: string;
  readonly url: string;
}

/** An external standard the recipe follows. */
export interface RecipeStandard {
  readonly name: string;
  readonly url: string;
}

/** A behaviour rule: a profile requirement written as the user's action and its observable result. */
export interface RecipeRule {
  readonly id: string;
  readonly name: string;
  readonly statement: string;
  /** `host` while Hosts implement the rule; the json-document module once one owns it. */
  readonly owner: string;
}

export interface RecipeVariant {
  readonly id: string;
  readonly status: "candidate" | "adopted";
  readonly statement: string;
}

/** A UI view several products converged on: its name, evidence, anatomy and behaviour. Visual tokens are the Host's. */
export interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly evidence: readonly RecipeEvidence[];
  readonly standards: readonly RecipeStandard[];
  readonly anatomy: { readonly required: readonly string[]; readonly optional: readonly string[] };
  readonly rules: readonly RecipeRule[];
  readonly variants: readonly RecipeVariant[];
}

/** What the user does. A Host harness maps each onto its own UI. */
export type RecipeAction =
  | { readonly do: "open"; readonly content: string; readonly modifier?: "Shift" | "Meta" | "Control" | "Alt" }
  | { readonly do: "scroll"; readonly by: number }
  | { readonly do: "press"; readonly key: string }
  | { readonly do: "click-outside" };

/** What the user observes afterwards. */
export type RecipeObservation =
  | { readonly expect: "open"; readonly count: number; readonly content?: string }
  | { readonly expect: "scrollTop"; readonly value: number }
  | { readonly expect: "focused"; readonly value: "panel" | "anchor" }
  | { readonly expect: "placement"; readonly value: "beside-anchor" | "within-viewport" };

export type RecipeStep = RecipeAction | RecipeObservation;

export interface RecipeCase {
  readonly id: string;
  /** The rule IDs this case exercises. */
  readonly requirements: readonly string[];
  /** Variants the case does not apply to. */
  readonly variants?: Readonly<Record<string, "skip">>;
  readonly steps: readonly RecipeStep[];
}

/** Black-box conformance vectors for one recipe. */
export interface RecipeVectors {
  readonly recipe: string;
  /** Contents the Host prepares; `scrollable` is the least scroll room its body must have. */
  readonly fixture: { readonly contents: readonly { readonly id: string; readonly scrollable?: number }[] };
  readonly cases: readonly RecipeCase[];
}

/** A recipe with its vectors. */
export interface RecipeSpec {
  readonly recipe: Recipe;
  readonly vectors: RecipeVectors;
}
