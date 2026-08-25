import type { RichTextDocument, RichTextNode, RichTextSelection } from "@interactive-os/json-document-rich-text";

export interface RichTextSuggestionRange {
  readonly nodeId: string;
  readonly from: number;
  readonly to: number;
}

export interface RichTextSuggestionTrigger {
  readonly trigger: string;
  readonly query: string;
  readonly range: RichTextSuggestionRange;
}

export interface RichTextSuggestionCandidate {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface RichTextSuggestionState {
  readonly contextKey: string | null;
  readonly dismissedContextKey: string | null;
  readonly activeId: string | null;
}

export interface RichTextSuggestionSnapshot<Candidate extends RichTextSuggestionCandidate> extends RichTextSuggestionState {
  readonly open: boolean;
  readonly activeItem: Candidate | null;
}

export const INITIAL_RICH_TEXT_SUGGESTION_STATE: RichTextSuggestionState = {
  contextKey: null,
  dismissedContextKey: null,
  activeId: null,
};

export function findRichTextSuggestionTrigger(
  document: RichTextDocument,
  selection: RichTextSelection,
  triggers: ReadonlyArray<string>,
): RichTextSuggestionTrigger | null {
  const index = selection.primaryIndex;
  const caret = index === null ? null : selection.ranges[index]?.focus ?? null;
  if (caret === null || caret.kind !== "text" || triggers.length === 0) return null;
  const text = findText(document.content, caret.nodeId);
  if (text === null) return null;
  const choices = [...new Set(triggers.filter((trigger) => trigger.length > 0))]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  if (choices.length === 0) return null;
  const match = text.slice(0, caret.offset).match(new RegExp(`(?:^|\\s)(${choices})([^\\s]*)$`));
  if (!match) return null;
  const trigger = match[1]!;
  const query = match[2] ?? "";
  return { trigger, query, range: { nodeId: caret.nodeId, from: caret.offset - trigger.length - query.length, to: caret.offset } };
}

export function resolveRichTextSuggestions<Candidate extends RichTextSuggestionCandidate>(
  trigger: RichTextSuggestionTrigger | null,
  candidates: ReadonlyArray<Candidate>,
): ReadonlyArray<Candidate> {
  if (trigger === null) return [];
  const query = trigger.query.toLocaleLowerCase();
  return candidates.filter((candidate) => candidate.label.toLocaleLowerCase().includes(query));
}

export function reconcileRichTextSuggestionState<Candidate extends RichTextSuggestionCandidate>(
  state: RichTextSuggestionState,
  trigger: RichTextSuggestionTrigger | null,
  items: ReadonlyArray<Candidate>,
): RichTextSuggestionSnapshot<Candidate> {
  const contextKey = suggestionContextKey(trigger);
  const enabled = items.filter((item) => item.disabled !== true);
  const requestedActiveId = state.contextKey === contextKey ? state.activeId : null;
  const activeItem = enabled.find((item) => item.id === requestedActiveId) ?? enabled[0] ?? null;
  const dismissedContextKey = state.contextKey === contextKey ? state.dismissedContextKey : null;
  return {
    contextKey,
    dismissedContextKey,
    activeId: activeItem?.id ?? null,
    activeItem,
    open: contextKey !== null && contextKey !== dismissedContextKey && items.length > 0,
  };
}

export function activateRichTextSuggestion(
  state: RichTextSuggestionState,
  trigger: RichTextSuggestionTrigger | null,
  activeId: string | null,
): RichTextSuggestionState {
  return { ...state, contextKey: suggestionContextKey(trigger), activeId };
}

export function dismissRichTextSuggestions(
  state: RichTextSuggestionState,
  trigger: RichTextSuggestionTrigger | null,
): RichTextSuggestionState {
  const contextKey = suggestionContextKey(trigger);
  return { ...state, contextKey, dismissedContextKey: contextKey };
}

export function reopenRichTextSuggestions(
  state: RichTextSuggestionState,
  trigger: RichTextSuggestionTrigger | null,
): RichTextSuggestionState {
  return { ...state, contextKey: suggestionContextKey(trigger), dismissedContextKey: null };
}

function suggestionContextKey(trigger: RichTextSuggestionTrigger | null): string | null {
  return trigger === null ? null : `${trigger.range.nodeId}:${trigger.range.from}:${trigger.trigger}`;
}

function findText(nodes: ReadonlyArray<RichTextNode>, id: string): string | null {
  for (const node of nodes) {
    if (node.id === id && node.type === "text" && "text" in node) return node.text;
    if ("content" in node && Array.isArray(node.content)) {
      const found = findText(node.content as ReadonlyArray<RichTextNode>, id);
      if (found !== null) return found;
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
