import { useState } from "react";
import { Choice, Command, Field } from "@interactive-os/json-document-ui-primitives-react";
import { createEditingId, type UIBuilderField, type DatabaseProperty } from "@interactive-os/json-document-editing";

export function newBuilderField(): UIBuilderField { return {id: createEditingId("field"), name: "", type: "text", options: [], sample: "auto"}; }
const types = [{id: "text", label: "텍스트"}, {id: "number", label: "숫자"}, {id: "checkbox", label: "참 / 거짓"}, {id: "select", label: "선택"}, {id: "title", label: "제목"}] as const;
const samples = [{id: "auto", label: "자동"}, {id: "name", label: "이름"}, {id: "email", label: "이메일"}, {id: "company", label: "회사"}, {id: "product", label: "상품"}, {id: "sentence", label: "문장"}, {id: "date", label: "날짜"}, {id: "url", label: "URL"}] as const;
/** Schema form shared by table fields and action input/output contracts. */
export function SchemaFields({value, onChange, samples: showSamples = false, label}: {value: readonly DatabaseProperty[]; onChange: (fields: UIBuilderField[]) => void; samples?: boolean; label: string}) {
  const fields = value.map(f => ({...f, sample: f.sample ?? "auto"}) as UIBuilderField);
  const update = (index: number, patch: Partial<Pick<UIBuilderField, "name" | "type" | "sample" | "options">>) => onChange(fields.map((f, i) => i === index ? {...f, ...patch} : f));
  return <section className="builder-schema" aria-label={label}>
    <h3>{label}</h3>
    {fields.map((field, index) => <div className="builder-schema-field" key={field.id}>
      <Field label={`${label} ${index + 1} 이름`} value={field.name} placeholder="예: 이메일" onValueChange={name => update(index, {name})} />
      <Choice presentation="popup" label={`${label} ${index + 1} 타입`} value={field.type} options={types} onValueChange={type => update(index, {type})} />
      {showSamples && ["text", "title"].includes(field.type) && <Choice presentation="popup" label={`${label} ${index + 1} 예시`} value={field.sample} options={samples} onValueChange={sample => update(index, {sample})} />}
      <Command aria-label={`${label} ${index + 1} 삭제`} onClick={() => onChange(fields.filter((_, i) => i !== index))}>삭제</Command>
      {field.type === "select" && <SelectOptions field={field} label={`${label} ${index + 1} 선택 항목`} onChange={options => update(index, {options})} />}
    </div>)}
    <Command onClick={() => onChange([...fields, newBuilderField()])}>+ {label} 추가</Command>
  </section>;
}

function SelectOptions({field, label, onChange}: {field: UIBuilderField; label: string; onChange: (options: UIBuilderField["options"]) => void}) {
  const [text, setText] = useState(field.options.map(o => o.name).join(", "));
  return <Field label={label} placeholder="대기, 진행, 완료" value={text} onValueChange={value => {
    setText(value);
    onChange(value.split(",").map(name => name.trim()).filter(Boolean).map(name => field.options.find(o => o.name === name) ?? {id: name, name}));
  }} />;
}
