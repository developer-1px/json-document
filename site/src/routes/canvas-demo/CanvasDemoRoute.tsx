import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { canvasDemoDocument, objectDemoColors } from "../../shared/demo-workbench/object-demo-document";
import {
  createObjectEditor,
  type ObjectDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  activateAffordance,
  applyAffordance,
  clickCountAffordance,
  commitAffordance,
  contextMenuAffordance,
  deleteAffordance,
  dragAffordance,
  dragOperation,
  dropAffordance,
  escapeAffordance,
  hoverAffordance,
  marqueeAffordance,
  marqueeHitsAffordance,
  nudgeAffordance,
  panAffordance,
  planeHitAffordance,
  resizeAffordance,
  selectAllAffordance,
  snapAffordance,
  wheelAffordance,
  zoomAffordance,
  type ResizeEdge,
} from "@interactive-os/json-document-affordance";
import { createWebPointerSession, pressInteractionFromWeb } from "@interactive-os/json-document-web";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";

const lockedIds = new Set(["lock"]);
const resizeEdges: ReadonlyArray<ResizeEdge> = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

type DragState = {
  readonly ids: ReadonlyArray<string>;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
  readonly copying: boolean;
};

type MarqueeState = {
  readonly originX: number;
  readonly originY: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type PanState = {
  readonly x: number;
  readonly y: number;
  readonly originX: number;
  readonly originY: number;
  readonly active: boolean;
};

type ResizeState = {
  readonly id: string;
  readonly edge: ResizeEdge;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
  readonly dw: number;
  readonly dh: number;
};

type MenuState = {
  readonly x: number;
  readonly y: number;
};

export function CanvasDemoRoute() {
  const [editor] = useState(() => createObjectEditor(canvasDemoDocument));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0, originX: 0, originY: 0, active: false });
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [space, setSpace] = useState(false);
  const [scale, setScale] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const panRef = useRef(pan);
  const resizeRef = useRef<ResizeState | null>(null);
  const spaceRef = useRef(space);
  const scaleRef = useRef(scale);
  const [pointerSession] = useState(() => createWebPointerSession<"drag" | "marquee" | "pan" | "resize">({
    onCancel: (kind) => {
      if (kind === "drag") setDragState(null);
      if (kind === "marquee") setMarqueeState(null);
      if (kind === "resize") setResizeState(null);
      if (kind === "pan") setPanState({ ...panRef.current, active: false });
    },
  }));
  panRef.current = pan;
  spaceRef.current = space;
  scaleRef.current = scale;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedObjects.map((object) => object.id),
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (objectId, mode) => {
      editor.dispatch({
        type: "selection.set",
        objectIds: [objectId],
        mode: mode === "extend" ? "add" : mode,
      });
    },
  });
  const document = editing.snapshot.value as ObjectDocument;
  const unlockedIds = document.objects.map((object) => object.id).filter((id) => !lockedIds.has(id));

  function setDragState(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function setMarqueeState(next: MarqueeState | null) {
    marqueeRef.current = next;
    setMarquee(next);
  }

  function setPanState(next: PanState) {
    panRef.current = next;
    setPan(next);
  }

  function setResizeState(next: ResizeState | null) {
    resizeRef.current = next;
    setResize(next);
  }

  function isPanStart(event: PointerEvent<HTMLElement>) {
    let grabbing = false;
    applyAffordance(panAffordance({ spaceKey: spaceRef.current, buttons: event.buttons }), {
      cursor: (cursor) => {
        grabbing = cursor === "grabbing";
      },
      hand: (hand) => {
        if (hand.type === "translate") grabbing = true;
      },
    });
    return grabbing || (spaceRef.current && event.buttons === 1);
  }

  function startPan(event: PointerEvent<HTMLElement>) {
    const current = panRef.current;
    if (surface.current === null) return;
    pointerSession.begin(surface.current, event.pointerId, "pan");
    setPanState({
      x: current.x,
      y: current.y,
      originX: event.clientX - current.x,
      originY: event.clientY - current.y,
      active: true,
    });
  }

  function planePoint(event: PointerEvent<HTMLElement>) {
    return {
      x: (event.nativeEvent.offsetX - panRef.current.x) / scaleRef.current,
      y: (event.nativeEvent.offsetY - panRef.current.y) / scaleRef.current,
    };
  }

  function commitCurrentDrag(event: PointerEvent<HTMLElement>) {
    pointerSession.commit(event.pointerId);
    const current = dragRef.current;
    if (!current) return;
    const committed = commitAffordance(
      dragAffordance(
        { x: current.originX, y: current.originY },
        { x: event.clientX, y: event.clientY },
        { shiftKey: event.shiftKey, altKey: event.altKey || current.copying },
      ),
    );
    if (committed) {
      applyAffordance(committed, {
        commit: (hand) => {
          if (hand.type !== "translate") return;
          const dx = hand.dx / scaleRef.current;
          const dy = hand.dy / scaleRef.current;
          let copied = false;
          applyAffordance(dragOperation({
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey || current.copying,
          }), {
            hand: (operation) => {
              if (operation.type !== "copy") return;
              copied = true;
              const clipboard = editor.copy();
              if (!clipboard) return;
              editor.dispatch({ type: "clipboard.paste", clipboard });
              const pasted = editor.selectedObjects.map((object) => object.id);
              applyAffordance(
                snapAffordance(
                  { x: dx, y: dy },
                  { grid: 8, disable: event.metaKey || event.ctrlKey },
                ),
                {
                  hand: (snapped) => {
                    if (snapped.type !== "translate") return;
                    editor.dispatch({
                      type: "object.translate",
                      objectIds: pasted,
                      dx: snapped.dx,
                      dy: snapped.dy,
                    });
                  },
                },
              );
            },
          });
          if (copied) return;
          const drop = commitAffordance(dropAffordance({ canDrop: true }));
          if (!drop) return;
          applyAffordance(drop, {
            commit: (dropped) => {
              if (dropped.type !== "move-drop") return;
              applyAffordance(
                snapAffordance(
                  { x: dx, y: dy },
                  { grid: 8, disable: event.metaKey || event.ctrlKey },
                ),
                {
                  hand: (snapped) => {
                    if (snapped.type !== "translate") return;
                    editor.dispatch({
                      type: "object.translate",
                      objectIds: current.ids,
                      dx: snapped.dx,
                      dy: snapped.dy,
                    });
                  },
                },
              );
            },
          });
        },
      });
    }
    setDragState(null);
  }

  function commitCurrentResize(event: PointerEvent<HTMLElement>) {
    pointerSession.commit(event.pointerId);
    const current = resizeRef.current;
    if (!current) return;
    const committed = commitAffordance(
      resizeAffordance(
        { x: current.originX, y: current.originY },
        { x: event.clientX, y: event.clientY },
        current.edge,
        event,
      ),
    );
    if (committed) {
      applyAffordance(committed, {
        commit: (hand) => {
          if (hand.type !== "resize") return;
          const scaleNow = scaleRef.current;
          editor.dispatch({
            type: "object.resize",
            objectIds: [current.id],
            dx: hand.dx / scaleNow,
            dy: hand.dy / scaleNow,
            dw: hand.dw / scaleNow,
            dh: hand.dh / scaleNow,
          });
        },
      });
    }
    setResizeState(null);
  }

  function handleObjectPointerDown(event: PointerEvent<HTMLElement>, objectId: string) {
    if (isPanStart(event)) {
      event.preventDefault();
      event.stopPropagation();
      surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      setMenu(null);
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    setMenu(null);
    applyAffordance(
      planeHitAffordance({
        hitId: objectId,
        selectedIds: editor.selectedObjects.map((object) => object.id),
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        locked: lockedIds.has(objectId),
      }),
      {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type !== "select" || !hand.objectIds) return;
          pointerSession.begin(event.currentTarget, event.pointerId, "drag");
          editor.dispatch({
            type: "selection.set",
            objectIds: hand.objectIds,
            mode: "replace",
          });
          setDragState({
            ids: hand.objectIds,
            originX: event.clientX,
            originY: event.clientY,
            dx: 0,
            dy: 0,
            copying: event.altKey,
          });
        },
      },
    );
  }

  function handleObjectPointerMove(event: PointerEvent<HTMLElement>) {
    const current = dragRef.current;
    if (!current) return;
    applyAffordance(
      dragAffordance(
        { x: current.originX, y: current.originY },
        { x: event.clientX, y: event.clientY },
        { shiftKey: event.shiftKey, altKey: event.altKey || current.copying },
      ),
      {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type !== "translate") return;
          setDragState({
            ...current,
            dx: hand.dx / scaleRef.current,
            dy: hand.dy / scaleRef.current,
            copying: event.altKey || current.copying,
          });
        },
      },
    );
  }

  function handleResizePointerDown(event: PointerEvent<HTMLElement>, objectId: string, edge: ResizeEdge) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    pointerSession.begin(event.currentTarget, event.pointerId, "resize");
    setResizeState({
      id: objectId,
      edge,
      originX: event.clientX,
      originY: event.clientY,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
    });
  }

  function handleResizePointerMove(event: PointerEvent<HTMLElement>) {
    const current = resizeRef.current;
    if (!current) return;
    applyAffordance(
      resizeAffordance(
        { x: current.originX, y: current.originY },
        { x: event.clientX, y: event.clientY },
        current.edge,
        event,
      ),
      {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type !== "resize") return;
          const scaleNow = scaleRef.current;
          setResizeState({
            ...current,
            dx: hand.dx / scaleNow,
            dy: hand.dy / scaleNow,
            dw: hand.dw / scaleNow,
            dh: hand.dh / scaleNow,
          });
        },
      },
    );
  }

  function handleSurfacePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (isPanStart(event)) {
      event.preventDefault();
      surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      setMenu(null);
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    setMenu(null);
    if (surface.current === null) return;
    pointerSession.begin(surface.current, event.pointerId, "marquee");
    const origin = planePoint(event);
    setMarqueeState({ originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, width: 0, height: 0 });
  }

  function handleSurfacePointerMove(event: PointerEvent<HTMLDivElement>) {
    pointerSession.preview(event.pointerId, (kind) => kind);
    const currentResize = resizeRef.current;
    if (currentResize) {
      handleResizePointerMove(event);
      return;
    }
    const currentPan = panRef.current;
    if (currentPan.active) {
      applyAffordance(
        panAffordance({
          spaceKey: true,
          buttons: event.buttons,
          origin: { x: currentPan.originX, y: currentPan.originY },
          point: { x: event.clientX, y: event.clientY },
        }),
        {
          cursor: (cursor) => {
            event.currentTarget.style.cursor = cursor;
          },
          hand: (hand) => {
            if (hand.type !== "translate") return;
            setPanState({ ...currentPan, x: hand.dx, y: hand.dy });
          },
        },
      );
      return;
    }
    const currentMarquee = marqueeRef.current;
    if (!currentMarquee) return;
    const origin = { x: currentMarquee.originX, y: currentMarquee.originY };
    const point = planePoint(event);
    applyAffordance(marqueeAffordance(origin, point, { shiftKey: event.shiftKey }), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
      hand: (hand) => {
        if (hand.type !== "select" || !hand.rect) return;
        setMarqueeState({ originX: origin.x, originY: origin.y, ...hand.rect });
      },
    });
  }

  function handleSurfacePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (resizeRef.current) {
      commitCurrentResize(event);
      return;
    }
    const currentPan = panRef.current;
    if (currentPan.active) {
      pointerSession.commit(event.pointerId);
      setPanState({ ...currentPan, active: false });
      return;
    }
    const currentMarquee = marqueeRef.current;
    if (!currentMarquee) return;
    pointerSession.commit(event.pointerId);
    const origin = { x: currentMarquee.originX, y: currentMarquee.originY };
    const point = planePoint(event);
    const committed = commitAffordance(marqueeAffordance(origin, point, { shiftKey: event.shiftKey }));
    if (committed) {
      applyAffordance(committed, {
        commit: (hand) => {
          if (hand.type === "clear") {
            editor.dispatch({ type: "selection.set", objectIds: [], mode: "replace" });
            return;
          }
          if (hand.type !== "select" || !hand.rect) return;
          applyAffordance(
            marqueeHitsAffordance({
              rect: hand.rect,
              items: document.objects.filter((object) => !lockedIds.has(object.id)),
            }),
            {
              hand: (hits) => {
                if (hits.type !== "select" || !hits.objectIds || hits.objectIds.length === 0) return;
                editor.dispatch({
                  type: "selection.set",
                  objectIds: hits.objectIds,
                  mode: hand.operation === "extend" ? "add" : "replace",
                });
              },
            },
          );
        },
      });
    }
    setMarqueeState(null);
  }

  function cancelHands() {
    setDragState(null);
    setMarqueeState(null);
    setResizeState(null);
    setMenu(null);
    setPanState({ ...panRef.current, active: false });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") {
      setSpace(true);
      event.preventDefault();
    }
    applyAffordance(
      escapeAffordance({
        key: event.key,
        grabbing: dragRef.current != null
          || marqueeRef.current != null
          || panRef.current.active
          || resizeRef.current != null
          || menu != null,
        selected: editor.selectedObjects.length > 0,
      }),
      {
        hand: (hand) => {
          if (hand.type === "cancel") {
            cancelHands();
            event.preventDefault();
            return;
          }
          if (hand.type !== "clear") return;
          editor.dispatch({ type: "selection.set", objectIds: [], mode: "replace" });
          event.preventDefault();
        },
      },
    );
    applyAffordance(contextMenuAffordance(event), {
      hand: (hand) => {
        if (hand.type === "menu" && hand.action === "cancel") setMenu(null);
      },
    });
    applyAffordance(
      selectAllAffordance(event, {
        allSelected: editor.selectedObjects.length === unlockedIds.length && unlockedIds.length > 0,
      }),
      {
        hand: (hand) => {
          if (hand.type === "select-all") {
            editor.dispatch({ type: "selection.set", objectIds: unlockedIds, mode: "replace" });
            event.preventDefault();
          }
          if (hand.type === "clear") {
            editor.dispatch({ type: "selection.set", objectIds: [], mode: "replace" });
            event.preventDefault();
          }
        },
      },
    );
    applyAffordance(deleteAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "delete") return;
        editor.dispatch({ type: "selection.remove" });
        event.preventDefault();
      },
    });
    applyAffordance(activateAffordance(pressInteractionFromWeb(event)), {
      hand: (hand) => {
        if (hand.type !== "activate") return;
        event.preventDefault();
      },
    });
    applyAffordance(zoomAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "zoom") return;
        setScale((current) => clampScale(current * hand.factor));
        event.preventDefault();
      },
    });
    if (editor.selectedObjects.length === 0) {
      applyAffordance(panAffordance({ key: event.key, selected: false }), {
        hand: (hand) => {
          if (hand.type !== "translate") return;
          setPanState({ ...panRef.current, x: panRef.current.x + hand.dx, y: panRef.current.y + hand.dy });
          event.preventDefault();
        },
      });
      return;
    }
    applyAffordance(nudgeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "nudge") return;
        const ids = editor.selectedObjects.map((object) => object.id);
        editor.dispatch({ type: "object.translate", objectIds: ids, dx: hand.dx, dy: hand.dy });
        event.preventDefault();
      },
    });
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    applyAffordance(wheelAffordance(event), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
      hand: (hand) => {
        if (hand.type === "zoom") {
          event.preventDefault();
          setScale((current) => clampScale(current * hand.factor));
          return;
        }
        if (hand.type !== "translate") return;
        event.preventDefault();
        setPanState({
          ...panRef.current,
          x: panRef.current.x + hand.dx,
          y: panRef.current.y + hand.dy,
        });
      },
    });
  }

  return (
    <DemoPage documentation={(
      <PageHeader illustration="peek" title="Canvas">
        Pick a box, drag it, then fill the selection. The board is the editor.
      </PageHeader>
    )}>
      <ProductApp
        toolbarLabel="Canvas actions"
        canvasClassName="relative min-h-[22rem] overflow-hidden"
        toolbar={objectDemoColors.map((color) => (
          <ActionButton
            key={color}
            aria-label={`Fill ${color}`}
            onClick={() => editor.dispatch({ type: "selection.fill", color })}
          >
            <span aria-hidden="true" style={{ display: "inline-block", width: "0.75rem", height: "0.75rem", backgroundColor: color }} />
          </ActionButton>
        ))}
      >
        <div
          ref={surface}
          className={classes("relative min-h-[22rem] overflow-hidden", ui.state.focus)}
          aria-label="Canvas"
          tabIndex={0}
          onPointerDown={handleSurfacePointerDown}
          onPointerMove={handleSurfacePointerMove}
          onPointerUp={handleSurfacePointerUp}
          onWheel={onWheel}
          onContextMenu={(event) => {
            applyAffordance(contextMenuAffordance(event.nativeEvent), {
              hand: (hand) => {
                if (hand.type !== "menu" || hand.action !== "open") return;
                event.preventDefault();
                setMenu({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });
              },
            });
          }}
          onPointerCancel={(event) => {
            pointerSession.cancel(event.pointerId);
            applyAffordance(escapeAffordance(event), {
              hand: (hand) => {
                if (hand.type !== "cancel") return;
                cancelHands();
              },
            });
          }}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => {
            if (event.key === " ") setSpace(false);
          }}
        >
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
            {document.objects.map((object) => {
              const resizing = resize?.id === object.id ? resize : null;
              const offset = drag && !drag.copying && drag.ids.includes(object.id) ? drag : null;
              const option = optionProps(editing.getItem(object.id));
              return (
                <SelectableItem
                  key={object.id}
                  data-object-id={object.id}
                  data-locked={lockedIds.has(object.id) ? "true" : "false"}
                  data-hover={hoverId === object.id}
                  selected={option.selected}
                  focus={option.focus}
                  onPointerDown={(event) => handleObjectPointerDown(event, object.id)}
                  onPointerMove={handleObjectPointerMove}
                  onPointerUp={commitCurrentDrag}
                  onPointerEnter={() => {
                    applyAffordance(hoverAffordance({ elapsedMs: 0, inside: true, highlight: true }), {
                      hand: (hand) => {
                        if (hand.type === "hover" && hand.phase === "highlight") setHoverId(object.id);
                      },
                    });
                  }}
                  onPointerLeave={() => {
                    applyAffordance(hoverAffordance({ elapsedMs: 0, inside: false, highlight: true }), {
                      hand: () => setHoverId(null),
                    });
                    if (hoverId === object.id) setHoverId(null);
                  }}
                  onDoubleClick={(event) => {
                    applyAffordance(clickCountAffordance(event.detail), {
                      hand: (hand) => {
                        if (hand.type !== "click" || hand.count !== 2) return;
                        applyAffordance(activateAffordance(pressInteractionFromWeb(event)), {
                          hand: (activated) => {
                            if (activated.type === "activate") event.preventDefault();
                          },
                        });
                      },
                    });
                  }}
                  onLostPointerCapture={(event) => {
                    pointerSession.cancel(event.pointerId, "lost-capture");
                  }}
                  className={ui.interactive.planeItem}
                  style={{
                    left: object.x + (offset?.dx ?? 0) + (resizing?.dx ?? 0),
                    top: object.y + (offset?.dy ?? 0) + (resizing?.dy ?? 0),
                    width: object.width + (resizing?.dw ?? 0),
                    height: object.height + (resizing?.dh ?? 0),
                    backgroundColor: object.color,
                    color: "rgb(var(--color-foreground-canvas-object))",
                  }}
                >
                  {object.label}
                </SelectableItem>
              );
            })}
            {drag?.copying
              ? drag.ids.map((id) => {
                const object = document.objects.find((item) => item.id === id);
                if (!object) return null;
                return (
                  <div
                    key={`ghost-${id}`}
                    className={classes("pointer-events-none", ui.interactive.planeItem)}
                    style={{
                      left: object.x + drag.dx,
                      top: object.y + drag.dy,
                      width: object.width,
                      height: object.height,
                      backgroundColor: object.color,
                      opacity: 0.5,
                    }}
                  >
                    {object.label}
                  </div>
                );
              })
              : null}
            {document.objects.map((object) => {
              const option = optionProps(editing.getItem(object.id));
              if (!option.selected || lockedIds.has(object.id)) return null;
              const resizing = resize?.id === object.id ? resize : null;
              const offset = drag && !drag.copying && drag.ids.includes(object.id) ? drag : null;
              const left = object.x + (offset?.dx ?? 0) + (resizing?.dx ?? 0);
              const top = object.y + (offset?.dy ?? 0) + (resizing?.dy ?? 0);
              const width = object.width + (resizing?.dw ?? 0);
              const height = object.height + (resizing?.dh ?? 0);
              return resizeEdges.map((edge) => (
                <div
                  key={`${object.id}-${edge}`}
                  role="presentation"
                  data-resize-edge={edge}
                  data-object-id={object.id}
                  className={ui.interactive.resizeHandle}
                  style={handleStyle(edge, left, top, width, height)}
                  onPointerDown={(event) => handleResizePointerDown(event, object.id, edge)}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={commitCurrentResize}
                />
              ));
            })}
            {marquee ? (
              <div
                className={classes("pointer-events-none absolute", ui.surface.marquee)}
                style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
              />
            ) : null}
          </div>
          {menu ? (
            <div
              role="menu"
              aria-label="Canvas menu"
              className={ui.interactive.contextMenu}
              style={{ left: menu.x, top: menu.y }}
            >
              <button
                type="button"
                role="menuitem"
                className={ui.interactive.contextMenuItem}
                onClick={() => {
                  editor.dispatch({ type: "selection.remove" });
                  setMenu(null);
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </ProductApp>
    </DemoPage>
  );
}

function clampScale(value: number) {
  return Math.min(4, Math.max(0.25, value));
}

function handleStyle(edge: ResizeEdge, left: number, top: number, width: number, height: number) {
  const midX = left + width / 2 - 4;
  const midY = top + height / 2 - 4;
  const x = edge.includes("w") ? left - 4 : edge.includes("e") ? left + width - 4 : midX;
  const y = edge.includes("n") ? top - 4 : edge.includes("s") ? top + height - 4 : midY;
  return { left: x, top: y };
}
