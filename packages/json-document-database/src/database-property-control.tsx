import type { KeyboardEventHandler } from "react";
import { databaseValueFromText, type DatabaseProperty } from "@interactive-os/json-document-editing";
type DatabaseControlValue = string | number | boolean;
interface DatabasePropertyControlProps { readonly property: DatabaseProperty; readonly value: DatabaseControlValue; readonly label?: string; readonly mode: "cell" | "form"; readonly initialValue?: string; readonly autoFocus?: boolean; readonly onChange: (value: DatabaseControlValue) => void; readonly onBlur?: (value: DatabaseControlValue) => void; readonly onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLSelectElement>; readonly onFocus?: () => void; readonly onCompositionStart?: () => void; readonly onCompositionEnd?: () => void; }
export function DatabasePropertyControl(props: DatabasePropertyControlProps) {
  const controlled = props.mode === "form";
  if (props.property.type === "checkbox") return <input type="checkbox" aria-label={props.label} {...(controlled ? { checked: Boolean(props.value) } : { defaultChecked: Boolean(props.value) })} onChange={(event) => props.onChange(event.currentTarget.checked)} onBlur={(event) => props.onBlur?.(event.currentTarget.checked)} onKeyDown={props.onKeyDown} />;
  if (props.property.type === "select") return <select aria-label={props.label} {...(controlled ? { value: String(props.value) } : { defaultValue: String(props.value) })} onChange={(event) => props.onChange(event.currentTarget.value)} onBlur={(event) => props.onBlur?.(event.currentTarget.value)} onKeyDown={props.onKeyDown}>
    {controlled ? <option value="">Select…</option> : null}
    {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select>;
  const value = props.initialValue ?? String(props.value);
  return <input type={props.property.type === "number" ? "number" : "text"} aria-label={props.label} autoFocus={props.autoFocus} {...(controlled ? { value } : { defaultValue: value })} onChange={controlled ? (event) => props.onChange(databaseValueFromText(props.property, event.currentTarget.value)) : undefined} onBlur={(event) => props.onBlur?.(databaseValueFromText(props.property, event.currentTarget.value))} onKeyDown={props.onKeyDown} onFocus={props.onFocus} onCompositionStart={props.onCompositionStart} onCompositionEnd={props.onCompositionEnd} />;
}
