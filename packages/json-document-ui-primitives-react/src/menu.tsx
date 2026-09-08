import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createLineFocusSession } from "@interactive-os/json-document-affordance";
import { Command } from "./controls.js";

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
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusSession] = useState(() => createLineFocusSession<string>({ wrap: true, onFocus: setFocusId }));
  const enabled = props.items.filter((item) => !item.disabled);

  useEffect(() => { if (open) popupRef.current?.focus(); }, [open]);

  function close() {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function move(delta: -1 | 1) {
    focusSession.handle({ key: delta === 1 ? "ArrowDown" : "ArrowUp", shiftKey: false }, enabled.map((item) => item.id));
  }

  const focusedItem = enabled.find((item) => item.id === focusId) ?? enabled[0];

  return (
    <div className={props.classNames?.root} data-ui-primitive="menu">
      <button ref={triggerRef} type="button" aria-label={props.label} aria-haspopup="menu" aria-controls={id} aria-expanded={open} className={props.classNames?.trigger} style={{ cursor: "pointer" }} onClick={() => setOpen((value) => !value)}>{props.trigger}</button>
      {open ? (
        <div ref={popupRef} id={id} role="menu" aria-label={props.label} tabIndex={-1} className={props.classNames?.popup} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
          else if (event.key === "Escape") { event.preventDefault(); close(); }
          else if ((event.key === "Enter" || event.key === " ") && focusedItem) { event.preventDefault(); props.onAction(focusedItem.id); if (props.restoreFocusOnAction === false) setOpen(false); else close(); }
        }}>
          {props.items.map((item) => {
            return <Command key={item.id} role="menuitem" disabled={item.disabled} data-focus={item.id === focusedItem?.id || undefined} className={props.classNames?.item} style={{ cursor: item.disabled ? "not-allowed" : "pointer" }} onPointerMove={() => { if (!item.disabled) focusSession.setFocus(item.id); }} onClick={() => { props.onAction(item.id); if (props.restoreFocusOnAction === false) setOpen(false); else close(); }}>{item.content ?? item.label}</Command>;
          })}
        </div>
      ) : null}
    </div>
  );
}
