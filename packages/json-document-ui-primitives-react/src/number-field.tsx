import {useState, type ReactNode} from "react";
import {Field} from "./input-controls.js";
import {FormField} from "./form-field.js";
import {contentPresentation} from "./content-presentation.js";

export interface NumberFieldProps {
  readonly label: string;
  readonly value: number | null;
  readonly onValueChange: (value: number | null) => void;
  readonly min?: number;
  readonly max?: number;
  /** Maximum allowed fractional digits; currency/quantity policy belongs to the domain. */
  readonly precision?: number;
  readonly unit?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
}
/** Exact numeric entry. Invalid drafts stay visible and never become NaN, zero, or rounded money. */
export function NumberField({label,value,onValueChange,min,max,precision,unit,required=false,disabled}: NumberFieldProps): ReactNode {
  const [interacted, setInteracted] = useState(false);
  const [draft,setDraft] = useState<{text:string; source:number|null} | null>(null);
  const text = draft && Object.is(draft.source,value) ? draft.text : value == null ? "" : String(value);
  const parse = (text:string) => {
    if (!text.trim()) return {value:null,error:required ? "값을 입력하세요." : ""};
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim())) return {value:null,error:"숫자를 입력하세요."};
    const next=Number(text);
    const fractional=text.trim().split(".")[1]?.length ?? 0;
    const error=!Number.isFinite(next) ? "표현할 수 있는 숫자를 입력하세요." : min != null && next < min ? `${min} 이상 입력하세요.` : max != null && next > max ? `${max} 이하 입력하세요.` : precision != null && fractional > precision ? precision === 0 ? "정수로 입력하세요." : `소수점 ${precision}자리까지 입력하세요.` : "";
    return {value:next,error};
  };
  const {error}=parse(text);
  return <div data-ui-component="number-field"><FormField label={label} required={required} error={interacted ? error : undefined}>{control =>
    <span data-number-field="input"><Field {...control} label={label} value={text} disabled={disabled} inputMode={precision === 0 ? "numeric" : "decimal"} controlRef={element=>element?.setCustomValidity(error)} onInvalid={()=>setInteracted(true)} onBlur={()=>setInteracted(true)} onValueChange={text=>{
      setInteracted(true);
      const next=parse(text);
      setDraft({text,source:next.error ? value : next.value});
      if (!next.error) onValueChange(next.value);
    }}/>{unit && <span className={contentPresentation.caption}>{unit}</span>}</span>
  }</FormField></div>;
}
