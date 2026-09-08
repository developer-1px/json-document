import { useEffect, useRef, type ChangeEvent, type FocusEvent, type KeyboardEvent, type RefObject } from "react";
import type { CalendarHand } from "./use-calendar-hand.js";

export interface CalendarRenameInputBinding {
  readonly ref: RefObject<HTMLInputElement | null>;
  readonly value: string;
  onFocus(): void;
  onChange(event: ChangeEvent<HTMLInputElement>): void;
  onBlur(event: FocusEvent<HTMLInputElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}

export interface CalendarRenameInputOptions {
  /** Commit when focus leaves the title. Disable inside a larger contextual editor. */
  readonly commitOnBlur?: boolean;
  /** Retries focus realization when an enclosing positioned editor becomes interactive. */
  readonly realizationKey?: string | number | boolean | null;
}

/** Binds Calendar title input events and focus realization to the canonical Rename session. */
export function useCalendarRenameInput(
  hand: CalendarHand,
  options: CalendarRenameInputOptions = {},
): CalendarRenameInputBinding {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hand.renaming) return;
    ref.current?.focus();
    ref.current?.select();
  }, [hand.renaming, hand.selectedEvent?.id, options.realizationKey]);

  return {
    ref,
    value: hand.titleDraft,
    onFocus: hand.beginTitleRename,
    onChange: (event) => hand.setTitleDraft(event.currentTarget.value),
    onBlur: () => {
      if (options.commitOnBlur !== false) hand.commitTitleRename();
    },
    onKeyDown(event) {
      if (!hand.handleTitleRenameKey(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
