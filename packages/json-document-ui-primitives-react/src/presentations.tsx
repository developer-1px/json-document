import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { floatingSurface } from "./floating-surface.js";
import { Command } from "./controls.js";
import { createPortal } from "react-dom";
import {usePopup} from "./use-popup.js";

export function Popover(props: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly triggerPresentation?: "label" | "icon";
  readonly children: ReactNode;
  readonly className?: string;
  readonly panelClassName?: string;
  /** Only outside interactions within this surface dismiss; omitted means the document. */
  readonly dismissBoundary?: RefObject<HTMLElement | null>;
}): ReactNode {
  const popup = usePopup(props);
  const {id, panelRef} = popup;
  const triggerProps = { disabled: props.disabled, "aria-label": props.label, "aria-haspopup": "dialog", "aria-controls": id, "aria-expanded": props.open, onClick: () => props.onOpenChange(!props.open) } as const;
  return (
    <span ref={node => {popup.rootRef.current = node;}} className={props.className} data-ui-presentation="popover" onBlur={popup.onBlur}>
      {props.triggerPresentation === "icon" ? <Command {...triggerProps} controlRef={popup.triggerRef} label={props.label}>{props.trigger}</Command> : <Command {...triggerProps} controlRef={popup.triggerRef}>{props.trigger}</Command>}
      {props.open ? <div ref={panelRef} id={id} role="dialog" aria-label={props.label} tabIndex={-1} className={[floatingSurface.panel, props.panelClassName].filter(Boolean).join(" ")} onKeyDown={popup.onKeyDown}>{props.children}</div> : null}
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
  readonly dismissBoundary?: RefObject<HTMLElement | null>;
  /** Render against the viewport with this translation, independent of transformed ancestors. */
  readonly viewportOffset?: {readonly x: number; readonly y: number};
  readonly inert?: boolean;
}): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!props.open || props.inert || !props.dismissBoundary) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && props.dismissBoundary?.current?.contains(event.target) && !dialogRef.current?.contains(event.target)) props.onOpenChange(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [props.open, props.inert, props.dismissBoundary, props.onOpenChange]);
  useEffect(() => {
    if (!props.open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    (focusable ?? dialog)?.focus();
    return () => queueMicrotask(() => returnFocusRef.current?.focus());
  }, [props.open]);
  if (!props.open) return null;
  const overlay = (
    <div role="presentation" inert={props.inert} data-ui-presentation="dialog-backdrop" style={props.dismissBoundary ? {pointerEvents: "none"} : undefined} onMouseDown={(event) => { if (event.target === event.currentTarget) props.onOpenChange(false); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        tabIndex={-1}
        className={[floatingSurface.panel, props.className].filter(Boolean).join(" ")}
        data-ui-presentation={props.presentation ?? "modal"}
        style={{...(props.dismissBoundary ? {pointerEvents: "auto" as const} : {}), ...(props.viewportOffset && (props.viewportOffset.x || props.viewportOffset.y) ? {transform: `translate(${props.viewportOffset.x}px, ${props.viewportOffset.y}px)`} : {})}}
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
  return props.viewportOffset && typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay;
}

const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
