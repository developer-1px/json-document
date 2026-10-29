import { Check, Choice, Field } from "@interactive-os/json-document-ui-primitives-react";
import type { UIBuilderActionExecution, UIBuilderProject, UIBuilderSkillDefinition } from "@interactive-os/json-document-editing";

/** Declarative action wiring; hosts supply only the available skill catalog. */
export function ActionExecutionFields({value, onChange, project, skills}: {value: UIBuilderActionExecution | undefined; onChange: (value: UIBuilderActionExecution | undefined) => void; project: UIBuilderProject; skills: readonly UIBuilderSkillDefinition[]}) {
  const table = project.tables.find(t => t.id === value?.tableId);
  return <section className="builder-binding-fields" aria-label="실행 연결">
    <h3>실행 연결</h3>
    <Choice presentation="popup" label="실행 스킬" value={value?.skill ?? ""} options={[{id: "", label: "연결 안 함"}, ...skills.map(s => ({id: s.id, label: s.name})), ...(value && !skills.some(s => s.id === value.skill) ? [{id: value.skill, label: "사용할 수 없는 스킬"}] : [])]} onValueChange={skill => onChange(skill ? {skill, tableId: value?.tableId ?? project.tables[0]?.id ?? "", prompt: value?.prompt ?? "", inputFieldIds: value?.inputFieldIds ?? [], outputFieldIds: value?.outputFieldIds ?? [], requiredFieldIds: value?.requiredFieldIds ?? []} : undefined)} />
    {value && <>
      <p>{skills.find(s => s.id === value.skill)?.description}</p>
      <Choice presentation="popup" label="실행 대상 테이블" value={value.tableId} options={project.tables.map(t => ({id: t.id, label: t.name}))} onValueChange={tableId => onChange({...value, tableId, inputFieldIds: [], outputFieldIds: [], requiredFieldIds: []})} />
      <p>실행 화면에서 선택한 행을 읽고, 결과를 같은 행에 저장합니다.</p>
      <Field label="스킬 지시문" multiline rows={3} value={value.prompt} onValueChange={prompt => onChange({...value, prompt})} />
      {(["inputFieldIds", "outputFieldIds", "requiredFieldIds"] as const).map((key, index) => <div key={key} className="builder-binding-fields"><h3>{["읽을 필드", "결과를 쓸 필드", "실행 전 필요한 필드"][index]}</h3>{table?.fields.filter(f => key !== "requiredFieldIds" || value.inputFieldIds.includes(f.id)).map(field => <label className="builder-field-check" key={field.id}><Check label={`${["입력", "출력", "필수"][index]} ${field.name}`} checked={value[key].includes(field.id)} onCheckedChange={checked => {
        const next = {...value, [key]: checked ? [...value[key], field.id] : value[key].filter(id => id !== field.id)};
        onChange(key === "inputFieldIds" ? {...next, requiredFieldIds: next.requiredFieldIds.filter(id => next.inputFieldIds.includes(id))} : next);
      }} />{field.name}</label>)}</div>)}
    </>}
  </section>;
}
