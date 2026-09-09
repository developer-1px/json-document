import { useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createGestureSession, dragAffordance, resizeAffordance, type InteractionHandleEvent, type ResizeEdge } from "@interactive-os/json-document-affordance";
import { assertCanvasDocument, createCanvasObject, createCanvasPath, parseCanvasDocument, transformObject, type CanvasDocument, type CanvasObject, type CanvasObjectKind, type ObjectPoint } from "@interactive-os/json-document-object-document";
import type { EditingResult, ObjectEditor, ObjectIntent, ObjectSelection } from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { createWebKeyboardAdapter, createWebPointerSession, isWebEditableTarget, projectWebClientPointToSVG, webSVGViewportFromElement } from "@interactive-os/json-document-web";

export type CanvasTool = "select" | CanvasObjectKind;
export interface CanvasCreationStyle {
  readonly color: string;
  readonly textColor: string;
  readonly fontSize: number;
  readonly strokeWidth: number;
}

type Gesture = { readonly base: CanvasDocument } & (
  | { readonly type: "create"; readonly tool: Exclude<CanvasObjectKind, "path">; readonly start: ObjectPoint; readonly point: ObjectPoint }
  | { readonly type: "draw"; readonly points: ReadonlyArray<ObjectPoint> }
  | { readonly type: "drag" | "resize"; readonly object: CanvasObject; readonly start: ObjectPoint; readonly point: ObjectPoint; readonly edge: ResizeEdge }
);
type TextDraft = { readonly id: string; readonly text: string; readonly base: CanvasDocument };

const keyboard = createWebKeyboardAdapter();
const commands = createWebKeyboardAdapter<"cancel" | "edit">({ defaults: false, keymap: { Escape: "cancel", Enter: "edit", F2: "edit" } });

/** Owns Canvas interaction composition, never document or history state. */
export function useCanvasHand(editor: ObjectEditor, style: CanvasCreationStyle) {
  const snapshot = useEditingSnapshot(editor);
  const document = useMemo(() => { assertCanvasDocument(snapshot.value); return snapshot.value; }, [snapshot.value]);
  const surface = useRef<SVGSVGElement>(null);
  const [, redraw] = useReducer((value: number) => value + 1, 0);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [error, setError] = useState<string | null>(null);
  const draft = useRef<TextDraft | null>(null);
  const gestures = useMemo(() => createGestureSession<Gesture>({ onBegin: redraw, onPreview: redraw, onCommit: redraw, onCancel: redraw }), [editor]);
  const pointer = useMemo(() => createWebPointerSession<true>({ onCancel: (_, reason) => gestures.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel") }), [gestures]);

  function current(): CanvasDocument {
    const value = editor.snapshot.value;
    assertCanvasDocument(value);
    return value;
  }

  function cancel() {
    const active = pointer.getSnapshot();
    if (active) pointer.cancel(active.pointerId);
    gestures.cancel();
    draft.current = null;
    redraw();
  }

  useEffect(() => {
    // A replacement/external edit invalidates previews, even when an ID survives.
    const release = editor.subscribe((next) => {
      if ((gestures.getActive() && gestures.getActive()!.base !== next.value) || (draft.current && draft.current.base !== next.value)) cancel();
    });
    return () => {
      release();
      const active = pointer.getSnapshot();
      if (active) pointer.cancel(active.pointerId);
      gestures.cancel();
      draft.current = null;
    };
  }, [editor, gestures, pointer]);

  function report(result: EditingResult<ObjectSelection>) {
    setError(result.ok ? null : result.reason ?? result.code);
    return result;
  }

  function dispatch(intent: ObjectIntent) { return report(editor.dispatch(intent)); }
  function select(id: string | null) { dispatch({ type: "selection.set", objectIds: id === null ? [] : [id], mode: "replace" }); }

  function editText(id: string) {
    const base = current();
    const object = base.objects.find((item) => item.id === id);
    if (object?.kind !== "text") return;
    cancel(); select(id);
    draft.current = { id, text: object.label, base };
    redraw();
  }

  function commitText() {
    const active = draft.current;
    if (!active) return;
    draft.current = null;
    if (active.base === current()) dispatch({ type: "object.text", objectId: active.id, text: active.text });
    redraw();
  }

  function choose(next: CanvasTool) {
    commitText(); cancel(); setTool(next); setError(null);
    surface.current?.focus();
  }

  function eventPoint(event: { readonly clientX: number; readonly clientY: number }): ObjectPoint | null {
    if (!surface.current) return null;
    const point = projectWebClientPointToSVG({ x: event.clientX, y: event.clientY }, webSVGViewportFromElement(surface.current));
    return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
  }

  function createPreview(gesture: Extract<Gesture, { type: "create" | "draw" }>) {
    if (gesture.type === "draw") return gesture.points.length < 2 ? null : createCanvasPath(gesture.points, { color: style.textColor, label: "Drawing", strokeWidth: style.strokeWidth });
    const { start, point } = gesture;
    const click = Math.hypot(point.x - start.x, point.y - start.y) < 3;
    return createCanvasObject(gesture.tool, {
      x: Math.min(start.x, point.x), y: Math.min(start.y, point.y),
      width: click ? (gesture.tool === "text" ? 280 : 160) : Math.abs(point.x - start.x),
      height: click ? (gesture.tool === "text" ? 64 : 100) : Math.abs(point.y - start.y),
    }, { color: gesture.tool === "text" ? style.textColor : style.color, label: gesture.tool === "text" ? "Text" : "", fontSize: style.fontSize });
  }

  function transform(gesture: Extract<Gesture, { type: "drag" | "resize" }>) {
    const result = gesture.type === "drag" ? dragAffordance(gesture.start, gesture.point) : resizeAffordance(gesture.start, gesture.point, gesture.edge);
    const hand = result.hand;
    return hand?.type === "translate" || hand?.type === "resize" ? hand : { dx: 0, dy: 0 };
  }

  function commitGesture() {
    const active = gestures.commit();
    if (!active || active.base !== current()) return;
    if (active.type === "create" || active.type === "draw") {
      const object = createPreview(active);
      if (!object) return;
      const result = dispatch({ type: "object.create", object });
      if (result.ok) {
        setTool("select");
        const id = result.snapshot.selection.primaryKey;
        if (active.type === "create" && active.tool === "text" && id) editText(id);
      }
    } else {
      const delta = transform(active);
      dispatch(active.type === "drag"
        ? { type: "object.translate", objectIds: [active.object.id], dx: delta.dx, dy: delta.dy }
        : { type: "object.resize", objectIds: [active.object.id], dx: delta.dx, dy: delta.dy, dw: "dw" in delta ? delta.dw : 0, dh: "dh" in delta ? delta.dh : 0 });
    }
  }

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || isWebEditableTarget(event.target)) return;
    if (tool === "select" && (event.target as Element).closest("[data-canvas-object]")) return;
    const point = eventPoint(event);
    if (!point) return;
    event.preventDefault();
    commitText(); cancel(); surface.current?.focus();
    if (tool === "select") { select(null); return; }
    pointer.begin(event.currentTarget, event.pointerId, true);
    const base = current();
    gestures.begin(tool === "path" ? { type: "draw", points: [point], base } : { type: "create", tool, start: point, point, base });
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    if (pointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const point = eventPoint(event), active = gestures.getActive();
    if (!point || !active) return;
    if (active.type === "draw") {
      const last = active.points.at(-1)!;
      if (last.x !== point.x || last.y !== point.y) gestures.preview({ ...active, points: [...active.points, point] });
    } else gestures.preview({ ...active, point });
  }

  function interaction(interaction: InteractionHandleEvent, event: PointerEvent<SVGElement>, object: CanvasObject, type: "drag" | "resize", edge: ResizeEdge = "se") {
    if (interaction.phase === "cancel") { gestures.cancel("pointer-cancel"); return; }
    const point = eventPoint(event);
    if (!point) return;
    if (interaction.phase === "start") {
      commitText(); cancel(); surface.current?.focus(); select(object.id);
      const latest = current().objects.find((item) => item.id === object.id);
      if (latest) gestures.begin({ type, object: latest, start: point, point, edge, base: current() });
    } else {
      const active = gestures.getActive();
      if (!active || active.type !== type || active.object.id !== object.id) return;
      gestures.preview({ ...active, point });
      if (interaction.phase === "commit") commitGesture();
    }
  }

  function remove() { commitText(); cancel(); dispatch({ type: "selection.remove" }); surface.current?.focus(); }
  function history(direction: "undo" | "redo") { commitText(); cancel(); report(editor[direction]()); surface.current?.focus(); }

  function keyDown(event: KeyboardEvent) {
    if (event.nativeEvent.isComposing || isWebEditableTarget(event.target)) return;
    const command = commands.resolve(event);
    if (command === "cancel") {
      event.preventDefault();
      if (gestures.getActive() || draft.current) cancel(); else select(null);
      setTool("select"); return;
    }
    if (command === "edit" && editor.snapshot.selection.primaryKey) {
      event.preventDefault(); editText(editor.snapshot.selection.primaryKey); return;
    }
    const action = keyboard.resolve(event);
    if (action?.type === "delete" && editor.snapshot.selection.keys.length) { event.preventDefault(); remove(); }
    if (action?.type === "undo" || action?.type === "redo") { event.preventDefault(); history(action.type); }
  }

  const gesture = gestures.getActive();
  const objects = document.objects.map((object) => gesture && (gesture.type === "drag" || gesture.type === "resize") && gesture.object.id === object.id ? transformObject(object, transform(gesture)) : object);
  const preview = gesture && (gesture.type === "create" || gesture.type === "draw") ? createPreview(gesture) : null;

  return {
    document, snapshot, objects, preview, surface, tool, error, draft: draft.current,
    choose, select, interaction, editText, commitText, cancel, remove, history,
    changeText(text: string) { if (draft.current) { draft.current = { ...draft.current, text }; redraw(); } },
    openJSON(json: string) {
      try {
        const document = parseCanvasDocument(json);
        cancel();
        const result = dispatch({ type: "document.replace", document });
        if (result.ok) setTool("select");
        return result.ok;
      } catch (error) { setError(error instanceof Error ? error.message : String(error)); return false; }
    },
    surfaceProps: {
      onPointerDown: pointerDown, onPointerMove: pointerMove,
      onPointerUp(event: PointerEvent<SVGSVGElement>) { pointerMove(event); if (pointer.commit(event.pointerId) !== null) commitGesture(); },
      onPointerCancel(event: PointerEvent<SVGSVGElement>) { pointer.cancel(event.pointerId); },
      onLostPointerCapture(event: PointerEvent<SVGSVGElement>) { pointer.cancel(event.pointerId, "lost-capture"); },
      onKeyDown: keyDown,
    },
  };
}
