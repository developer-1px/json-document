import { useEffect, useId, useRef, type ReactNode } from "react";
import { Command } from "./controls.js";

export function Popover(props: {
  readonly label: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly triggerPresentation?: "label" | "icon";
  readonly children: ReactNode;
  readonly className?: string;
  readonly panelClassName?: string;
}): ReactNode {
  const id = `json-document-popover-${useId().replaceAll(":", "")}`;
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (props.open) panelRef.current?.focus(); }, [props.open]);
  useEffect(() => {
    if (!props.open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) props.onOpenChange(false);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [props.open, props.onOpenChange]);
  const close = () => {
    props.onOpenChange(false);
    queueMicrotask(() => rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
  };
  const triggerProps = { "aria-label": props.label, "aria-haspopup": "dialog", "aria-controls": id, "aria-expanded": props.open, onClick: () => props.onOpenChange(!props.open) } as const;
  return (
    <span ref={rootRef} className={props.className} data-ui-presentation="popover" onBlur={(event) => {
      if (props.open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) props.onOpenChange(false);
    }}>
      {props.triggerPresentation === "icon" ? <Command {...triggerProps} label={props.label}>{props.trigger}</Command> : <button type="button" {...triggerProps}>{props.trigger}</button>}
      {props.open ? <div ref={panelRef} id={id} role="dialog" aria-label={props.label} tabIndex={-1} className={props.panelClassName} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>{props.children}</div> : null}
    </span>
  );
}

export function Dialog(props: {
  readonly label: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly presentation?: "modal" | "sheet";
}): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!props.open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    (focusable ?? dialog)?.focus();
    return () => queueMicrotask(() => returnFocusRef.current?.focus());
  }, [props.open]);
  if (!props.open) return null;
  return (
    <div role="presentation" data-ui-presentation="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onOpenChange(false); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        tabIndex={-1}
        className={props.className}
        data-ui-presentation={props.presentation ?? "modal"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            props.onOpenChange(false);
            return;
          }
          if (event.key !== "Tab") return;
          const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector))
            .filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
          if (focusable.length === 0) {
            event.preventDefault();
            event.currentTarget.focus();
            return;
          }
          const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
          if (document.activeElement !== edge) return;
          event.preventDefault();
          (event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
        }}
      >{props.children}</div>
    </div>
  );
}

const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
