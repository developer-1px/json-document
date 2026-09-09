import { useState, type CSSProperties } from "react";
import { Braces, Circle, MousePointer2, Pencil, RectangleHorizontal, Redo2, Trash2, Type, Undo2, type LucideIcon } from "lucide-react";
import type { ObjectEditor } from "@interactive-os/json-document-editing";
import { serializeCanvasDocument } from "@interactive-os/json-document-object-document";
import { Command, Field, ProductShell, Toggle, ToolbarGroup } from "@interactive-os/json-document-ui-primitives-react";
import { CanvasObjectTarget, CanvasObjectView, CanvasResizeTarget, CanvasTextInput } from "./canvas-object-view.js";
import { useCanvasHand, type CanvasCreationStyle, type CanvasTool } from "./use-canvas-hand.js";

export interface CanvasHandProps {
  readonly editor: ObjectEditor;
  readonly creationStyle: CanvasCreationStyle;
  readonly className?: string;
  readonly slideStyle?: CSSProperties;
  readonly label?: string;
}

const tools: ReadonlyArray<{ readonly id: CanvasTool; readonly label: string; readonly icon: LucideIcon }> = [
  { id: "select", label: "선택", icon: MousePointer2 }, { id: "text", label: "글자", icon: Type },
  { id: "rectangle", label: "사각형", icon: RectangleHorizontal }, { id: "ellipse", label: "타원", icon: Circle }, { id: "path", label: "그리기", icon: Pencil },
];

export function CanvasHand(props: CanvasHandProps) {
  const hand = useCanvasHand(props.editor, props.creationStyle);
  const [json, setJSON] = useState<string | null>(null);
  const selected = hand.objects.find((object) => object.id === hand.snapshot.selection.primaryKey);
  return (
    <ProductShell className={props.className} toolbarLabel="Canvas tools" toolbar={<ToolbarGroup style={{ flexWrap: "wrap" }}>
      <ToolbarGroup>{tools.map((tool) => <Toggle key={tool.id} label={tool.label} pressed={hand.tool === tool.id} onClick={() => hand.choose(tool.id)}><tool.icon aria-hidden="true" size={16} /></Toggle>)}</ToolbarGroup>
      <ToolbarGroup>
        <Command label="실행 취소" disabled={!hand.snapshot.canUndo} onClick={() => hand.history("undo")}><Undo2 aria-hidden="true" size={16} /></Command>
        <Command label="다시 실행" disabled={!hand.snapshot.canRedo} onClick={() => hand.history("redo")}><Redo2 aria-hidden="true" size={16} /></Command>
        <Command label="삭제" disabled={!selected} onClick={hand.remove}><Trash2 aria-hidden="true" size={16} /></Command>
      </ToolbarGroup>
      <Command label="JSON" onClick={() => { hand.commitText(); hand.cancel(); setJSON(json === null ? serializeCanvasDocument(props.editor.snapshot.value as typeof hand.document) : null); }}><Braces aria-hidden="true" size={16} /></Command>
    </ToolbarGroup>}>
      <svg ref={hand.surface} {...hand.surfaceProps} tabIndex={0} role="group" aria-label={props.label ?? "Canvas slide"}
        data-canvas-slide="true" data-tool={hand.tool} viewBox={`0 0 ${hand.document.width} ${hand.document.height}`} preserveAspectRatio="none"
        style={{ display: "block", width: "100%", aspectRatio: `${hand.document.width} / ${hand.document.height}`, touchAction: "none", userSelect: "none", overflow: "hidden", ...props.slideStyle }}>
        {hand.objects.map((object) => <g key={object.id}>
          {hand.draft?.id !== object.id && <CanvasObjectView object={object} />}
          <CanvasObjectTarget object={object} selected={object.id === hand.snapshot.selection.primaryKey} enabled={hand.tool === "select" && hand.draft?.id !== object.id}
            onSelect={() => hand.select(object.id)} onEdit={() => hand.editText(object.id)} onHandle={(interaction, event) => hand.interaction(interaction, event, object, "drag")} />
        </g>)}
        {hand.preview && <g pointerEvents="none" opacity={0.65}><CanvasObjectView object={{ ...hand.preview, id: "preview" }} /></g>}
        {selected && hand.tool === "select" && <g>
          <rect x={selected.x} y={selected.y} width={selected.width} height={selected.height} fill="none" stroke="rgb(var(--color-border-accent))" strokeWidth={2} pointerEvents="none" />
          {!hand.draft && (["nw", "ne", "se", "sw"] as const).map((edge) => <CanvasResizeTarget key={edge} object={selected} edge={edge} onHandle={(interaction, event) => hand.interaction(interaction, event, selected, "resize", edge)} />)}
        </g>}
        {selected?.kind === "text" && hand.draft?.id === selected.id && <CanvasTextInput object={selected} text={hand.draft.text} onChange={hand.changeText}
          onCommit={() => { hand.commitText(); hand.surface.current?.focus(); }} onCancel={() => { hand.cancel(); hand.surface.current?.focus(); }} />}
      </svg>
      {hand.error && <p role="alert">{hand.error}</p>}
      {json !== null && <section aria-label="Canvas JSON">
        <Field multiline label="Canvas JSON document" value={json} onValueChange={setJSON} rows={10} spellCheck={false} style={{ width: "100%", fontFamily: "monospace" }} />
        <Command onClick={() => setJSON(serializeCanvasDocument(hand.document))}>현재 문서 읽기</Command>
        <Command onClick={() => { if (hand.openJSON(json)) setJSON(null); }}>JSON 열기</Command>
      </section>}
    </ProductShell>
  );
}
