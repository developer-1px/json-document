import { floatingSurface } from "./floating-surface.js";
import { useState, type ReactNode } from "react";
import { createLineFocusSession } from "@interactive-os/json-document-affordance";
import { Command } from "./controls.js";
import {usePopup} from "./use-popup.js";

export type MenuItem = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly content?: ReactNode;
};

export interface MenuProps {
  readonly label: string;
  readonly trigger: ReactNode;
  readonly triggerPresentation?: "label" | "icon";
  readonly items: ReadonlyArray<MenuItem>;
  readonly onAction: (id: string) => void;
  readonly restoreFocusOnAction?: boolean;
  readonly classNames?: { readonly root?: string; readonly trigger?: string; readonly popup?: string; readonly item?: string };
}

export function Menu(props: MenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const popup = usePopup({open, onOpenChange: setOpen});
  const {id, triggerRef, panelRef: popupRef, close} = popup;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusSession] = useState(() => createLineFocusSession<string>({ wrap: true, onFocus: setFocusId }));
  const enabled = props.items.filter((item) => !item.disabled);

  function move(delta: -1 | 1) {
    focusSession.handle({ key: delta === 1 ? "ArrowDown" : "ArrowUp", shiftKey: false }, enabled.map((item) => item.id));
  }

  const focusedItem = enabled.find((item) => item.id === focusId) ?? enabled[0];

  return (
    <div ref={node => {popup.rootRef.current = node;}} onBlur={popup.onBlur} className={props.classNames?.root} data-ui-primitive="menu">
      <Command controlRef={triggerRef} label={props.triggerPresentation === "icon" ? props.label : undefined} aria-label={props.label} aria-haspopup="menu" aria-controls={id} aria-expanded={open} className={props.classNames?.trigger} style={{ cursor: "pointer" }} onClick={() => setOpen((value) => !value)}>{props.trigger}</Command>
      {open ? (
        <div ref={popupRef} id={id} role="menu" aria-label={props.label} tabIndex={-1} className={[floatingSurface.panel, props.classNames?.popup].filter(Boolean).join(" ")} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
          else if ((event.key === "Enter" || event.key === " ") && focusedItem) { event.preventDefault(); props.onAction(focusedItem.id); close(props.restoreFocusOnAction !== false); }
          else popup.onKeyDown(event);
        }}>
          {props.items.map((item) => {
            return <Command key={item.id} role="menuitem" disabled={item.disabled} data-focus={item.id === focusedItem?.id || undefined} className={props.classNames?.item} style={{ cursor: item.disabled ? "not-allowed" : "pointer" }} onPointerMove={() => { if (!item.disabled) focusSession.setFocus(item.id); }} onClick={() => { props.onAction(item.id); close(props.restoreFocusOnAction !== false); }}>{item.content ?? item.label}</Command>;
          })}
        </div>
      ) : null}
    </div>
  );
}
