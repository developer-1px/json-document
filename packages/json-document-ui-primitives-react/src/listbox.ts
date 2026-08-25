import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEventHandler,
} from "react";
import { createTypeaheadSession } from "@interactive-os/json-document-affordance";

export interface ListboxItem {
  readonly id: string;
  readonly textValue: string;
  readonly disabled?: boolean;
}

export interface UseListboxOptions<Item extends ListboxItem> {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<Item>;
  readonly activeId: string | null;
  readonly selectedId?: string | null;
  readonly wrap?: boolean;
  readonly onActiveChange: (id: string | null) => void;
  readonly onAction: (id: string) => void;
}

export interface ListboxBinding<Item extends ListboxItem> {
  readonly activeId: string | null;
  readonly referenceProps: {
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly "aria-activedescendant"?: string;
    readonly onKeyDown: KeyboardEventHandler;
  };
  readonly listboxProps: HTMLAttributes<HTMLElement>;
  optionProps(item: Item): ButtonHTMLAttributes<HTMLButtonElement>;
}

export function useListbox<Item extends ListboxItem>(
  options: UseListboxOptions<Item>,
): ListboxBinding<Item> {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [typeahead] = useState(() => createTypeaheadSession<string>({
    onMatch: (id) => optionsRef.current.onActiveChange(id),
  }));
  const enabled = options.items.filter((item) => !item.disabled);
  const active = enabled.find((item) => item.id === options.activeId) ?? null;

  const onKeyDown: KeyboardEventHandler = (event) => {
    const current = optionsRef.current;
    const currentEnabled = current.items.filter((item) => !item.disabled);
    if (currentEnabled.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const index = currentEnabled.findIndex((item) => item.id === current.activeId);
      let next = index < 0 ? (delta > 0 ? 0 : currentEnabled.length - 1) : index + delta;
      if (current.wrap) next = (next + currentEnabled.length) % currentEnabled.length;
      else next = Math.max(0, Math.min(currentEnabled.length - 1, next));
      current.onActiveChange(currentEnabled[next]!.id);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      current.onActiveChange(event.key === "Home" ? currentEnabled[0]!.id : currentEnabled.at(-1)!.id);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (active === null) return;
      event.preventDefault();
      current.onAction(active.id);
      return;
    }
    if (typeahead.handle({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      timeStamp: event.timeStamp,
      items: currentEnabled.map((item) => ({ key: item.id, name: item.textValue })),
      fromKey: current.activeId,
    })) event.preventDefault();
  };

  const activeDescendant = active === null ? undefined : optionId(options.id, active.id);
  return {
    activeId: active?.id ?? null,
    referenceProps: {
      "aria-controls": options.id,
      "aria-expanded": options.items.length > 0,
      ...(activeDescendant === undefined ? {} : { "aria-activedescendant": activeDescendant }),
      onKeyDown,
    },
    listboxProps: {
      id: options.id,
      role: "listbox",
      "aria-label": options.label,
      ...(activeDescendant === undefined ? {} : { "aria-activedescendant": activeDescendant }),
      onKeyDown,
    },
    optionProps(item) {
      const disabled = item.disabled === true;
      return {
        id: optionId(options.id, item.id),
        type: "button",
        role: "option",
        "aria-selected": item.id === options.selectedId,
        "aria-disabled": disabled || undefined,
        disabled,
        "data-focus": item.id === active?.id || undefined,
        "data-selected": item.id === options.selectedId || undefined,
        onPointerMove: () => { if (!disabled) optionsRef.current.onActiveChange(item.id); },
        onClick: () => { if (!disabled) optionsRef.current.onAction(item.id); },
      };
    },
  };
}

function optionId(listboxId: string, itemId: string): string {
  return `${listboxId}-option-${encodeURIComponent(itemId)}`;
}
