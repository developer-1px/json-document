import { Files, ChevronDown } from "lucide-react";
import { useState } from "react";
import { applyUIBuilderPages, type ObjectEditor, type UIBuilderProject } from "@interactive-os/json-document-editing";
import { Choice, Command, Field, Popover, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";

/** Authoring page choices and names use the canonical project page commands. */
export function BuilderPageControls({editor, project, onError, editable = true, onPageChange}: {editor: ObjectEditor; project: UIBuilderProject; onError: (error: string | null) => void; editable?: boolean; onPageChange?: (id: string) => void}) {
  const [open, setOpen] = useState(false);
  const current = project.pages.find(page => page.id === project.activePageId)!;
  const [name, setName] = useState(current.name);
  const [newName, setNewName] = useState("");
  function commit(commands: Parameters<typeof applyUIBuilderPages>[1]) {
    const result = applyUIBuilderPages(editor, commands);
    onError(result.ok ? null : "reason" in result ? String(result.reason) : "페이지를 변경하지 못했습니다.");
    return result.ok;
  }
  return <Popover label="페이지" open={open} onOpenChange={value => {setName(current.name); setOpen(value);}} trigger={<><Files size={16} aria-hidden="true" />{current.name}<ChevronDown size={14} aria-hidden="true" /></>} panelClassName={`${floatingSurface.panel} builder-catalog-panel`}>
    <div className="builder-binding-fields">
      <h3>페이지</h3>
      <Choice presentation="popup" label={editable ? "편집할 페이지" : "표시할 페이지"} value={current.id} options={project.pages.map(page => ({id: page.id, label: page.name}))} onValueChange={id => {if (!editable && onPageChange) {onPageChange(id); return;} if (commit([{type: "page.select", id}])) setName(project.pages.find(page => page.id === id)?.name ?? "");}} />
      {editable && <>
      <label>페이지 이름<Field label="페이지 이름" value={name} onValueChange={setName} /></label>
      <Command disabled={!name.trim() || name === current.name} onClick={() => commit([{type: "page.rename", id: current.id, name: name.trim()}])}>이름 변경</Command>
      <label>새 페이지 이름<Field label="새 페이지 이름" value={newName} onValueChange={setNewName} /></label>
      <Command onClick={() => {const id = `page:${crypto.randomUUID()}`; if (commit([{type: "page.create", id, name: newName.trim() || `페이지 ${project.pages.length + 1}`}])) {setNewName(""); setOpen(false);}}}>페이지 추가</Command>
      </>}
    </div>
  </Popover>;
}
