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

/** Binds Calendar title input events and focus realization to the canonical Rename session. */
export function useCalendarRenameInput(hand: CalendarHand): CalendarRenameInputBinding {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hand.renaming) return;
    ref.current?.focus();
    ref.current?.select();
  }, [hand.renaming, hand.selectedEvent?.id]);

  return {
    ref,
    value: hand.titleDraft,
    onFocus: hand.beginTitleRename,
    onChange: (event) => hand.setTitleDraft(event.currentTarget.value),
    onBlur: () => hand.commitTitleRename(),
    onKeyDown(event) {
      if (!hand.handleTitleRenameKey(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
