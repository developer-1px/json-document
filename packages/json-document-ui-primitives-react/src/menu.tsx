import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type MenuItem = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly content?: ReactNode;
};

export function Menu(props: {
  readonly label: string;
  readonly trigger: ReactNode;
  readonly items: ReadonlyArray<MenuItem>;
  readonly onAction: (id: string) => void;
  readonly restoreFocusOnAction?: boolean;
  readonly classNames?: { readonly root?: string; readonly trigger?: string; readonly popup?: string; readonly item?: string };
}) {
  const id = `json-document-menu-${useId().replaceAll(":", "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const enabled = props.items.filter((item) => !item.disabled);

  useEffect(() => { if (open) popupRef.current?.focus(); }, [open]);

  function close() {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function move(delta: -1 | 1) {
    if (enabled.length > 0) setFocusIndex((current) => (current + delta + enabled.length) % enabled.length);
  }

  return (
    <div className={props.classNames?.root} data-ui-primitive="menu">
      <button ref={triggerRef} type="button" aria-label={props.label} aria-haspopup="menu" aria-controls={id} aria-expanded={open} className={props.classNames?.trigger} style={{ cursor: "pointer" }} onClick={() => setOpen((value) => !value)}>{props.trigger}</button>
      {open ? (
        <div ref={popupRef} id={id} role="menu" aria-label={props.label} tabIndex={-1} className={props.classNames?.popup} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
          else if (event.key === "Escape") { event.preventDefault(); close(); }
          else if ((event.key === "Enter" || event.key === " ") && enabled[focusIndex]) { event.preventDefault(); props.onAction(enabled[focusIndex]!.id); if (props.restoreFocusOnAction === false) setOpen(false); else close(); }
        }}>
          {props.items.map((item) => {
            const index = enabled.findIndex((candidate) => candidate.id === item.id);
            return <button key={item.id} type="button" role="menuitem" disabled={item.disabled} data-focus={index === focusIndex || undefined} className={props.classNames?.item} style={{ cursor: item.disabled ? "not-allowed" : "pointer" }} onPointerMove={() => { if (index >= 0) setFocusIndex(index); }} onClick={() => { props.onAction(item.id); if (props.restoreFocusOnAction === false) setOpen(false); else close(); }}>{item.content ?? item.label}</button>;
          })}
        </div>
      ) : null}
    </div>
  );
}
