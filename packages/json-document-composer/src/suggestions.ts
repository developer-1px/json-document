import type { ComposerHostSuggestion } from "./host-config.js";
import type { ComposerTrigger } from "./model.js";
import { resolveRichTextSuggestions } from "@interactive-os/json-document-rich-text-suggestion";

/** Resolves product-configured suggestions for the active Composer trigger. */
export function resolveComposerSuggestions<Suggestion extends ComposerHostSuggestion>(
  trigger: ComposerTrigger | null,
  suggestions: ReadonlyArray<Suggestion>,
): ReadonlyArray<Suggestion> {
  if (trigger === null) return [];
  return resolveRichTextSuggestions(
    { trigger: trigger.kind === "skill" ? "/" : "@", query: trigger.query, range: trigger.range },
    suggestions.filter((suggestion) => suggestion.kind === trigger.kind),
  );
}
