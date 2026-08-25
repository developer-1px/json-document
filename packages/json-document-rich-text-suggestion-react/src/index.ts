import {
  INITIAL_RICH_TEXT_SUGGESTION_STATE,
  activateRichTextSuggestion,
  dismissRichTextSuggestions,
  reconcileRichTextSuggestionState,
  reopenRichTextSuggestions,
  resolveRichTextSuggestions,
  type RichTextSuggestionCandidate,
  type RichTextSuggestionTrigger,
} from "@interactive-os/json-document-rich-text-suggestion";
import { useListbox } from "@interactive-os/json-document-ui-primitives-react";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEventHandler,
  type HTMLAttributes,
  type KeyboardEventHandler,
} from "react";

export interface UseRichTextSuggestionOptions<Candidate extends RichTextSuggestionCandidate> {
  readonly id: string;
  readonly label: string;
  readonly trigger: RichTextSuggestionTrigger | null;
  readonly candidates: ReadonlyArray<Candidate>;
  readonly onAction: (candidate: Candidate, trigger: RichTextSuggestionTrigger) => void;
}

export interface RichTextSuggestionBinding<Candidate extends RichTextSuggestionCandidate> {
  readonly items: ReadonlyArray<Candidate>;
  readonly activeItem: Candidate | null;
  readonly open: boolean;
  readonly referenceProps: {
    readonly role: "combobox";
    readonly "aria-autocomplete": "list";
    readonly "aria-haspopup": "listbox";
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly "aria-activedescendant"?: string;
    readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
    readonly onFocus: FocusEventHandler<HTMLElement>;
    readonly onBlur: FocusEventHandler<HTMLElement>;
  };
  readonly listboxProps: HTMLAttributes<HTMLElement>;
  optionProps(item: Candidate): ButtonHTMLAttributes<HTMLButtonElement>;
  dismiss(): void;
  reopen(): void;
}

export function useRichTextSuggestion<Candidate extends RichTextSuggestionCandidate>(
  options: UseRichTextSuggestionOptions<Candidate>,
): RichTextSuggestionBinding<Candidate> {
  const [state, setState] = useState(INITIAL_RICH_TEXT_SUGGESTION_STATE);
  const optionElements = useRef(new Map<string, HTMLButtonElement>());
  const items = resolveRichTextSuggestions(options.trigger, options.candidates);
  const snapshot = reconcileRichTextSuggestionState(state, options.trigger, items);
  const listbox = useListbox({
    id: options.id,
    label: options.label,
    items: items.map((item) => ({ id: item.id, textValue: item.label, ...(item.disabled === undefined ? {} : { disabled: item.disabled }) })),
    activeId: snapshot.activeId,
    selectedId: snapshot.activeId,
    wrap: true,
    onActiveChange: (activeId) => setState((current) => activateRichTextSuggestion(current, options.trigger, activeId)),
    onAction: (id) => {
      const item = items.find((candidate) => candidate.id === id);
      if (item !== undefined && item.disabled !== true && options.trigger !== null) options.onAction(item, options.trigger);
    },
  });

  useEffect(() => {
    if (!snapshot.open || snapshot.activeId === null) return;
    optionElements.current.get(snapshot.activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [snapshot.activeId, snapshot.open]);

  function dismiss() {
    setState((current) => dismissRichTextSuggestions(current, options.trigger));
  }

  function reopen() {
    setState((current) => reopenRichTextSuggestions(current, options.trigger));
  }

  const onKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && snapshot.open) {
      event.preventDefault();
      dismiss();
      return;
    }
    if (!snapshot.open || !["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key)) return;
    listbox.referenceProps.onKeyDown(event);
  };
  const onFocus: FocusEventHandler<HTMLElement> = () => reopen();
  const onBlur: FocusEventHandler<HTMLElement> = () => dismiss();
  const activeDescendant = snapshot.open ? listbox.referenceProps["aria-activedescendant"] : undefined;

  return {
    items,
    activeItem: snapshot.activeItem,
    open: snapshot.open,
    referenceProps: {
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-haspopup": "listbox",
      "aria-controls": options.id,
      "aria-expanded": snapshot.open,
      ...(activeDescendant === undefined ? {} : { "aria-activedescendant": activeDescendant }),
      onKeyDown,
      onFocus,
      onBlur,
    },
    listboxProps: listbox.listboxProps,
    optionProps(item) {
      const props = listbox.optionProps({ id: item.id, textValue: item.label, ...(item.disabled === undefined ? {} : { disabled: item.disabled }) });
      return {
        ...props,
        ref: (element: HTMLButtonElement | null) => {
          if (element === null) optionElements.current.delete(item.id);
          else optionElements.current.set(item.id, element);
        },
        onMouseDown: (event) => event.preventDefault(),
      };
    },
    dismiss,
    reopen,
  };
}
