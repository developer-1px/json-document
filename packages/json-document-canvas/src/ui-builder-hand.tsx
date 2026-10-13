import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { type ObjectEditor } from "@interactive-os/json-document-editing";
import { assertUIBuilderDocument, assertUIComponentContent, createUIComponentObject, uiComponentCatalog, type UIComponentKind, type CanvasObject, type ObjectBounds } from "@interactive-os/json-document-object-document";
import { Choice, Command, Field, Popover, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { CanvasHand } from "./canvas-hand.js";
import { UIComponentView } from "./ui-component-view.js";

/** A constrained Canvas Hand. Spatial interaction and history remain owned by Canvas/Object. */
export function UIBuilderHand({ editor }: { readonly editor: ObjectEditor }) {
  const snapshot = useEditingSnapshot(editor);
  assertUIBuilderDocument(snapshot.value);
  const document = snapshot.value;
  const [palette, setPalette] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ObjectBounds>({ x: 0, y: 0, width: 1200, height: 800 });
  const selected = document.objects.find(object => object.id === snapshot.selection.primaryKey);
  function add(kind: UIComponentKind) {
    const offset = (document.objects.length % 6) * 24;
    const result = editor.dispatch({ type: "object.create", object: createUIComponentObject(kind, { x: view.x + Math.min(100, view.width / 8) + offset, y: view.y + 140 + offset }) });
    setError(result.ok ? null : "컴포넌트를 추가하지 못했습니다.");
    setPalette(false); setEditing(false);
  }
  return <>
    <CanvasHand workspace navigation="fixed" onViewportChange={setView} editor={editor} className="ui-builder-hand" label="UI 작업면"
      creationStyle={{ color: "transparent", textColor: "#222222", fontSize: 16, strokeWidth: 1 }}
      creationTools={[]} documentControls={false} contentToolbar={false}
      renderEmbedded={object => <UIComponentView object={object} />} onEditEmbedded={() => setEditing(true)}
      toolbarContent={<>
        <Popover label="컴포넌트 추가" open={palette} onOpenChange={setPalette} trigger={<><Plus size={16} aria-hidden="true" /> 컴포넌트</>} panelClassName={`${floatingSurface.panel} ui-builder-palette`}>
          {uiComponentCatalog.map(component => <Command key={component.id} onClick={() => add(component.id)}>{component.label}</Command>)}
        </Popover>
        {selected?.kind === "embedded-document" && <Popover label="내용 편집" open={editing} onOpenChange={setEditing} trigger={<Pencil size={16} aria-hidden="true" />} triggerPresentation="icon" panelClassName={`${floatingSurface.panel} ui-builder-properties`}>
          <ComponentProperties key={`${selected.id}:${JSON.stringify(selected.document)}:${selected.label}`} object={selected} editor={editor} onClose={() => setEditing(false)} />
        </Popover>}
      </>} />
    {document.objects.length === 0 && <div className="ui-builder-empty" aria-live="polite"><h1>어떤 화면을 만들까요?</h1><p>컴포넌트를 놓고 자유롭게 움직여보세요.<br />정리가 필요하면 AI에게 말해주세요.</p></div>}
    {error && <p role="alert">{error}</p>}
  </>;
}
function ComponentProperties({ object, editor, onClose }: { object: Extract<CanvasObject, {kind: "embedded-document"}>; editor: ObjectEditor; onClose: () => void }) {
  assertUIComponentContent(object.document);
  const content = object.document;
  const [text, setText] = useState(object.label);
  const [detail, setDetail] = useState(content.detail);
  const [items, setItems] = useState(content.items.join("\n"));
  const [tone, setTone] = useState(content.tone);
  const [error, setError] = useState(false);
  const hasDetail = ["input", "textarea", "card", "metric"].includes(content.component);
  const hasItems = ["select", "tabs", "list"].includes(content.component);
  return <div className="ui-builder-property-fields">
    <Field label="내용" multiline rows={2} value={text} onValueChange={setText} />
    {hasDetail && <Field label={content.component === "metric" ? "숫자" : "설명"} value={detail} onValueChange={setDetail} />}
    {hasItems && <Field label="항목 (한 줄에 하나)" multiline rows={4} value={items} onValueChange={setItems} />}
    <Choice presentation="inline" label="강조" value={tone} options={[{ id: "default", label: "기본" }, { id: "accent", label: "강조" }, { id: "quiet", label: "차분하게" }]} onValueChange={setTone} />
    <Command kind="primary" onClick={() => {
      const result = editor.dispatch({ type: "object.update", objectId: object.id, changes: { label: text, document: { ...content, detail, items: items ? items.split("\n") : [], tone } } });
      if (result.ok) onClose(); else setError(true);
    }}>적용</Command>
    {error && <p role="alert">내용을 적용하지 못했습니다. 다시 확인해 주세요.</p>}
  </div>;
}
