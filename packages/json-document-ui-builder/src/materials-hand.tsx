import { useState } from "react";
import { DatabaseHand } from "@interactive-os/json-document-database";
import { Choice, Command, Field, Popover, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import type { UIBuilderSkillDefinition, UIBuilderAction, UIBuilderField, UIBuilderMaterialCommand, UIBuilderProject, UIBuilderTable } from "@interactive-os/json-document-editing";
import { ActionExecutionFields } from "./action-execution-fields.js";
import { SchemaFields, newBuilderField } from "./schema-fields.js";

type Commit = (command: UIBuilderMaterialCommand) => boolean;
export function DataMaterialsHand({project, commit, onHistory}: {project: UIBuilderProject; commit: Commit; onHistory: (direction: "undo" | "redo") => void}) {
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [count, setCount] = useState("10");
  const [replace, setReplace] = useState(false);
  const table = project.tables.find(t => t.id === selected) ?? project.tables.at(-1);
  return <div className="builder-materials">
    <div className="builder-material-toolbar">
      {table && <Choice presentation="popup" label="테이블" value={table.id} options={project.tables.map(t => ({id: t.id, label: t.name}))} onValueChange={setSelected} />}
      <Popover label="새 테이블" open={creating} onOpenChange={setCreating} trigger="+ 테이블" panelClassName={`${floatingSurface.panel} builder-material-editor`}>
        <TableForm commit={command => {const ok = commit(command); if (ok) {setSelected(""); setCreating(false);} return ok;}} />
      </Popover>
      {table && <Popover label="스키마 편집" open={editing} onOpenChange={setEditing} trigger="스키마 편집" panelClassName={`${floatingSurface.panel} builder-material-editor`}>
        <TableForm key={`${table.id}:${JSON.stringify(table.fields)}:${table.name}`} table={table} commit={command => {const ok = commit(command); if (ok) setEditing(false); return ok;}} />
      </Popover>}
    </div>
    {!table ? <div className="builder-material-empty"><h2>화면에 담을 데이터부터</h2><p>테이블과 필드를 만들면 예시 데이터를 바로 채울 수 있어요.<br />채팅에 만들고 싶은 화면을 설명해도 됩니다.</p></div> : <>
      <div className="builder-material-toolbar builder-sample-controls">
        <label>예시 행 수 <Field label="생성할 행 수" inputMode="numeric" value={count} onValueChange={setCount} /></label>
        <Command onClick={() => commit({type: "table.generate", id: table.id, count: Number(count), mode: "append"})}>예시 추가</Command>
        <Popover label="예시 전체 재생성" open={replace} onOpenChange={setReplace} trigger="전체 재생성" panelClassName={`${floatingSurface.panel} builder-confirm`}>
          <p>직접 수정한 값을 포함해 {table.data.records.length}행을 새 예시로 바꿉니다.</p>
          <Command onClick={() => {if (commit({type: "table.generate", id: table.id, count: Number(count), mode: "replace"})) setReplace(false);}}>재생성</Command>
        </Popover>
        <span aria-live="polite">{table.data.records.length}행</span>
      </div>
      <DatabaseHand onHistory={onHistory} key={table.id} document={table.data} viewId={table.data.views[0]!.id} onDocumentChange={data => {commit({type: "table.data", id: table.id, data});}}
        presentation={{showRecordIds: false, showPropertyTypes: false}} features={{history: false, filter: false, columns: false}} labels={{ariaLabel: `${table.name} 예시 데이터`, newRecord: "빈 행 추가", deleteRecord: "선택 행 삭제", empty: "예시 추가를 눌러 데이터를 채워보세요.", columns: "열", filter: "필터", clearFilter: "필터 해제"}} />
    </>}
  </div>;
}
function TableForm({table, commit}: {table?: UIBuilderTable; commit: Commit}) {
  const [name, setName] = useState(table?.name ?? "");
  const [fields, setFields] = useState<readonly UIBuilderField[]>(table?.fields ?? [newBuilderField()]);
  return <div className="builder-material-form">
    <label>테이블 이름<Field label="테이블 이름" value={name} onValueChange={setName} placeholder="예: 고객" /></label>
    <SchemaFields label="필드" value={fields} onChange={setFields} samples />
    <Command kind="primary" disabled={!name.trim() || !fields.length || fields.some(f => !f.name.trim())} onClick={() => commit({type: "table.save", id: table?.id ?? "", name, fields})}>테이블 저장</Command>
    {table && <Command kind="danger" onClick={() => commit({type: "table.remove", id: table.id})}>테이블 삭제</Command>}
  </div>;
}
export function ActionMaterialsHand({project, commit, skills}: {project: UIBuilderProject; commit: Commit; skills: readonly UIBuilderSkillDefinition[]}) {
  const [selected, setSelected] = useState<string | null>(null);
  const action = project.actions.find(a => a.id === selected);
  return <div className="builder-materials">
    <div className="builder-material-toolbar"><h2>액션·스킬</h2><Command onClick={() => setSelected("")}>+ 액션</Command></div>
    <p className="builder-material-note">기능과 입력·출력을 정하고 실행 스킬을 연결하세요. 실행 탭의 버튼으로 사용할 수 있어요.</p>
    <div className="builder-actions">
      <nav aria-label="등록된 액션" className="builder-action-list">{project.actions.map(a => <Command key={a.id} aria-pressed={selected === a.id} onClick={() => setSelected(a.id)}>{a.name}</Command>)}</nav>
      {selected !== null ? <ActionForm key={`${selected}:${JSON.stringify(action)}`} action={action} project={project} skills={skills} commit={command => {const ok = commit(command); if (ok) setSelected(null); return ok;}} /> : <p>{project.actions.length ? "액션을 선택하면 내용을 수정할 수 있어요." : "등록한 액션은 AI가 화면을 구성할 때 참고해요."}</p>}
    </div>
  </div>;
}
function ActionForm({action, commit, project, skills}: {action?: UIBuilderAction | undefined; commit: Commit; project: UIBuilderProject; skills: readonly UIBuilderSkillDefinition[]}) {
  const [name, setName] = useState(action?.name ?? "");
  const [description, setDescription] = useState(action?.description ?? "");
  const [inputs, setInputs] = useState(action?.inputs ?? []);
  const [outputs, setOutputs] = useState(action?.outputs ?? []);
  const [execution, setExecution] = useState(action?.execution);
  return <div className="builder-material-form">
    <label>액션 이름<Field label="액션 이름" value={name} onValueChange={setName} placeholder="예: 고객 초대" /></label>
    <label>무엇을 하는 기능인가요?<Field label="무엇을 하는 기능인가요?" multiline rows={2} value={description} onValueChange={setDescription} /></label>
    <SchemaFields label="입력" value={inputs} onChange={setInputs} />
    <SchemaFields label="출력" value={outputs} onChange={setOutputs} />
    <ActionExecutionFields value={execution} onChange={setExecution} project={project} skills={skills} />
    <Command kind="primary" disabled={!name.trim()} onClick={() => commit({type: "action.save", action: {id: action?.id ?? "", name, description, inputs, outputs, ...(execution ? {execution} : {})}})}>액션 저장</Command>
    {action && <Command kind="danger" onClick={() => commit({type: "action.remove", id: action.id})}>액션 삭제</Command>}
  </div>;
}
