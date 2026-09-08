import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createObjectEditor, type ObjectDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  createWebPointerSession,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import {
  createCanvasGestureSession,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  commitAffordance,
  dragAffordance,
  escapeAffordance,
  forbiddenCursor,
  marqueeAffordance,
  marqueeHitsAffordance,
  nudgeAffordance,
  panAffordance,
  planeHitAffordance,
  snapAffordance,
} from "@interactive-os/json-document-affordance";
import { initialObjectDemoDocument } from "../../shared/demo-workbench/object-demo-document";
import { SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

type DragState = {
  readonly type: "drag";
  readonly ids: ReadonlyArray<string>;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
};

type MarqueeState = {
  readonly type: "marquee";
  readonly originX: number;
  readonly originY: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type PanGesture = {
  readonly type: "pan";
  readonly originX: number;
  readonly originY: number;
};

type CanvasGesture = DragState | MarqueeState | PanGesture;

export function CanvasWidgetRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjectDemoDocument));
  const [gesture, setGesture] = useState<CanvasGesture | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [space, setSpace] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const [gestureSession] = useState(() => createCanvasGestureSession<CanvasGesture>({
    onBegin: setGesture,
    onPreview: setGesture,
    onCommit: () => setGesture(null),
    onCancel: () => setGesture(null),
  }));
  const [pointerSession] = useState(() => createWebPointerSession<"drag" | "marquee" | "pan">({
    onCancel: (_kind, reason) => gestureSession.cancel(reason === "lost-capture" ? "lost-capture" : "pointer-cancel"),
  }));
  const drag = gesture?.type === "drag" ? gesture : null;
  const marquee = gesture?.type === "marquee" ? gesture : null;
  const panGesture = gesture?.type === "pan" ? gesture : null;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedObjects.map((object) => object.id),
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (objectId, mode) => {
      editor.dispatch({
        type: "selection.set",
        objectIds: [objectId],
        mode,
      });
    },
    keyboard: {
      resolve: (stroke) => {
        const command = editingCommandFromWebKeyboardStroke(stroke);
        return command?.type === "delete" ? command : null;
      },
      focusKey: () => editor.snapshot.selection.primaryKey ?? undefined,
      neighbor: () => null,
      onDelete: () => {
        editor.dispatch({ type: "selection.remove" });
      },
    },
  });
  const document = editing.snapshot.value as ObjectDocument;

  function handlePointerDown(event: PointerEvent<HTMLElement>, objectId?: string) {
    event.preventDefault();
    surface.current?.focus();
    if (surface.current === null) return;
    let grabbing = false;
    applyAffordance(panAffordance({ spaceKey: space, buttons: event.buttons }), {
      cursor: (cursor) => {
        grabbing = cursor === "grabbing";
      },
      hand: (hand) => {
        if (hand.type === "translate") grabbing = true;
      },
    });
    if (grabbing || (space && event.buttons === 1)) {
      pointerSession.begin(surface.current, event.pointerId, "pan");
      gestureSession.begin({ type: "pan", originX: event.clientX - pan.x, originY: event.clientY - pan.y });
      return;
    }
    if (objectId) {
      applyAffordance(
        planeHitAffordance({
          hitId: objectId,
          selectedIds: editor.selectedObjects.map((object) => object.id),
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        }),
        {
          hand: (hand) => {
            if (hand.type !== "select" || !hand.objectIds) return;
            editor.dispatch({
              type: "selection.set",
              objectIds: hand.objectIds,
              mode: "replace",
            });
            pointerSession.begin(surface.current!, event.pointerId, "drag");
            gestureSession.begin({
              type: "drag",
              ids: hand.objectIds,
              originX: event.clientX,
              originY: event.clientY,
              dx: 0,
              dy: 0,
            });
          },
        },
      );
      return;
    }
    const origin = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
    pointerSession.begin(surface.current, event.pointerId, "marquee");
    gestureSession.begin({ type: "marquee", originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, width: 0, height: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    pointerSession.preview(event.pointerId, (kind) => kind);
    applyAffordance(forbiddenCursor({ allowed: true, dropping: drag !== null }), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = space ? "grab" : cursor;
      },
    });
    if (panGesture) {
      applyAffordance(
        panAffordance({
          spaceKey: true,
          buttons: event.buttons,
          origin: { x: panGesture.originX, y: panGesture.originY },
          point: { x: event.clientX, y: event.clientY },
        }),
        {
          cursor: (cursor) => {
            event.currentTarget.style.cursor = cursor;
          },
          hand: (hand) => {
            if (hand.type !== "translate") return;
            setPan({ x: hand.dx, y: hand.dy });
          },
        },
      );
      return;
    }
    if (drag) {
      applyAffordance(
        dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }),
        {
          cursor: (cursor) => {
            event.currentTarget.style.cursor = cursor;
          },
          hand: (hand) => {
          if (hand.type === "translate") gestureSession.preview({ ...drag, dx: hand.dx, dy: hand.dy });
          },
        },
      );
      return;
    }
    if (marquee) {
      const origin = { x: marquee.originX, y: marquee.originY };
      const point = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
      applyAffordance(marqueeAffordance(origin, point, event), {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type !== "select" || !hand.rect) return;
          gestureSession.preview({ type: "marquee", originX: origin.x, originY: origin.y, ...hand.rect });
        },
      });
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    pointerSession.commit(event.pointerId);
    if (panGesture) {
      gestureSession.commit();
      return;
    }
    if (drag) {
      const committed = commitAffordance(
        dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }),
      );
      if (committed) {
        applyAffordance(committed, {
          commit: (hand) => {
            if (hand.type !== "translate") return;
            applyAffordance(
              snapAffordance(
                { x: hand.dx, y: hand.dy },
                { grid: 8, disable: event.metaKey || event.ctrlKey },
              ),
              {
                hand: (snapped) => {
                  if (snapped.type !== "translate") return;
                  editor.dispatch({
                    type: "object.translate",
                    objectIds: drag.ids,
                    dx: snapped.dx,
                    dy: snapped.dy,
                  });
                },
              },
            );
          },
        });
      }
      gestureSession.commit();
      return;
    }
    if (marquee) {
      const origin = { x: marquee.originX, y: marquee.originY };
      const point = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
      const committed = commitAffordance(marqueeAffordance(origin, point, event));
      if (committed) {
        applyAffordance(committed, {
          commit: (hand) => {
            if (hand.type === "clear") {
              editor.dispatch({ type: "selection.set", objectIds: [], mode: "replace" });
              return;
            }
            if (hand.type !== "select" || !hand.rect) return;
            applyAffordance(marqueeHitsAffordance({ rect: hand.rect, items: document.objects }), {
              hand: (hits) => {
                if (hits.type !== "select" || !hits.objectIds || hits.objectIds.length === 0) return;
                editor.dispatch({
                  type: "selection.set",
                  objectIds: hits.objectIds,
                  mode: hand.operation,
                });
              },
            });
          },
        });
      }
      gestureSession.commit();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") {
      setSpace(true);
      event.preventDefault();
    }
    applyAffordance(
      escapeAffordance({
        key: event.key,
        grabbing: gesture !== null,
        selected: editor.selectedObjects.length > 0,
      }),
      {
        hand: (hand) => {
          if (hand.type === "cancel") {
            const activePointer = pointerSession.getSnapshot();
            if (activePointer) pointerSession.cancel(activePointer.pointerId);
            else gestureSession.cancel();
            event.preventDefault();
            return;
          }
          if (hand.type !== "clear") return;
          editor.dispatch({ type: "selection.set", objectIds: [], mode: "replace" });
          event.preventDefault();
        },
      },
    );
    applyAffordance(nudgeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "nudge") return;
        const ids = editor.selectedObjects.map((object) => object.id);
        if (ids.length === 0) return;
        editor.dispatch({ type: "object.translate", objectIds: ids, dx: hand.dx, dy: hand.dy });
        event.preventDefault();
      },
    });
    editing.getKeyDownHandler()(event);
  }

  return (
    <WidgetDemoFrame
      title="Canvas"
      description="Drag, marquee, nudge, snap, and pan use applyAffordance. Writes go through commitAffordance."
      illustration="peek"
      widgetLabel="Canvas"
      widget={(
        <div
          ref={surface}
          className="relative min-h-[16rem] overflow-hidden"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Canvas objects"
          {...activeDescendantContainerProps(
            editor.snapshot.selection.primaryKey === null
              ? null
              : canvasObjectId(editor.snapshot.selection.primaryKey),
          )}
          onPointerDown={(event) => handlePointerDown(event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={(event) => pointerSession.cancel(event.pointerId)}
          onLostPointerCapture={(event) => pointerSession.cancel(event.pointerId, "lost-capture")}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => {
            if (event.key === " ") setSpace(false);
          }}
        >
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            {document.objects.map((object) => {
              const offset = drag?.ids.includes(object.id) ? drag : null;
              const option = editingItemProps(editing.getItem(object.id));
              return (
                <SelectableItem
                  as="div"
                  key={object.id}
                  className={ui.interactive.planeItem}
                  style={{
                    left: object.x + (offset?.dx ?? 0),
                    top: object.y + (offset?.dy ?? 0),
                    width: object.width,
                    height: object.height,
                    backgroundColor: object.color,
                    color: "rgb(var(--color-foreground-canvas-object))",
                  }}
                  selected={option.selected}
                  focus={option.focus}
                  dragging={offset !== null}
                  {...activeDescendantItemProps(canvasObjectId(object.id))}
                  {...projectWebWidgetState({ role: "option", selected: option.selected })}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handlePointerDown(event, object.id);
                  }}
                >
                  {object.label}
                </SelectableItem>
              );
            })}
            {marquee ? (
              <div
                className={classes("pointer-events-none absolute", ui.surface.marquee)}
                style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
              />
            ) : null}
          </div>
        </div>
      )}
      values={[
        { label: "selectedKeys", value: editor.selectedObjects.map((object) => object.id), testId: "widget-canvas-selected", size: "compact" },
        { label: "focus", value: editor.snapshot.selection.primaryKey, testId: "widget-canvas-focus", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-canvas-selection", size: "compact" },
      ]}
    />
  );
}

function canvasObjectId(objectId: string): string {
  return `widget-canvas-option-${objectId}`;
}
