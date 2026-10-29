import {useEffect, useId, useRef, type FocusEvent, type KeyboardEvent, type RefObject} from "react";

/** Shared popup lifecycle. Menu, listbox and dialog semantics belong to their controls. */
export function usePopup({open, onOpenChange, id: controlledId, dismissBoundary, autoFocus, dismissOnOutsideInteraction}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly id?: string | undefined;
  readonly dismissBoundary?: RefObject<HTMLElement | null> | undefined;
  /** false keeps focus on the active surface while the popup opens. */
  readonly autoFocus?: boolean | undefined;
  readonly dismissOnOutsideInteraction?: boolean | undefined;
}) {
  const generatedId = useId();
  const id = controlledId ?? `json-document-popup-${generatedId.replaceAll(":", "")}`;
  const rootRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissible = dismissOnOutsideInteraction !== false;
  const current = useRef({onOpenChange, dismissBoundary, dismissible});
  current.current = {onOpenChange, dismissBoundary, dismissible};
  const restoreFocus = useRef(true);
  const visible = useRef(false);
  const close = (restore = true) => {
    restoreFocus.current = restore;
    current.current.onOpenChange(false);
  };
  useEffect(() => {
    if (!open) return;
    visible.current = true;
    restoreFocus.current = true;
    const panel = panelRef.current;
    if (autoFocus !== false) panel?.focus({preventScroll: true});
    const outside = (event: PointerEvent) => {
      if (!current.current.dismissible) return;
      const boundary = current.current.dismissBoundary;
      if (event.target instanceof Node && (!boundary || boundary.current?.contains(event.target)) && !rootRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      visible.current = false;
      document.removeEventListener("pointerdown", outside, true);
      if (restoreFocus.current && (document.activeElement === document.body || panel?.contains(document.activeElement))) queueMicrotask(() => {if (!visible.current) triggerRef.current?.focus({preventScroll: true});});
    };
  }, [open]);
  return {
    id, rootRef, triggerRef, panelRef, close,
    onBlur(event: FocusEvent<HTMLElement>) {
      const boundary = current.current.dismissBoundary;
      if (open && current.current.dismissible && event.relatedTarget instanceof Node && (!boundary || boundary.current?.contains(event.relatedTarget)) && !event.currentTarget.contains(event.relatedTarget)) close(false);
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.key === "Escape" && !event.defaultPrevented) {event.preventDefault(); event.stopPropagation(); close();}
    },
  };
}
