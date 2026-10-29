import {useEffect, useRef, type ReactNode} from "react";
import {Pencil} from "lucide-react";
import {Command} from "./controls.js";
import {contentPresentation} from "./content-presentation.js";
/** A controlled presentation boundary. It owns no field schema, draft, validation or save command. */
export function FieldPresentation({label, mode, read, edit, onEditRequest, heading, disabled}: {readonly label: string; readonly mode: "read" | "edit"; readonly read: ReactNode; readonly edit: ReactNode; readonly onEditRequest?: () => void; readonly heading?: ReactNode; readonly disabled?: boolean}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previous = useRef(mode);
  useEffect(() => {
    if (mode === "edit") root.current?.querySelector<HTMLElement>("input, textarea, button")?.focus({preventScroll:true});
    else if (previous.current === "edit") trigger.current?.focus({preventScroll:true});
    previous.current = mode;
  }, [mode]);
  const triggerControl = mode === "read" && onEditRequest && <Command controlRef={trigger} disabled={disabled} label={`${label} 수정`} onClick={onEditRequest}><Pencil size={16} aria-hidden="true" /></Command>;
  const editor = <div role="group" aria-label={`${label} 편집`} data-field-region="edit">{edit}</div>;
  if (heading) return <div ref={root} data-ui-component="field-presentation" data-mode={mode}><header data-field-region="heading">{heading}{triggerControl}</header>{mode === "read" ? read : editor}</div>;
  return <div ref={root} data-ui-component="field-presentation" data-mode={mode}><span className={contentPresentation.caption}>{label}</span>{mode==="read"?<div data-field-region="read">{read}{triggerControl}</div>:editor}</div>;
}
