import { useEffect, useRef, useState, type RefObject, type PointerEvent, type KeyboardEvent } from "react";
import { createWebPointerSession, isWebEditableTarget, isWebComposingKey } from "@interactive-os/json-document-web";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";

type View = { x: number; y: number; scale: number };
/** View-only navigation; never writes document geometry, selection, or history. */
export function useCanvasViewport(surface: RefObject<SVGSVGElement | null>, document: CanvasDocument, enabled: boolean) {
  const [size, setSize] = useState({ width: document.width, height: document.height });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [hand, setHand] = useState(false);
  const [space, setSpace] = useState(false);
  const [dragging, setDragging] = useState(false);
  const state = useRef({ size, view, document });
  state.current = { size, view, document };
  const [pointer] = useState(() => createWebPointerSession<{ x: number; y: number; view: View }>());
  const fitBounds = (left: number, top: number, right: number, bottom: number) => {
    const { size } = state.current;
    const scale = Math.max(0.05, Math.min(8, (size.width - 64) / Math.max(1, right - left), (size.height - 160) / Math.max(1, bottom - top)));
    setView({ x: (left + right - size.width / scale) / 2, y: (top + bottom - size.height / scale) / 2, scale });
  };
  const fit = () => {
    const { document } = state.current;
    fitBounds(Math.min(0, ...document.objects.map(o => o.x)), Math.min(0, ...document.objects.map(o => o.y)),
      Math.max(document.width, ...document.objects.map(o => o.x + o.width)), Math.max(document.height, ...document.objects.map(o => o.y + o.height)));
  };
  const fitSelection = (ids: readonly string[]) => {
    const objects = state.current.document.objects.filter(object => ids.includes(object.id));
    if (!objects.length) return;
    fitBounds(Math.min(...objects.map(o => o.x)), Math.min(...objects.map(o => o.y)),
      Math.max(...objects.map(o => o.x + o.width)), Math.max(...objects.map(o => o.y + o.height)));
  };
  const zoom = (factor: number, at = { x: state.current.size.width / 2, y: state.current.size.height / 2 }) => {
    setView(current => {
      const scale = Math.max(0.05, Math.min(8, current.scale * factor));
      return { x: current.x + at.x / current.scale - at.x / scale, y: current.y + at.y / current.scale - at.y / scale, scale };
    });
  };
  useEffect(() => {
    const svg = surface.current;
    if (!enabled || !svg) return;
    let initial = true;
    const measure = () => {
      const { width, height } = svg.getBoundingClientRect();
      if (!width || !height) return;
      state.current.size = { width, height };
      setSize({ width, height });
      if (initial) { fit(); initial = false; }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    const wheel = (event: WheelEvent) => {
      if (isWebEditableTarget(event.target)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? state.current.size.height : 1;
      if (event.ctrlKey || event.metaKey) {
        const rect = svg.getBoundingClientRect();
        zoom(Math.exp(-event.deltaY * unit * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top });
      } else setView(current => ({ ...current, x: current.x + event.deltaX * unit / current.scale, y: current.y + event.deltaY * unit / current.scale }));
    };
    const release = () => { setSpace(false); setDragging(false); const active = pointer.getSnapshot(); if (active) pointer.cancel(active.pointerId); };
    svg.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", release);
    return () => { observer.disconnect(); svg.removeEventListener("wheel", wheel); window.removeEventListener("blur", release); release(); };
  }, [enabled, surface, pointer]);
  const end = (event: PointerEvent<SVGSVGElement>, cancel = false) => {
    if (!pointer.getSnapshot()) return;
    event.stopPropagation();
    setDragging(false);
    if (cancel) pointer.cancel(event.pointerId); else pointer.commit(event.pointerId);
  };
  return {
    hand, setHand, fit, fitSelection, zoom, scale: view.scale,
    viewBox: `${view.x} ${view.y} ${size.width / view.scale} ${size.height / view.scale}`,
    panning: hand || space || dragging,
    cursor: dragging ? "grabbing" : hand || space ? "grab" : undefined,
    events: enabled ? {
      onPointerDownCapture(event: PointerEvent<SVGSVGElement>) {
        if (isWebEditableTarget(event.target) || !(event.button === 1 || event.button === 0 && (hand || space))) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
        pointer.begin(event.currentTarget, event.pointerId, { x: event.clientX, y: event.clientY, view: state.current.view });
        setDragging(true);
      },
      onPointerMoveCapture(event: PointerEvent<SVGSVGElement>) {
        const active = pointer.getSnapshot();
        if (!active || active.pointerId !== event.pointerId) return;
        event.stopPropagation();
        const base = active.state;
        setView({ ...base.view, x: base.view.x - (event.clientX - base.x) / base.view.scale, y: base.view.y - (event.clientY - base.y) / base.view.scale });
      },
      onPointerUpCapture: (event: PointerEvent<SVGSVGElement>) => end(event),
      onPointerCancelCapture: (event: PointerEvent<SVGSVGElement>) => end(event, true),
      onLostPointerCapture: (event: PointerEvent<SVGSVGElement>) => end(event, true),
      onKeyDownCapture(event: KeyboardEvent<SVGSVGElement>) {
        if (isWebComposingKey(event.nativeEvent) || isWebEditableTarget(event.target)) return;
        if (event.code === "Space" && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); event.stopPropagation(); setSpace(true); }
      },
      onKeyUpCapture(event: KeyboardEvent<SVGSVGElement>) {
        if (event.code === "Space") { event.preventDefault(); event.stopPropagation(); setSpace(false); }
      },
      onBlur: () => setSpace(false),
    } : {},
  };
}
