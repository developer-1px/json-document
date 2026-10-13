import { useState } from "react";
import { Choice, Command, Popover, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { applyUIBuilderConfiguration, type ObjectEditor, type UIBuilderProject } from "@interactive-os/json-document-editing";
import { uiDesignCatalog, uiLayoutCatalog, type UILayoutId, type UIComponentObject } from "@interactive-os/json-document-object-document";
import { BindingInspector } from "./binding-inspector.js";

export function BuilderDesignControls({editor, project}: {editor: ObjectEditor; project: UIBuilderProject}) {
  const [open, setOpen] = useState(false);
  const [layoutId, setLayoutId] = useState<UILayoutId>("stack");
  const [error, setError] = useState("");
  const selected = editor.snapshot.selection.keys;
  const [scope, setScope] = useState("all");
  return <Popover label="디자인·정리" open={open} onOpenChange={setOpen} trigger="디자인·정리" panelClassName={`${floatingSurface.panel} builder-catalog-panel`}>
    <div className="builder-binding-fields">
      <label>디자인<Choice presentation="inline" label="디자인" value={project.designId} options={uiDesignCatalog.map(d => ({id: d.id, label: d.label}))} onValueChange={designId => {
        const result = applyUIBuilderConfiguration(editor, {designId});
        setError(result.ok ? "" : "디자인을 적용하지 못했습니다.");
      }} /></label>
      <label>배치<Choice presentation="popup" label="레이아웃" value={layoutId} options={uiLayoutCatalog.map(l => ({id: l.id, label: l.label}))} onValueChange={setLayoutId} /></label>
      <Choice presentation="inline" label="정리 범위" value={scope} options={[{id: "all", label: "전체"}, {id: "selection", label: `선택한 ${selected.length}개`, disabled: selected.length === 0}]} onValueChange={setScope} />
      <Command disabled={project.objects.length === 0 || scope === "selection" && !selected.length} onClick={() => {
        const result = applyUIBuilderConfiguration(editor, {layout: {id: layoutId, objectIds: scope === "selection" ? selected : []}});
        if (result.ok) setOpen(false); else setError("reason" in result ? String(result.reason) : "배치를 정리하지 못했습니다.");
      }}>배치 정리</Command>
      {error && <p role="alert">{error}</p>}
    </div>
  </Popover>;
}
export function BuilderBindingControl({editor, project}: {editor: ObjectEditor; project: UIBuilderProject}) {
  const [open, setOpen] = useState(false);
  const object = project.objects.find(o => o.id === editor.snapshot.selection.primaryKey) as UIComponentObject | undefined;
  if (!object) return null;
  return <Popover label="데이터·액션 연결" open={open} onOpenChange={setOpen} trigger="연결" panelClassName={`${floatingSurface.panel} builder-catalog-panel`}>
    <BindingInspector key={`${object.id}:${JSON.stringify(object.document)}`} editor={editor} project={project} object={object} onClose={() => setOpen(false)} />
  </Popover>;
}
