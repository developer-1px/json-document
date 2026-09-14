import {CanvasSheetObject} from "./canvas-sheet-object.js";
import {sheetEmbeddedDocumentType} from "@interactive-os/json-document-editing";
import { useState, useEffect, type CSSProperties } from "react";
import { Braces, Circle, CopyPlus, MousePointer2, Pencil, RectangleHorizontal, Redo2, StickyNote, Trash2, Type, Table2, Undo2, type LucideIcon } from "lucide-react";
import type { ObjectEditor } from "@interactive-os/json-document-editing";
import type { PlaneSelectProfile } from "@interactive-os/json-document-affordance";
import { serializeCanvasDocument } from "@interactive-os/json-document-object-document";
import { Command, Field, ProductShell, Toggle, ToolbarGroup } from "@interactive-os/json-document-ui-primitives-react";
import { CanvasObjectTarget, CanvasObjectView, CanvasResizeTarget, CanvasTextInput } from "./canvas-object-view.js";
import { useCanvasHand, type CanvasCreationStyle, type CanvasTool } from "./use-canvas-hand.js";
import { CanvasStyleControls } from "./canvas-style-controls.js";

export interface CanvasHandProps {
  readonly editor: ObjectEditor;
  readonly creationStyle: CanvasCreationStyle;
  readonly className?: string;
  readonly slideStyle?: CSSProperties;
  readonly label?: string;
  /** Optional policy instance; one profile per mounted Hand. */
  readonly selectProfile?: PlaneSelectProfile;
}

const tools: ReadonlyArray<{ readonly id: CanvasTool; readonly label: string; readonly icon: LucideIcon }> = [
  { id: "select", label: "선택", icon: MousePointer2 }, { id: "text", label: "글자", icon: Type },
  { id: "sticky-note", label: "스티커 노트", icon: StickyNote },
  { id:"table",label:"표",icon:Table2 },
  { id: "rectangle", label: "사각형", icon: RectangleHorizontal }, { id: "ellipse", label: "타원", icon: Circle }, { id: "path", label: "그리기", icon: Pencil },
];

export function CanvasHand(props: CanvasHandProps) {
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const hand = useCanvasHand(props.editor, props.creationStyle, props.selectProfile, setEditingObject);
  const [json, setJSON] = useState<string | null>(null);
  const selected = hand.objects.find((object) => object.id === hand.selection.primaryKey);
  useEffect(() => {if(hand.tool !== "select" || selected?.id !== editingObject) setEditingObject(null);},[hand.tool,selected?.id,editingObject]);
  const exitTable = () => {setEditingObject(null);hand.surface.current?.focus();};
  const editObject = (object: typeof hand.objects[number]) => {
    if(object.kind === "embedded-document" && object.documentType === sheetEmbeddedDocumentType) {hand.select(object.id);setEditingObject(object.id);}
    else hand.editText(object.id);
  };
  const renderEmbedded = (object: Extract<typeof hand.objects[number],{kind:"embedded-document"}>) => object.documentType === sheetEmbeddedDocumentType
    ? <CanvasSheetObject object={object} editor={props.editor} active={editingObject === object.id} onDeactivate={exitTable} />
    : <foreignObject x={object.x} y={object.y} width={object.width} height={object.height}><div role="status">지원하지 않는 문서: {object.documentType}</div></foreignObject>;
  const selectedKeys = new Set(hand.selection.keys);
  const copyOriginals = new Map(hand.copyOriginals.map((object) => [object.id, object]));
  return (
    <ProductShell className={props.className} toolbarLabel="Canvas tools" toolbar={<ToolbarGroup style={{ flexWrap: "wrap" }}>
      <ToolbarGroup>{tools.map((tool) => <Toggle key={tool.id} label={tool.label} pressed={hand.tool === tool.id} onClick={() => hand.choose(tool.id)}><tool.icon aria-hidden="true" size={16} /></Toggle>)}</ToolbarGroup>
      <ToolbarGroup>
        <Command label="실행 취소" disabled={!hand.snapshot.canUndo} onClick={() => hand.history("undo")}><Undo2 aria-hidden="true" size={16} /></Command>
        <Command label="다시 실행" disabled={!hand.snapshot.canRedo} onClick={() => hand.history("redo")}><Redo2 aria-hidden="true" size={16} /></Command>
        <Command label="복제" disabled={!selected} onClick={() => hand.duplicate()}><CopyPlus aria-hidden="true" size={16} /></Command>
        <Command label="삭제" disabled={!selected} onClick={hand.remove}><Trash2 aria-hidden="true" size={16} /></Command>
      </ToolbarGroup>
      {hand.tool === "select" && <CanvasStyleControls key={JSON.stringify(hand.snapshot.selection)} value={hand.selectedStyle} onStyle={hand.setStyle} onOpen={() => { hand.commitText(); hand.cancel(); }} />}
      <Command label="JSON" onClick={() => { hand.commitText(); hand.cancel(); setJSON(json === null ? serializeCanvasDocument(props.editor.snapshot.value as typeof hand.document) : null); }}><Braces aria-hidden="true" size={16} /></Command>
    </ToolbarGroup>}>
      <svg ref={hand.surface} {...hand.surfaceProps} onPointerDownCapture={event => {if(editingObject && !(event.target as Element).closest("[data-canvas-sheet]")) setEditingObject(null);}} tabIndex={0} role="group" aria-label={props.label ?? "Canvas slide"}
        aria-busy={hand.pastePending}
        data-canvas-slide="true" data-tool={hand.tool} viewBox={`0 0 ${hand.document.width} ${hand.document.height}`} preserveAspectRatio="none"
        style={{ display: "block", width: "100%", aspectRatio: `${hand.document.width} / ${hand.document.height}`, touchAction: "none", userSelect: "none", overflow: "hidden", ...props.slideStyle }}>
        {hand.objects.map((object) => <g key={object.id} data-canvas-copy-original={copyOriginals.has(object.id) ? object.id : undefined}>
          <CanvasObjectView object={copyOriginals.get(object.id) ?? object} hideText={hand.draft?.id === object.id} renderEmbedded={renderEmbedded} />
          <CanvasObjectTarget object={object} selected={selectedKeys.has(object.id)} enabled={hand.tool === "select" && hand.draft?.id !== object.id && editingObject !== object.id}
            copying={hand.copyOriginals.length > 0 && selectedKeys.has(object.id)}
            onSelect={(shiftKey) => {setEditingObject(null);hand.select(object.id, shiftKey);}} onEdit={() => editObject(object)} onHandle={(interaction, event) => hand.interaction(interaction, event, object, "drag")} />
        </g>)}
        {copyOriginals.size > 0 && <g data-canvas-copy-preview="" pointerEvents="none">{hand.objects.filter((object) => selectedKeys.has(object.id)).map((object) => <CanvasObjectView key={object.id} object={object} renderEmbedded={renderEmbedded} />)}</g>}
        {hand.preview && <g data-canvas-preview="" pointerEvents="none" opacity={0.65}><CanvasObjectView object={{ ...hand.preview, id: "preview" }} renderEmbedded={renderEmbedded} /></g>}
        {hand.tool === "select" && hand.objects.filter((object) => selectedKeys.has(object.id)).map((object) =>
          <rect key={object.id} data-selection-outline={object.id} x={object.x} y={object.y} width={object.width} height={object.height} fill="none" stroke="rgb(var(--color-border-accent))" strokeWidth={object.id === selected?.id ? 2 : 1} pointerEvents="none" />)}
        {selected && hand.tool === "select" && <g>
          {!hand.draft && !editingObject && (["n", "e", "s", "w", "nw", "ne", "se", "sw"] as const).map((edge) => <CanvasResizeTarget key={edge} object={selected} edge={edge} onHandle={(interaction, event) => hand.interaction(interaction, event, selected, "resize", edge)} />)}
        </g>}
        {hand.marquee && <rect data-canvas-marquee="" {...hand.marquee} fill="rgb(var(--color-border-accent) / 0.08)" stroke="rgb(var(--color-border-accent))" pointerEvents="none" />}
        {selected && hand.draft?.id === selected.id && <CanvasTextInput object={selected} text={hand.draft.text} onChange={hand.changeText}
          onCommit={() => { hand.commitText(); hand.surface.current?.focus(); }} onCancel={() => { hand.cancel(); hand.surface.current?.focus(); }} />}
      </svg>
      {hand.pastePending && <p role="status">붙여넣는 중… Escape로 취소</p>}
      {hand.error && <p role="alert">{hand.error}</p>}
      {json !== null && <section aria-label="Canvas JSON">
        <Field multiline label="Canvas JSON document" value={json} onValueChange={setJSON} rows={10} spellCheck={false} style={{ width: "100%", fontFamily: "monospace" }} />
        <Command onClick={() => setJSON(serializeCanvasDocument(hand.document))}>현재 문서 읽기</Command>
        <Command onClick={() => { if (hand.openJSON(json)) setJSON(null); }}>JSON 열기</Command>
      </section>}
    </ProductShell>
  );
}
