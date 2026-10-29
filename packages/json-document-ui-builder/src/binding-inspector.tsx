import { useState } from "react";
import { Choice, Command } from "@interactive-os/json-document-ui-primitives-react";
import { applyUIBuilderConfiguration, resolveUIBuilderComponent, type ObjectEditor, type UIBuilderProject } from "@interactive-os/json-document-editing";
import { uiBindingCatalog, uiComponentCatalog, type UIComponentBinding, type UIComponentObject, type UIBindingTarget } from "@interactive-os/json-document-object-document";

const targetLabels: Record<UIBindingTarget, string> = {text: "내용", detail: "설명·숫자", items: "항목", value: "입력 값"};
/** Simple slot choices over the canonical binding contract; no expressions or code input. */
export function BindingInspector({editor, project, object, onClose}: {editor: ObjectEditor; project: UIBuilderProject; object: UIComponentObject; onClose: () => void}) {
  const [bindings, setBindings] = useState<readonly UIComponentBinding[]>(object.document.bindings ?? []);
  const [actionId, setActionId] = useState(object.document.actionId ?? "");
  const [error, setError] = useState("");
  const targets = uiComponentCatalog.find(c => c.id === object.document.component)!.bindingTargets;
  const issues = resolveUIBuilderComponent(project, object).issues;
  const action = project.actions.find(a => a.id === actionId);
  return <div className="builder-binding-fields">
    <h3>데이터 연결</h3>
    {targets.length === 0 && <p>이 요소는 장식용이에요.</p>}
    {targets.map(target => <BindingSlot key={target} target={target} object={object} project={project} binding={bindings.find(b => b.target === target)} onChange={binding => setBindings(current => [...current.filter(b => b.target !== target), ...(binding ? [binding] : [])])} />)}
    {bindings.some(b => b.mode === "list") && <p>목록은 처음 50행까지 표시해요.</p>}
    {object.document.component === "button" && <>
      <label>클릭 액션<Choice presentation="popup" label="클릭 액션" value={actionId} options={[{id: "", label: "연결 안 함"}, ...project.actions.map(a => ({id: a.id, label: a.name})), ...(actionId && !action ? [{id: actionId, label: "찾을 수 없는 액션"}] : [])]} onValueChange={setActionId} /></label>
      {action && <div className="builder-action-contract"><p>{action.description}</p><p>입력: {action.inputs.map(f => f.name).join(", ") || "없음"}</p><p>출력: {action.outputs.map(f => f.name).join(", ") || "없음"}</p><p>{action.execution ? "실행 탭에서 연결한 스킬을 사용할 수 있어요." : "액션·스킬 탭에서 실행 스킬을 연결해 주세요."}</p></div>}
    </>}
    {issues.length > 0 && <p role="status">{issues.join(" ")}</p>}
    <Command kind="primary" onClick={() => {
      const result = applyUIBuilderConfiguration(editor, {connections: [{objectId: object.id, bindings, actionId}]});
      if (result.ok) onClose(); else setError("reason" in result ? String(result.reason) : "연결을 확인해 주세요.");
    }}>연결 적용</Command>
    {error && <p role="alert">{error}</p>}
  </div>;
}
function BindingSlot({target, binding, object, project, onChange}: {target: UIBindingTarget; binding: UIComponentBinding | undefined; object: UIComponentObject; project: UIBuilderProject; onChange: (binding: UIComponentBinding | null) => void}) {
  const table = project.tables.find(t => t.id === binding?.tableId);
  const modes = target === "items" ? uiBindingCatalog.filter(b => b.id === "list") : target === "value" ? uiBindingCatalog.filter(b => b.id === "value") : uiBindingCatalog.filter(b => b.id !== "list");
  const available = table?.fields.filter(field => binding?.mode === "sum" ? field.type === "number" : target === "value" && object.document.component === "checkbox" ? field.type === "checkbox" : true) ?? [];
  const update = (patch: Partial<Pick<UIComponentBinding, "mode" | "fieldId" | "recordId">>) => {if (binding) onChange({...binding, ...patch});};
  const label = targetLabels[target];
  return <section className="builder-binding-slot" aria-label={`${label} 연결`}>
    <label>{label}<Choice presentation="popup" label={`${label} 데이터`} value={binding?.tableId ?? ""} options={[{id: "", label: "고정 내용"}, ...project.tables.map(t => ({id: t.id, label: t.name})), ...(binding && !table ? [{id: binding.tableId, label: "찾을 수 없는 테이블"}] : [])]} onValueChange={tableId => {
      const next = project.tables.find(t => t.id === tableId);
      const mode = target === "items" ? "list" : object.document.component === "metric" && target === "detail" ? "count" : "value";
      onChange(tableId ? {target, tableId, mode, fieldId: mode === "count" ? "" : next?.fields.find(f => target !== "value" || object.document.component !== "checkbox" || f.type === "checkbox")?.id ?? "", recordId: ""} : null);
    }} /></label>
    {binding && table && <>
      {modes.length > 1 && <Choice presentation="popup" label={`${label} 표시 방식`} value={binding.mode} options={modes.map(m => ({id: m.id, label: m.label}))} onValueChange={mode => update({mode, recordId: "", fieldId: mode === "count" ? "" : table.fields.find(f => mode !== "sum" || f.type === "number")?.id ?? ""})} />}
      {binding.mode !== "count" && <Choice presentation="popup" label={`${label} 필드`} value={binding.fieldId} options={[...available.map(f => ({id: f.id, label: f.name})), ...(!available.some(f => f.id === binding.fieldId) ? [{id: binding.fieldId, label: "필드를 선택해 주세요"}] : [])]} onValueChange={fieldId => update({fieldId})} />}
      {binding.mode === "value" && <Choice presentation="popup" label={`${label} 행`} value={binding.recordId} options={[{id: "", label: "선택한 행 · 없으면 첫 행"}, ...table.data.records.map((row, i) => ({id: row.id, label: `${i + 1}. ${String(row.values[binding.fieldId] ?? "빈 값").slice(0, 36)}`})), ...(binding.recordId && !table.data.records.some(row => row.id === binding.recordId) ? [{id: binding.recordId, label: "찾을 수 없는 행"}] : [])]} onValueChange={recordId => update({recordId})} />}
    </>}
  </section>;
}
