import {
  insertComposerReference,
  resolveComposerSuggestions,
  type ComposerHostSuggestion,
  type ComposerTrigger,
} from "@interactive-os/json-document-composer";
import type { RichTextEditor } from "@interactive-os/json-document-rich-text";
import { useListbox } from "@interactive-os/json-document-ui-primitives-react";
import { useState, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEventHandler } from "react";

export interface UseComposerCommandMenuOptions<Suggestion extends ComposerHostSuggestion> {
  readonly id: string;
  readonly label: string;
  readonly editor: RichTextEditor;
  readonly trigger: ComposerTrigger | null;
  readonly suggestions: ReadonlyArray<Suggestion>;
  readonly createId: () => string;
}

export interface ComposerCommandMenuBinding<Suggestion extends ComposerHostSuggestion> {
  readonly items: ReadonlyArray<Suggestion>;
  readonly activeItem: Suggestion | null;
  readonly referenceProps: {
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly "aria-activedescendant"?: string;
    readonly onKeyDown: KeyboardEventHandler;
  };
  readonly listboxProps: HTMLAttributes<HTMLElement>;
  optionProps(item: Suggestion): ButtonHTMLAttributes<HTMLButtonElement>;
}

/** Owns trigger filtering, active-item fallback, listbox state, and reference insertion. */
export function useComposerCommandMenu<Suggestion extends ComposerHostSuggestion>(
  options: UseComposerCommandMenuOptions<Suggestion>,
): ComposerCommandMenuBinding<Suggestion> {
  const [requestedActiveId, setRequestedActiveId] = useState<string | null>(null);
  const items = resolveComposerSuggestions(options.trigger, options.suggestions);
  const activeItem = items.find((item) => item.id === requestedActiveId) ?? items[0] ?? null;
  const listboxItems = items.map((item) => ({ id: item.id, textValue: item.label }));
  const listbox = useListbox({
    id: options.id,
    label: options.label,
    items: listboxItems,
    activeId: activeItem?.id ?? null,
    wrap: true,
    onActiveChange: setRequestedActiveId,
    onAction: (id) => {
      const suggestion = items.find((item) => item.id === id);
      if (options.trigger !== null && suggestion !== undefined) {
        insertComposerReference(options.editor, options.trigger, suggestion, { createId: options.createId });
      }
    },
  });
  return {
    ...listbox,
    items,
    activeItem,
    optionProps: (item) => listbox.optionProps({ id: item.id, textValue: item.label }),
  };
}
