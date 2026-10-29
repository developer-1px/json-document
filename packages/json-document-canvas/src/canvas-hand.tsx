import { createWebKeyboardAdapter, isWebEditableTarget } from "@interactive-os/json-document-web";
import { useCanvasViewport } from "./use-canvas-viewport.js";
import {CanvasSheetObject} from "./canvas-sheet-object.js";
import {sheetEmbeddedDocumentType} from "@interactive-os/json-document-editing";
import { useState, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type CSSProperties, type ReactNode } from "react";
import { Hand, Maximize, Minus, Plus, Braces, Circle, MousePointer2, Pencil, RectangleHorizontal, StickyNote, Type, Table2, type LucideIcon } from "lucide-react";
import type { ObjectEditor } from "@interactive-os/json-document-editing";
import type { PlaneSelectProfile } from "@interactive-os/json-document-affordance";
import { serializeCanvasDocument } from "@interactive-os/json-document-object-document";
import { Command, Field, ProductShell, Toggle, ToolbarGroup } from "@interactive-os/json-document-ui-primitives-react";
import { CanvasObjectTarget, CanvasObjectView, CanvasResizeTarget, CanvasTextInput } from "./canvas-object-view.js";
import { useCanvasHand, type CanvasCreationStyle, type CanvasTool } from "./use-canvas-hand.js";
import { CanvasContentToolbar } from "./canvas-content-toolbar.js";
import { CanvasEditingCommands } from "./canvas-editing-commands.js";

export interface CanvasHandProps {
  /** Fill the host and navigate independently of document coordinates. */
  readonly workspace?: boolean;
  readonly collisionGroups?: readonly import("@interactive-os/json-document-object-document").ObjectCollisionGroup[];
  /** Use the same Canvas interaction surface over mounted HTML content. */
  readonly screenOverlay?: {
    readonly width: number;
    readonly height: number;
    readonly onObjectsChange: (objects: readonly import("@interactive-os/json-document-object-document").CanvasObject[]) => void;
  };
  /** Pixel-sized workspace with scrolling, without zoom or fit controls. */
  readonly navigation?: "free" | "fixed";
  readonly onViewportChange?: (bounds: import("@interactive-os/json-document-object-document").ObjectBounds) => void;
  readonly creationTools?: readonly CanvasTool[];
  readonly toolbarContent?: ReactNode;
  readonly documentControls?: boolean;
  readonly contentToolbar?: boolean;
  /** Limit visible/selectable objects while retaining the full editor document. */
  readonly objectIds?: readonly string[];
  readonly renderEmbedded?: (object: Extract<import("@interactive-os/json-document-object-document").CanvasObject, {kind: "embedded-document"}>) => ReactNode;
  readonly onEditEmbedded?: (objectId: string) => void;
  readonly editor: ObjectEditor;
  readonly creationStyle: CanvasCreationStyle;
  readonly className?: string;
  readonly slideStyle?: CSSProperties;
  readonly label?: string;
  /** Optional policy instance; one profile per mounted Hand. */
  readonly selectProfile?: PlaneSelectProfile;
}

const tools: ReadonlyArray<{ readonly id: CanvasTool; readonly label: string; readonly icon: LucideIcon; readonly shortcut: string }> = [
  { id: "select", label: "선택", icon: MousePointer2, shortcut: "V" }, { id: "text", label: "글자", icon: Type, shortcut: "T" },
  { id: "sticky-note", label: "스티커 노트", icon: StickyNote, shortcut: "S" },
  { id:"table",label:"표",icon: Table2, shortcut: "Shift-T" },
  { id: "rectangle", label: "사각형", icon: RectangleHorizontal, shortcut: "R" }, { id: "ellipse", label: "타원", icon: Circle, shortcut: "O" }, { id: "path", label: "그리기", icon: Pencil, shortcut: "M" },
];

const toolKeyboard = createWebKeyboardAdapter<CanvasTool>({ defaults: false, keySource: "code",
  keymap: Object.fromEntries(tools.map(tool => [tool.shortcut.replace(/[A-Z]$/, key => key.toLowerCase()), tool.id])),
});
const viewKeyboard = createWebKeyboardAdapter({ defaults: false, keySource: "code", keymap: {
  h: "hand", Escape: "select", "Shift-1": "fit", "Shift-!": "fit",
  "Shift-2": "selection", "Shift-@": "selection",
} as const });

export function CanvasHand(props: CanvasHandProps) {
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const hand = useCanvasHand(props.editor, props.creationStyle, props.selectProfile, props.onEditEmbedded ?? setEditingObject, props.objectIds, props.collisionGroups);
  const viewport = useCanvasViewport(hand.surface, hand.document, props.screenOverlay ? false : props.workspace ?? false, props.navigation);
  useEffect(() => { props.onViewportChange?.(viewport.bounds); }, [props.onViewportChange, viewport.viewBox]);
  const [json, setJSON] = useState<string | null>(null);
  const overlayCallback = useRef(props.screenOverlay?.onObjectsChange);
  overlayCallback.current = props.screenOverlay?.onObjectsChange;
  const previousProjection = useRef<string | null>(null);
  const projectionSignature = props.screenOverlay ? JSON.stringify(hand.objects) : null;
  useLayoutEffect(() => {
    if (projectionSignature === null) { previousProjection.current = null; return; }
    if (previousProjection.current === projectionSignature) return;
    previousProjection.current = projectionSignature;
    overlayCallback.current?.(hand.objects);
  }, [projectionSignature, hand.objects]);
  useEffect(() => { if (props.screenOverlay) hand.surface.current?.focus({ preventScroll: true }); }, [!!props.screenOverlay, hand.surface]);
  const selected = hand.objects.find((object) => object.id === hand.selection.primaryKey);
  useEffect(() => {if(hand.tool !== "select" || selected?.id !== editingObject) setEditingObject(null);},[hand.tool,selected?.id,editingObject]);
  const exitTable = () => {setEditingObject(null);hand.surface.current?.focus({ preventScroll: true });};
  const editObject = (object: typeof hand.objects[number]) => {
    if (object.kind === "embedded-document" && props.onEditEmbedded) { hand.select(object.id); props.onEditEmbedded(object.id); return; }
    if(object.kind === "embedded-document" && object.documentType === sheetEmbeddedDocumentType) {hand.select(object.id);setEditingObject(object.id);}
    else hand.editText(object.id);
  };
  const renderEmbedded = (object: Extract<typeof hand.objects[number],{kind:"embedded-document"}>) => props.renderEmbedded ? props.renderEmbedded(object) : object.documentType === sheetEmbeddedDocumentType
    ? <CanvasSheetObject object={object} editor={props.editor} active={editingObject === object.id} onDeactivate={exitTable} />
    : <foreignObject x={object.x} y={object.y} width={object.width} height={object.height}><div role="status">지원하지 않는 문서: {object.documentType}</div></foreignObject>;
  useEffect(() => { if (props.workspace) hand.surface.current?.focus({ preventScroll: true }); }, [props.workspace, hand.surface]);
  const chooseTool = (tool: CanvasTool) => { viewport.setHand(false); hand.choose(tool); };
  const chooseHand = () => { hand.commitText(); hand.cancel(); viewport.setHand(true); hand.surface.current?.focus({ preventScroll: true }); };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isWebEditableTarget(event.target)
      || (event.target instanceof Element && event.target.closest('[role="dialog"]'))) return;
    // Escape is already consumed by the selection profile; it must also leave the hand tool.
    const action = viewKeyboard.resolve(event.nativeEvent);
    if (action === "select") viewport.setHand(false);
    if (event.defaultPrevented) return;
    const tool = toolKeyboard.resolve(event.nativeEvent);
    if (tool && (!props.creationTools || props.creationTools.includes(tool))) { event.preventDefault(); chooseTool(tool); return; }
    if (!props.workspace || props.navigation === "fixed") return;
    if (!action) return;
    event.preventDefault();
    if (action === "hand") chooseHand();
    else if (action === "select") chooseTool("select");
    else if (action === "fit") viewport.fit();
    else viewport.fitSelection(hand.selection.keys);
  };
  const selectedKeys = new Set(hand.selection.keys);
  const copyOriginals = new Map(hand.copyOriginals.map((object) => [object.id, object]));
  const canvasSurface = (
      <svg ref={hand.surface} {...hand.surfaceProps} {...viewport.events} onLostPointerCapture={event => { viewport.events.onLostPointerCapture?.(event); hand.surfaceProps.onLostPointerCapture(event); }} onPointerDownCapture={event => {viewport.events.onPointerDownCapture?.(event); if(editingObject && !(event.target as Element).closest("[data-canvas-sheet]")) setEditingObject(null);}} tabIndex={0} role="group" aria-label={props.label ?? "Canvas slide"}
        aria-busy={hand.pastePending}
        data-canvas-slide="true" data-tool={hand.tool} data-canvas-mode={viewport.panning ? "hand" : hand.tool} viewBox={props.screenOverlay ? `0 0 ${Math.max(1, props.screenOverlay.width)} ${Math.max(1, props.screenOverlay.height)}` : props.workspace ? viewport.viewBox : `0 0 ${hand.document.width} ${hand.document.height}`} preserveAspectRatio="none"
        style={{ display: "block", width: "100%", aspectRatio: `${hand.document.width} / ${hand.document.height}`, touchAction: "none", userSelect: "none", overflow: "hidden", cursor: viewport.cursor ?? (hand.tool === "select" ? "default" : hand.tool === "text" ? "text" : "crosshair"), ...props.slideStyle, ...(props.workspace ? { height: "100%", aspectRatio: "auto" } : {}), ...(props.screenOverlay ? { position: "absolute", left: 0, top: 0, width: Math.max(1, props.screenOverlay.width), height: Math.max(1, props.screenOverlay.height), aspectRatio: "auto", overflow: "visible", zIndex: 1 } : {}) }}>
        {hand.objects.map((object) => <g key={object.id} data-canvas-copy-original={copyOriginals.has(object.id) ? object.id : undefined}>
          <CanvasObjectView object={copyOriginals.get(object.id) ?? object} hideText={hand.draft?.id === object.id} renderEmbedded={renderEmbedded} />
          <CanvasObjectTarget object={object} selected={selectedKeys.has(object.id)} enabled={!viewport.panning && hand.tool === "select" && hand.draft?.id !== object.id && editingObject !== object.id}
            copying={hand.copyOriginals.length > 0 && selectedKeys.has(object.id)}
            onSelect={(shiftKey) => {setEditingObject(null);hand.select(object.id, shiftKey);}} onEdit={() => editObject(object)} onHandle={(interaction, event) => hand.interaction(interaction, event, object, "drag")} />
        </g>)}
        {copyOriginals.size > 0 && <g data-canvas-copy-preview="" pointerEvents="none">{hand.objects.filter((object) => copyOriginals.has(object.id)).map((object) => <CanvasObjectView key={object.id} object={object} renderEmbedded={renderEmbedded} />)}</g>}
        {hand.preview && <g data-canvas-preview="" pointerEvents="none" opacity={0.65}><CanvasObjectView object={{ ...hand.preview, id: "preview" }} renderEmbedded={renderEmbedded} /></g>}
        {hand.tool === "select" && hand.objects.filter((object) => selectedKeys.has(object.id)).map((object) =>
          <rect key={object.id} data-selection-outline={object.id} x={object.x} y={object.y} width={object.width} height={object.height} fill="none" stroke="rgb(var(--color-border-accent))" strokeWidth={object.id === selected?.id ? 2 : 1} pointerEvents="none" />)}
        {selected && !viewport.panning && hand.tool === "select" && <g>
          {!hand.draft && !editingObject && (selected.kind === "text" ? ["e", "w"] as const : ["n", "e", "s", "w", "nw", "ne", "se", "sw"] as const).map((edge) => <CanvasResizeTarget key={edge} object={selected} edge={edge} {...(selected.kind === "text" ? { onAutoWidth: () => hand.autoWidth(selected.id) } : {})} onHandle={(interaction, event) => hand.interaction(interaction, event, selected, "resize", edge)} />)}
        </g>}
        {hand.marquee && <rect data-canvas-marquee="" {...hand.marquee} fill="rgb(var(--color-border-accent) / 0.08)" stroke="rgb(var(--color-border-accent))" pointerEvents="none" />}
        {selected && hand.draft?.id === selected.id && <CanvasTextInput object={selected} text={hand.draft.text} onChange={hand.changeText}
          onCommit={() => { hand.commitText(); hand.surface.current?.focus({ preventScroll: true }); }} onCancel={() => { hand.cancel(); hand.surface.current?.focus({ preventScroll: true }); }} />}
      </svg>
  );
  if (props.screenOverlay) return canvasSurface;
  return (
    <ProductShell onKeyDown={keyDown} className={props.className} fill={props.workspace ?? false} data-canvas-workspace={props.workspace || undefined} toolbarPresentation={props.workspace ? "floating" : "attached"} {...(props.workspace ? { canvasClassName: "canvas-workspace-surface" } : {})} toolbarLabel="Canvas tools" toolbar={<ToolbarGroup style={{ flexWrap: "wrap" }}>
      <ToolbarGroup>{props.toolbarContent}{tools.filter(tool => !props.creationTools || props.creationTools.includes(tool.id)).map((tool) => <Toggle key={tool.id} label={tool.label} tooltip={`${tool.label} (${tool.shortcut.replace("-", "+")})`} aria-keyshortcuts={tool.shortcut.replace("-", "+")} pressed={!viewport.panning && hand.tool === tool.id} onClick={() => chooseTool(tool.id)}><tool.icon aria-hidden="true" size={16} /></Toggle>)}</ToolbarGroup>
      {props.workspace && props.navigation !== "fixed" && <ToolbarGroup>
        <Toggle label="화면 이동" tooltip="화면 이동 (H · Space 누르기)" aria-keyshortcuts="H" pressed={viewport.panning} onClick={() => { if (viewport.hand) chooseTool("select"); else chooseHand(); }}><Hand aria-hidden="true" size={16} /></Toggle>
        <Command label="축소" onClick={() => viewport.zoom(1 / 1.2)}><Minus aria-hidden="true" size={16} /></Command>
        <Command label="배율 100%" onClick={() => viewport.zoom(1 / viewport.scale)}>{Math.round(viewport.scale * 100)}%</Command>
        <Command label="확대" onClick={() => viewport.zoom(1.2)}><Plus aria-hidden="true" size={16} /></Command>
        <Command label="전체 보기" aria-keyshortcuts="Shift+1" onClick={viewport.fit}><Maximize aria-hidden="true" size={16} /></Command>
      </ToolbarGroup>}
      <ToolbarGroup>
        <CanvasEditingCommands editor={props.editor} objectIds={props.objectIds} onUndo={() => hand.history("undo")} onRedo={() => hand.history("redo")} onDuplicate={() => hand.duplicate()} onRemove={hand.remove} />
      </ToolbarGroup>
      {props.documentControls !== false && <Command label="JSON" onClick={() => { hand.commitText(); hand.cancel(); setJSON(json === null ? serializeCanvasDocument(props.editor.snapshot.value as typeof hand.document) : null); }}><Braces aria-hidden="true" size={16} /></Command>}
    </ToolbarGroup>}>
      {canvasSurface}
      {props.contentToolbar !== false && hand.tool === "select" && !viewport.panning && <CanvasContentToolbar hand={hand} targetId={hand.selection.primaryKey} geometryKey={viewport.viewBox} />}
      {hand.pastePending && <p role="status">붙여넣는 중… Escape로 취소</p>}
      {hand.error && <p role="alert">{hand.error}</p>}
      {json !== null && <section aria-label="Canvas JSON" className={props.workspace ? "canvas-workspace-json" : undefined}>
        <Field multiline label="Canvas JSON document" value={json} onValueChange={setJSON} rows={10} spellCheck={false} style={{ width: "100%", fontFamily: "monospace" }} />
        <Command onClick={() => setJSON(serializeCanvasDocument(hand.document))}>현재 문서 읽기</Command>
        <Command onClick={() => { if (hand.openJSON(json)) setJSON(null); }}>JSON 열기</Command>
      </section>}
    </ProductShell>
  );
}
