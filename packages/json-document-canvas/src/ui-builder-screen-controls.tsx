import { UIBuilderComponentPalette } from "./ui-builder-component-palette.js";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { getUIBuilderPageObjects, readUIBuilderProject, type ObjectEditor, type UIBuilderRecordSelection } from "@interactive-os/json-document-editing";
import { assertUIBuilderDocument, assertUIComponentContent, createUIComponentObject, type UIComponentKind, type CanvasObject } from "@interactive-os/json-document-object-document";
import { Choice, Command, Field, Popover, Toolbar, ToolbarGroup, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { CanvasEditingCommands } from "./canvas-editing-commands.js";

/** Editing commands for the same screen used by runtime; no second canvas or projection. */
export function UIBuilderScreenControls({ editor, pageId, commands = true, contentEditing, onContentEditingChange }: {
  readonly editor: ObjectEditor;
  readonly pageId?: string;
  readonly commands?: boolean;
  readonly contentEditing?: boolean;
  readonly onContentEditingChange?: (open: boolean) => void;
  readonly recordSelection?: UIBuilderRecordSelection;
}) {
  const snapshot = useEditingSnapshot(editor);
  assertUIBuilderDocument(snapshot.value);
  const project = readUIBuilderProject(snapshot.value);
  const currentPageId = pageId ?? project.activePageId;
  const objects = getUIBuilderPageObjects(project, currentPageId);
  const selected = objects.find(object => object.id === snapshot.selection.primaryKey);
  const [palette, setPalette] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const editing = contentEditing ?? localEditing;
  const setEditing = onContentEditingChange ?? setLocalEditing;
  const [error, setError] = useState<string | null>(null);
  function report(result: { readonly ok: boolean }) {
    setError(result.ok ? null : "변경을 적용하지 못했습니다.");
  }
  function add(kind: UIComponentKind) {
    const last = objects.at(-1);
    const created = createUIComponentObject(kind, { x: last?.x ?? 0, y: last ? last.y + last.height + 24 : 0 });
    if (created.kind !== "embedded-document") throw new Error("등록 컴포넌트를 확인해 주세요.");
    report(editor.dispatch({ type: "object.create", object: { ...created, document: { ...created.document, pageId: currentPageId } } }));
    setPalette(false);
  }
  const controls = <>
      <ToolbarGroup>
        <Popover label="컴포넌트 추가" open={palette} onOpenChange={setPalette} trigger={<Plus size={16} aria-hidden="true" />} triggerPresentation="icon" panelClassName={`${floatingSurface.panel} ui-builder-palette`}>
          <UIBuilderComponentPalette onAdd={add} />
        </Popover>
        {selected?.kind === "embedded-document" && <Popover label="내용 편집" open={editing} onOpenChange={setEditing} trigger={<Pencil size={16} aria-hidden="true" />} triggerPresentation="icon" panelClassName={`${floatingSurface.panel} ui-builder-properties`}>
          <UIBuilderComponentProperties key={`${selected.id}:${JSON.stringify(selected.document)}:${selected.label}`} object={selected} editor={editor} pages={project.pages} onClose={() => setEditing(false)} />
        </Popover>}
      </ToolbarGroup>
      {commands && <CanvasEditingCommands editor={editor} objectIds={objects.map(object => object.id)} onResult={report} />}
    {error && <p role="alert">{error}</p>}
  </>;
  return commands ? <Toolbar label="화면 편집" className={floatingSurface.control}>{controls}</Toolbar> : controls;
}

export function UIBuilderComponentProperties({ object, editor, pages, onClose }: { pages: readonly {id: string; name: string}[]; object: Extract<CanvasObject, {kind: "embedded-document"}>; editor: ObjectEditor; onClose: () => void }) {
  assertUIComponentContent(object.document);
  const content = object.document;
  const [text, setText] = useState(object.label);
  const [detail, setDetail] = useState(content.detail);
  const [items, setItems] = useState(content.items.join("\n"));
  const [targetPageId, setTargetPageId] = useState(content.targetPageId ?? "");
  const [tone, setTone] = useState(content.tone);
  const [error, setError] = useState(false);
  const hasDetail = ["input", "textarea", "card", "metric"].includes(content.component);
  const hasItems = ["select", "tabs", "list"].includes(content.component);
  return <div className="ui-builder-property-fields">
    {!!content.bindings?.length && <p>연결된 값은 데이터 탭에서 수정할 수 있어요.</p>}
    <Field label="내용" disabled={!!content.bindings?.some(b => b.target === "text")} multiline rows={2} value={text} onValueChange={setText} />
    {hasDetail && <Field label={content.component === "metric" ? "숫자" : "설명"} disabled={!!content.bindings?.some(b => b.target === "detail")} value={detail} onValueChange={setDetail} />}
    {hasItems && <Field label="항목 (한 줄에 하나)" disabled={!!content.bindings?.some(b => b.target === "items")} multiline rows={4} value={items} onValueChange={setItems} />}
    {content.component === "page-link" && <Choice presentation="popup" label="이동할 페이지" value={targetPageId} options={[{id: "", label: "페이지를 선택하세요"}, ...pages.map(page => ({id: page.id, label: page.name}))]} onValueChange={setTargetPageId} />}
    <Choice presentation="inline" label="강조" value={tone} options={[{ id: "default", label: "기본" }, { id: "accent", label: "강조" }, { id: "quiet", label: "차분하게" }]} onValueChange={setTone} />
    <Command kind="primary" onClick={() => {
      const baseContent = {...content};
      delete baseContent.targetPageId;
      const result = editor.dispatch({ type: "object.update", objectId: object.id, changes: { label: text, document: { ...baseContent, ...(targetPageId ? {targetPageId} : {}), detail, items: items ? items.split("\n") : [], tone } } });
      if (result.ok) onClose(); else setError(true);
    }}>적용</Command>
    {error && <p role="alert">내용을 적용하지 못했습니다. 다시 확인해 주세요.</p>}
  </div>;
}
