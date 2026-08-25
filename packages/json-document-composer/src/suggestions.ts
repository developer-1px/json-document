import type { ComposerHostSuggestion } from "./host-config.js";
import type { ComposerTrigger } from "./model.js";

/** Resolves product-configured suggestions for the active Composer trigger. */
export function resolveComposerSuggestions<Suggestion extends ComposerHostSuggestion>(
  trigger: ComposerTrigger | null,
  suggestions: ReadonlyArray<Suggestion>,
): ReadonlyArray<Suggestion> {
  if (trigger === null) return [];
  return suggestions.filter((suggestion) =>
    suggestion.kind === trigger.kind
    && suggestion.label.toLocaleLowerCase().includes(trigger.query.toLocaleLowerCase()),
  );
}
