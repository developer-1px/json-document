import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEventHandler,
} from "react";
import { createTypeaheadSession } from "@interactive-os/json-document-affordance";

export interface ListboxItem<Id extends string = string> {
  readonly id: Id;
  readonly textValue: string;
  readonly disabled?: boolean;
}

/** What moved the active option: a key (arrows, Home/End), typing a name, or the pointer resting on an option. A Host
 *  that acts on the active option (opens it beside the list) can follow the keyboard and ignore a passing pointer. */
export type ListboxActiveChangeReason = "keyboard" | "typeahead" | "pointer";
export interface ListboxActiveChange {
  readonly reason: ListboxActiveChangeReason;
}

export interface UseListboxOptions<Id extends string = string, Item extends ListboxItem<Id> = ListboxItem<Id>> {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<Item>;
  readonly activeId: Id | null;
  readonly selectedId?: Id | null;
  readonly wrap?: boolean;
  /** `vertical` (default): ↑↓ walk the options in order. `grid`: options laid out in rows (tiles that wrap); ←→ walk
   *  them in order and ↑↓ move to the option visually above or below, as the layout places it. */
  readonly orientation?: "vertical" | "grid";
  readonly onActiveChange: (id: Id | null, change: ListboxActiveChange) => void;
  readonly onAction: (id: Id) => void;
}

export interface ListboxBinding<Id extends string = string, Item extends ListboxItem<Id> = ListboxItem<Id>> {
  readonly activeId: Id | null;
  readonly referenceProps: {
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly "aria-activedescendant"?: string;
    readonly onKeyDown: KeyboardEventHandler;
  };
  readonly listboxProps: HTMLAttributes<HTMLElement>;
  optionProps(item: Item): ButtonHTMLAttributes<HTMLButtonElement>;
}

export function useListbox<Id extends string, Item extends ListboxItem<Id>>(
  options: UseListboxOptions<Id, Item>,
): ListboxBinding<Id, Item> {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // An option the keyboard moved to is brought into view; one the pointer rests on is already in view.
  const scrollTo = useRef<Id | null>(null);
  const activate = (id: Id, reason: ListboxActiveChangeReason) => {
    if (reason !== "pointer") scrollTo.current = id;
    optionsRef.current.onActiveChange(id, { reason });
  };
  const [typeahead] = useState(() => createTypeaheadSession<Id>({
    onMatch: (id) => activate(id, "typeahead"),
  }));
  const enabled = options.items.filter((item) => !item.disabled);
  const active = enabled.find((item) => item.id === options.activeId) ?? null;
  useEffect(() => {
    if (active === null || scrollTo.current !== active.id) return;
    scrollTo.current = null;
    globalThis.document?.getElementById(optionId(options.id, active.id))?.scrollIntoView?.({ block: "nearest" });
  }, [active?.id, options.id]);

  const onKeyDown: KeyboardEventHandler = (event) => {
    const current = optionsRef.current;
    const currentEnabled = current.items.filter((item) => !item.disabled);
    if (currentEnabled.length === 0) return;
    const grid = current.orientation === "grid";
    const index = currentEnabled.findIndex((item) => item.id === current.activeId);
    const step = (delta: 1 | -1) => {
      let next = index < 0 ? (delta > 0 ? 0 : currentEnabled.length - 1) : index + delta;
      if (current.wrap) next = (next + currentEnabled.length) % currentEnabled.length;
      else next = Math.max(0, Math.min(currentEnabled.length - 1, next));
      return currentEnabled[next]!.id;
    };
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || grid && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      const vertical = event.key === "ArrowDown" || event.key === "ArrowUp";
      activate(grid && vertical && index >= 0
        ? gridNeighbor(current.id, currentEnabled.map((item) => item.id), current.activeId!, delta) ?? currentEnabled[index]!.id
        : step(delta), "keyboard");
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      activate(event.key === "Home" ? currentEnabled[0]!.id : currentEnabled.at(-1)!.id, "keyboard");
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
        onPointerMove: () => { if (!disabled && item.id !== optionsRef.current.activeId) activate(item.id, "pointer"); },
        onClick: () => { if (!disabled) optionsRef.current.onAction(item.id); },
      };
    },
  };
}

/** In a grid, the option visually in the next row above or below the active one: the nearest row in that direction,
 *  and in it the option whose center is closest horizontally. Null at the first or last row, or without layout. */
function gridNeighbor<Id extends string>(listboxId: string, ids: ReadonlyArray<Id>, activeId: Id, delta: 1 | -1): Id | null {
  const rect = (id: Id) => globalThis.document?.getElementById(optionId(listboxId, id))?.getBoundingClientRect();
  const from = rect(activeId);
  if (from === undefined) return null;
  const center = (box: DOMRect) => box.left + box.width / 2;
  const candidates = ids.flatMap((id) => {
    const box = rect(id);
    return box !== undefined && (delta > 0 ? box.top >= from.bottom - 1 : box.bottom <= from.top + 1) ? [{ id, box }] : [];
  });
  if (candidates.length === 0) return null;
  const row = delta > 0 ? Math.min(...candidates.map(({ box }) => box.top)) : Math.max(...candidates.map(({ box }) => box.top));
  const inRow = candidates.filter(({ box }) => Math.abs(box.top - row) < 1);
  return inRow.reduce((best, item) => Math.abs(center(item.box) - center(from)) < Math.abs(center(best.box) - center(from)) ? item : best).id;
}

function optionId(listboxId: string, itemId: string): string {
  return `${listboxId}-option-${encodeURIComponent(itemId)}`;
}
