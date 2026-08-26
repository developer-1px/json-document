import { insertComposerReference, type ComposerHostSuggestion } from "@interactive-os/json-document-composer";
import type { RichTextDocument, RichTextEditor } from "@interactive-os/json-document-rich-text";
import { findRichTextSuggestionTrigger, type RichTextSuggestionCandidate } from "@interactive-os/json-document-rich-text-suggestion";
import { useRichTextSuggestion, type RichTextSuggestionBinding } from "@interactive-os/json-document-rich-text-suggestion-react";
import { useRichTextMentionSuggestions } from "@interactive-os/json-document-rich-text-mention-react";

export interface ComposerCommandMenu<Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate> {
  readonly kind: "mention" | "skill" | null;
  readonly binding: RichTextSuggestionBinding<Suggestion>;
  readonly open: boolean;
  readonly editorProps: Omit<RichTextSuggestionBinding<Suggestion>["referenceProps"], "onKeyDown">;
  readonly handleKeyDown: RichTextSuggestionBinding<Suggestion>["referenceProps"]["onKeyDown"];
}

/** Composes canonical mention and skill suggestion bindings behind one Composer menu contract. */
export function useComposerCommandMenu<Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate>(options: {
  readonly id: string;
  readonly editor: RichTextEditor;
  readonly document: RichTextDocument;
  readonly suggestions: ReadonlyArray<Suggestion>;
  readonly createId: () => string;
  readonly labels: { readonly mentionSuggestions: string; readonly skillSuggestions: string };
}): ComposerCommandMenu<Suggestion> {
  const trigger = findRichTextSuggestionTrigger(options.document, options.editor.snapshot.selection, ["/", "@"]) ;
  const kind = trigger?.trigger === "@" ? "mention" : trigger?.trigger === "/" ? "skill" : null;
  const mentionMenu = useRichTextMentionSuggestions({
    id: `${options.id}-mention-listbox`,
    label: options.labels.mentionSuggestions,
    editor: options.editor,
    trigger,
    suggestions: options.suggestions.filter(isMentionSuggestion),
    createId: options.createId,
  });
  const skillMenu = useRichTextSuggestion({
    id: `${options.id}-skill-listbox`,
    label: options.labels.skillSuggestions,
    trigger: trigger?.trigger === "/" ? trigger : null,
    candidates: options.suggestions.filter(isSkillSuggestion),
    onAction: (suggestion, activeTrigger) => insertComposerReference(options.editor, { kind: "skill", query: activeTrigger.query, range: activeTrigger.range }, suggestion, { createId: options.createId }),
  });
  const binding = (kind === "mention" ? mentionMenu : skillMenu) as RichTextSuggestionBinding<Suggestion>;
  const { onKeyDown: handleKeyDown, ...editorProps } = binding.referenceProps;
  return { kind, binding, open: kind !== null && binding.open, editorProps, handleKeyDown };
}

function isMentionSuggestion<Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate>(suggestion: Suggestion): suggestion is Suggestion & { readonly kind: "mention" } {
  return suggestion.kind === "mention";
}

function isSkillSuggestion<Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate>(suggestion: Suggestion): suggestion is Suggestion & { readonly kind: "skill" } {
  return suggestion.kind === "skill";
}
