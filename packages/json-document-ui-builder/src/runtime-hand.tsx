import { useEffect, useRef, useState } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { executeUIBuilderAction, readUIBuilderProject, resolveUIBuilderComponent, setUIBuilderInput, type ObjectEditor, type UIBuilderRecordSelection, type UIBuilderSkillDefinition } from "@interactive-os/json-document-editing";
import { resolveUIFlowLayout, type UIComponentObject } from "@interactive-os/json-document-object-document";
import { UIComponentSurface } from "@interactive-os/json-document-canvas";
import { Command, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";

/** Runs the saved component tree through the same projection as the editing canvas. */
export function UIBuilderRuntimeHand({editor, skills, selection: controlledSelection, onSelectionChange}: {readonly editor: ObjectEditor; readonly skills: readonly UIBuilderSkillDefinition[]; readonly selection?: UIBuilderRecordSelection; readonly onSelectionChange?: (selection: UIBuilderRecordSelection) => void}) {
  const snapshot = useEditingSnapshot(editor);
  const project = readUIBuilderProject(snapshot.value);
  const [localSelection, setLocalSelection] = useState<UIBuilderRecordSelection>({});
  const selection = controlledSelection ?? localSelection;
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => {controller.current?.abort();}, []);
  async function run(actionId: string | undefined) {
    if (controller.current) return;
    if (!actionId) {setFailed(true); setMessage("버튼에 액션을 연결해 주세요."); return;}
    const action = project.actions.find(a => a.id === actionId);
    const abort = new AbortController(); controller.current = abort;
    setRunning(action?.name ?? "액션"); setMessage(""); setFailed(false);
    const result = await executeUIBuilderAction(editor, actionId, skills, selection, abort.signal);
    if (controller.current !== abort) return;
    controller.current = null; setRunning(null);
    setFailed(!result.ok); setMessage(result.ok ? `${action?.name ?? "액션"} 완료 · 결과가 데이터에 저장되었습니다.` : "reason" in result ? String(result.reason) : "실행하지 못했습니다.");
  }
  const flow = resolveUIFlowLayout(project.objects, project.flow);
  function renderComponent(objectId: string) {
    const object = project.objects.find(o => o.id === objectId) as UIComponentObject;
    const projection = resolveUIBuilderComponent(project, object, selection);
    const binding = object.document.bindings?.find(b => b.target === "items");
    const table = project.tables.find(t => t.id === binding?.tableId);
    const rowId = table && (selection[table.id] ?? table.data.records[0]?.id);
    return <UIComponentSurface object={projection.object} designId={project.designId} issues={projection.issues} interaction={{busy: !!running, selectedItem: table?.data.records.findIndex(r => r.id === rowId) ?? -1,
      onAction: () => void run(object.document.actionId),
      onValueChange: value => {const result = setUIBuilderInput(editor, object, value, selection); if (!result.ok) {setFailed(true); setMessage("reason" in result ? String(result.reason) : "값을 저장하지 못했습니다.");}},
      onSelectItem: index => {const row = table?.data.records[index]; if (table && row) {(onSelectionChange ?? setLocalSelection)({...selection, [table.id]: row.id}); setMessage("");}},
    }} />;
  }
  return <div className="builder-runtime" aria-label="화면 실행">
    <div className="builder-flow" style={{maxWidth: project.width}} role="group" aria-label="실행 화면" data-layout-mode="auto-flow">
      {flow.rows.map((row, index) => <div className="builder-flow-row" key={index} style={{gridTemplateColumns: row.columns.map(c => `minmax(0, ${c.weight}fr)`).join(" ")}}>
        {row.columns.map((column, columnIndex) => <div className="builder-flow-column" data-flow-column key={columnIndex}>
          {column.items.map(item => <div className="builder-flow-item" key={item.objectId} data-ui-component-object={item.objectId} data-flow-size={item.size}>{renderComponent(item.objectId)}</div>)}
        </div>)}
      </div>)}
    </div>
    {(running || message) && <div className={`${floatingSurface.control} builder-runtime-status`} role={failed ? "alert" : "status"}>
      <span>{running ? `${running} 중…` : message}</span>
      {running ? <Command onClick={() => controller.current?.abort()}>취소</Command> : <Command onClick={() => setMessage("")}>닫기</Command>}
    </div>}
  </div>;
}
