import { useEffect, useMemo, useReducer, useRef, useState, type ClipboardEvent, type KeyboardEvent, type PointerEvent } from "react";
import { commitAffordance, createGestureSession, createPlaneSelectProfile, resizeAffordance, type InteractionHandleEvent, type PlaneSelectProfile, type PlaneSelectSelection, type ResizeEdge } from "@interactive-os/json-document-affordance";
import { assertCanvasDocument, createCanvasObject, createCanvasPath, parseCanvasDocument, transformObject, type CanvasDocument, type CanvasObject, type CanvasObjectKind, type ObjectPoint } from "@interactive-os/json-document-object-document";
import type { EditingResult, ObjectEditor, ObjectIntent, ObjectSelection } from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { createWebKeyboardAdapter, createWebPointerSession, isWebEditableTarget, projectWebClientPointToSVG, webSVGViewportFromElement } from "@interactive-os/json-document-web";
import { createCanvasClipboardBinding } from "./canvas-clipboard.js";

export type CanvasTool = "select" | Exclude<CanvasObjectKind, "image">;
export interface CanvasCreationStyle {
  readonly color: string;
  readonly textColor: string;
  readonly fontSize: number;
  readonly strokeWidth: number;
}

type Gesture = { readonly base: CanvasDocument } & (
  | { readonly type: "create"; readonly tool: Exclude<CanvasObjectKind, "path" | "image">; readonly start: ObjectPoint; readonly point: ObjectPoint; readonly dragged: boolean }
  | { readonly type: "draw"; readonly points: ReadonlyArray<ObjectPoint> }
  | { readonly type: "resize"; readonly object: CanvasObject; readonly start: ObjectPoint; readonly point: ObjectPoint; readonly edge: ResizeEdge;
      readonly pointerId: number; readonly shiftKey: boolean; readonly altKey: boolean; readonly selection: ObjectSelection }
);
type TextDraft = { readonly id: string; readonly text: string; readonly base: CanvasDocument };

const keyboard = createWebKeyboardAdapter();
const commands = createWebKeyboardAdapter<"cancel">({ defaults: false, keymap: { Escape: "cancel" } });

/** Owns Canvas interaction composition, never document or history state. */
export function useCanvasHand(editor: ObjectEditor, style: CanvasCreationStyle, selectProfile?: PlaneSelectProfile) {
  const snapshot = useEditingSnapshot(editor);
  const document = useMemo(() => { assertCanvasDocument(snapshot.value); return snapshot.value; }, [snapshot.value]);
  const surface = useRef<SVGSVGElement>(null);
  const [, redraw] = useReducer((value: number) => value + 1, 0);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [error, setError] = useState<string | null>(null);
  const draft = useRef<TextDraft | null>(null);
  const selecting = useRef<{ readonly base: CanvasDocument; readonly selection: ObjectSelection; readonly pointerId: number; readonly key: string | null } | null>(null);
  const profile = useMemo(() => selectProfile ?? createPlaneSelectProfile(), [editor, selectProfile]);
  const clipboard = useMemo(() => createCanvasClipboardBinding(editor, { textColor: style.textColor, fontSize: style.fontSize }, {
    onResult(result) { setError(result.ok ? null : result.reason ?? result.code ?? null); if (result.ok) setTool("select"); },
    onPendingChange: redraw,
  }), [editor, style.textColor, style.fontSize]);
  const gestures = useMemo(() => createGestureSession<Gesture>({ onBegin: redraw, onPreview: redraw, onCommit: redraw, onCancel: redraw }), [editor]);
  const pointer = useMemo(() => createWebPointerSession<true>({ onCancel: (_, reason) => {
    gestures.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel");
    profile.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel"); selecting.current = null; redraw();
  } }), [gestures, profile]);

  function current(): CanvasDocument {
    const value = editor.snapshot.value;
    assertCanvasDocument(value);
    return value;
  }

  function cancelInteraction() {
    const active = pointer.getSnapshot();
    if (active) pointer.cancel(active.pointerId);
    gestures.cancel();
    profile.cancel(); selecting.current = null;
    draft.current = null;
    redraw();
  }

  function cancel() { clipboard.cancel(); cancelInteraction(); }

  useEffect(() => {
    // A replacement/external edit invalidates previews, even when an ID survives.
    const release = editor.subscribe((next) => {
      const active = gestures.getActive();
      if ((active && (active.base !== next.value || (active.type === "resize" && active.selection !== next.selection)))
        || (selecting.current && (selecting.current.base !== next.value || selecting.current.selection !== next.selection))
        || (draft.current && draft.current.base !== next.value)) cancel();
    });
    return () => {
      release();
      clipboard.cancel();
      const active = pointer.getSnapshot();
      if (active) pointer.cancel(active.pointerId);
      gestures.cancel();
      profile.cancel(); selecting.current = null;
      draft.current = null;
    };
  }, [editor, gestures, pointer, profile, clipboard]);

  function report(result: EditingResult<ObjectSelection>) {
    setError(result.ok ? null : result.reason ?? result.code);
    return result;
  }

  function dispatch(intent: ObjectIntent) { return report(editor.dispatch(intent)); }
  function selectContext() { return { items: current().objects, selection: editor.snapshot.selection }; }
  function applySelection(selection: PlaneSelectSelection) {
    return dispatch({ type: "selection.set", objectIds: selection.keys, ...(selection.primaryKey === null ? {} : { primaryKey: selection.primaryKey }) });
  }
  function select(id: string | null, shiftKey = false) { cancel(); applySelection(profile.select(selectContext(), id, shiftKey)); }

  function beginSelect(point: ObjectPoint, key: string | null, event: { readonly pointerId: number; readonly shiftKey: boolean; readonly altKey: boolean }) {
    selecting.current = { base: current(), selection: editor.snapshot.selection, pointerId: event.pointerId, key };
    profile.begin(selectContext(), { point, hitKey: key, shiftKey: event.shiftKey, altKey: event.altKey }); redraw();
  }

  function commitSelect(point: ObjectPoint, modifiers: { readonly shiftKey: boolean; readonly altKey: boolean }) {
    const base = selecting.current?.base;
    selecting.current = null;
    const result = profile.commit(point, modifiers); redraw();
    if (!result || base !== current()) return;
    if (!applySelection(result.selection).ok || !result.translation) return;
    const { keys, dx, dy, operation } = result.translation;
    dispatch(operation === "copy"
      ? { type: "object.duplicate", objectIds: keys, placement: { type: "offset", dx, dy } }
      : { type: "object.translate", objectIds: keys, dx, dy });
  }

  function editText(id: string) {
    const base = current();
    const object = base.objects.find((item) => item.id === id);
    if (object?.kind !== "text") return;
    cancel();
    if (editor.snapshot.selection.primaryKey !== id) applySelection(profile.select(selectContext(), id));
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

  function createPreview(gesture: Extract<Gesture, { type: "create" | "draw" }>, committing = false) {
    if (gesture.type === "draw") return gesture.points.length < 2 ? null : createCanvasPath(gesture.points, { color: style.textColor, label: "Drawing", strokeWidth: style.strokeWidth });
    const { start, point } = gesture;
    const click = !gesture.dragged;
    // A default-sized object belongs to the completed click, never its press preview.
    if (click && !committing) return null;
    if (!click && start.x === point.x && start.y === point.y) return null;
    return createCanvasObject(gesture.tool, {
      x: click ? start.x : Math.min(start.x, point.x), y: click ? start.y : Math.min(start.y, point.y),
      width: click ? (gesture.tool === "text" ? 280 : 160) : Math.abs(point.x - start.x),
      height: click ? (gesture.tool === "text" ? 64 : 100) : Math.abs(point.y - start.y),
    }, { color: gesture.tool === "text" ? style.textColor : style.color, label: gesture.tool === "text" ? "Text" : "", fontSize: style.fontSize });
  }

  function transform(gesture: Extract<Gesture, { type: "resize" }>) {
    const result = commitAffordance(resizeAffordance(gesture.start, gesture.point, gesture.edge, gesture, gesture.object));
    const hand = result?.hand;
    return hand?.type === "resize" ? hand : { dx: 0, dy: 0 };
  }

  function commitGesture() {
    const active = gestures.commit();
    if (!active || active.base !== current()) return;
    if (active.type === "create" || active.type === "draw") {
      const object = createPreview(active, true);
      if (!object) return;
      const result = dispatch({ type: "object.create", object });
      if (result.ok) {
        setTool("select");
        const id = result.snapshot.selection.primaryKey;
        if (active.type === "create" && active.tool === "text" && id) editText(id);
      }
    } else {
      const delta = transform(active);
      if ("dw" in delta) dispatch({ type: "object.resize", objectIds: [active.object.id], dx: delta.dx, dy: delta.dy, dw: delta.dw, dh: delta.dh });
    }
  }

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || isWebEditableTarget(event.target)) return;
    if (tool === "select" && (event.target as Element).closest("[data-canvas-object]")) return;
    const point = eventPoint(event);
    if (!point) return;
    event.preventDefault();
    commitText(); cancel(); surface.current?.focus();
    pointer.begin(event.currentTarget, event.pointerId, true);
    if (tool === "select") { beginSelect(point, null, event); return; }
    const base = current();
    gestures.begin(tool === "path" ? { type: "draw", points: [point], base } : { type: "create", tool, start: point, point, dragged: false, base });
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    if (pointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const point = eventPoint(event), active = gestures.getActive();
    if (point && selecting.current) { profile.preview(point, event); redraw(); return; }
    if (!point || !active) return;
    if (active.type === "draw") {
      const last = active.points.at(-1)!;
      if (last.x !== point.x || last.y !== point.y) gestures.preview({ ...active, points: [...active.points, point] });
    } else if (active.type === "create") {
      gestures.preview({ ...active, point, dragged: active.dragged || Math.hypot(point.x - active.start.x, point.y - active.start.y) >= 3 });
    } else gestures.preview({ ...active, point });
  }

  function interaction(interaction: InteractionHandleEvent, event: PointerEvent<SVGElement>, object: CanvasObject, type: "drag" | "resize", edge: ResizeEdge = "se") {
    if (interaction.phase === "cancel") {
      if (type === "drag" && selecting.current?.key === object.id && selecting.current.pointerId === event.pointerId) { profile.cancel("pointer-cancel"); selecting.current = null; redraw(); }
      else if (type === "resize") {
        const active = gestures.getActive();
        if (active?.type === "resize" && active.pointerId === event.pointerId && active.edge === edge && active.object.id === object.id) gestures.cancel("pointer-cancel");
      }
      return;
    }
    const point = eventPoint(event);
    if (!point) return;
    if (interaction.phase === "start") {
      commitText(); cancel(); surface.current?.focus();
      if (type === "drag") { beginSelect(point, object.id, event); return; }
      const latest = current().objects.find((item) => item.id === object.id);
      if (latest) gestures.begin({ type, object: latest, start: point, point, edge, base: current(), selection: editor.snapshot.selection,
        pointerId: event.pointerId, shiftKey: event.shiftKey, altKey: event.altKey });
    } else {
      if (type === "drag") {
        if (selecting.current?.key !== object.id || selecting.current.pointerId !== event.pointerId) return;
        if (interaction.phase === "commit") commitSelect(point, event); else { profile.preview(point, event); redraw(); }
        return;
      }
      const active = gestures.getActive();
      if (!active || active.type !== type || active.object.id !== object.id || active.pointerId !== event.pointerId || active.edge !== edge) return;
      gestures.preview({ ...active, point, shiftKey: event.shiftKey, altKey: event.altKey });
      if (interaction.phase === "commit") commitGesture();
    }
  }

  function remove() { commitText(); cancel(); dispatch({ type: "selection.remove" }); surface.current?.focus(); }
  function duplicate(keys = editor.snapshot.selection.keys) { commitText(); cancel(); dispatch({ type: "object.duplicate", objectIds: keys }); surface.current?.focus(); }
  function history(direction: "undo" | "redo") { commitText(); cancel(); report(editor[direction]()); surface.current?.focus(); }

  function handleClipboard(operation: "copy" | "cut" | "paste", event: ClipboardEvent) {
    if (isWebEditableTarget(event.target)) return;
    cancelInteraction();
    setError(null);
    void clipboard[operation](event);
  }

  function updateModifiers(event: KeyboardEvent) {
    if (event.nativeEvent.isComposing || isWebEditableTarget(event.target)) return;
    if (profile.updateModifiers(event)) redraw();
    const active = gestures.getActive();
    if (active?.type === "resize" && (active.shiftKey !== event.shiftKey || active.altKey !== event.altKey)) {
      gestures.preview({ ...active, shiftKey: event.shiftKey, altKey: event.altKey });
    }
  }

  function keyDown(event: KeyboardEvent) {
    if (event.nativeEvent.isComposing || isWebEditableTarget(event.target)) return;
    updateModifiers(event);
    const selectedAction = profile.keyDown(event, selectContext(), gestures.getActive() !== null || draft.current !== null || clipboard.pending);
    if (selectedAction) {
      event.preventDefault();
      cancel();
      if (selectedAction.type === "selection") applySelection(selectedAction.selection);
      else if (selectedAction.type === "delete") remove();
      else if (selectedAction.type === "duplicate") duplicate(selectedAction.keys);
      else if (selectedAction.type === "translate") dispatch({ type: "object.translate", objectIds: selectedAction.keys, dx: selectedAction.dx, dy: selectedAction.dy });
      else if (selectedAction.type === "edit") editText(selectedAction.key);
      setTool("select"); return;
    }
    if (commands.resolve(event) === "cancel") { event.preventDefault(); setTool("select"); return; }
    const action = keyboard.resolve(event);
    if (action?.type === "undo" || action?.type === "redo") { event.preventDefault(); history(action.type); }
  }

  const gesture = gestures.getActive();
  const selectionPreview = profile.getPreview();
  const translation = selectionPreview?.translation;
  const translating = new Set(translation?.keys);
  const selection = selectionPreview?.selection ?? snapshot.selection;
  const objects = document.objects.map((object) => {
    if (translation && translating.has(object.id)) return transformObject(object, translation);
    return gesture?.type === "resize" && gesture.object.id === object.id ? transformObject(object, transform(gesture)) : object;
  });
  const copyOriginals = translation?.operation === "copy" ? document.objects.filter((object) => translating.has(object.id)) : [];
  const preview = gesture && (gesture.type === "create" || gesture.type === "draw") ? createPreview(gesture) : null;

  return {
    document, snapshot, selection, marquee: selectionPreview?.marquee ?? null, objects, copyOriginals, preview, surface, tool, error, pastePending: clipboard.pending, draft: draft.current,
    choose, select, interaction, editText, commitText, cancel, remove, duplicate, history,
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
      onPointerUp(event: PointerEvent<SVGSVGElement>) {
        pointerMove(event);
        if (pointer.commit(event.pointerId) === null) return;
        const point = eventPoint(event);
        if (selecting.current && point) commitSelect(point, event); else commitGesture();
      },
      onPointerCancel(event: PointerEvent<SVGSVGElement>) { pointer.cancel(event.pointerId); },
      onLostPointerCapture(event: PointerEvent<SVGSVGElement>) { pointer.cancel(event.pointerId, "lost-capture"); },
      onKeyDown: keyDown, onKeyUp: updateModifiers,
      onCopy: (event: ClipboardEvent) => handleClipboard("copy", event),
      onCut: (event: ClipboardEvent) => handleClipboard("cut", event),
      onPaste: (event: ClipboardEvent) => handleClipboard("paste", event),
    },
  };
}
