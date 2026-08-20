import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createObjectEditor, type ObjectDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  applyAffordance,
  dragAffordance,
  forbiddenCursor,
  marqueeRect,
  nudgeAffordance,
  panAffordance,
  pointerSelect,
  selectOperationFrom,
  snapAffordance,
} from "@interactive-os/json-document-affordance";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialObjects: ObjectDocument = {
  objects: [
    { id: "note", label: "Note", x: 24, y: 24, width: 120, height: 72, color: "#de6d55" },
    { id: "card", label: "Card", x: 168, y: 40, width: 120, height: 72, color: "#60786f" },
    { id: "chip", label: "Chip", x: 96, y: 136, width: 120, height: 72, color: "#c4a35a" },
  ],
};

type DragState = {
  readonly ids: ReadonlyArray<string>;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
};

type MarqueeState = {
  readonly originX: number;
  readonly originY: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function CanvasWidgetRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjects));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0, originX: 0, originY: 0, active: false });
  const [space, setSpace] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
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
    operationFromEvent: (event) => selectOperationFrom(pointerSelect(event)),
  });
  const document = editing.snapshot.value as ObjectDocument;

  function handlePointerDown(event: PointerEvent<HTMLElement>, objectId?: string) {
    const panResult = panAffordance({ spaceKey: space, buttons: event.buttons });
    surface.current?.setPointerCapture(event.pointerId);
    if (panResult.cursor === "grabbing" || (space && event.buttons === 1)) {
      setPan({ x: pan.x, y: pan.y, originX: event.clientX - pan.x, originY: event.clientY - pan.y, active: true });
      return;
    }
    if (objectId) {
      const result = pointerSelect(event);
      applyAffordance(result, {
        hand: (hand) => {
          if (hand.type !== "select") return;
          editor.dispatch({
            type: "selection.set",
            objectIds: [objectId],
            mode: hand.operation === "extend" ? "add" : hand.operation,
          });
        },
      });
      const ids = selectOperationFrom(result) === "replace"
        ? [objectId]
        : [...new Set([...editor.selectedObjects.map((object) => object.id), objectId])];
      setDrag({ ids, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
      return;
    }
    const origin = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
    setMarquee({ originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, width: 0, height: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    applyAffordance(forbiddenCursor({ allowed: true, dropping: drag !== null }), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = space ? "grab" : cursor;
      },
    });
    if (pan.active) {
      applyAffordance(panAffordance({ spaceKey: true, buttons: event.buttons }), {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: () => {
          setPan((current) => ({
            ...current,
            x: event.clientX - current.originX,
            y: event.clientY - current.originY,
          }));
        },
      });
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
            if (hand.type === "translate") setDrag({ ...drag, dx: hand.dx, dy: hand.dy });
          },
        },
      );
      return;
    }
    if (marquee) {
      const rect = marqueeRect(
        { x: marquee.originX, y: marquee.originY },
        { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
      );
      setMarquee({ ...marquee, ...rect });
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pan.active) {
      setPan((current) => ({ ...current, active: false }));
      return;
    }
    if (drag) {
      const result = dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY });
      if (result.commit && result.hand?.type === "translate") {
        const snapped = snapAffordance(
          { x: result.hand.dx, y: result.hand.dy },
          { grid: 8, disable: event.metaKey || event.ctrlKey },
        );
        const point = snapped.hand?.type === "translate" ? snapped.hand : result.hand;
        editor.dispatch({ type: "object.translate", objectIds: drag.ids, dx: point.dx, dy: point.dy });
      }
      setDrag(null);
      return;
    }
    if (marquee) {
      const hits = document.objects
        .filter((object) => intersects(marquee, object))
        .map((object) => object.id);
      if (hits.length > 0) {
        editor.dispatch({
          type: "selection.set",
          objectIds: hits,
          mode: selectOperationFrom(pointerSelect(event)) === "extend" ? "add" : "replace",
        });
      }
      setMarquee(null);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") {
      setSpace(true);
      event.preventDefault();
    }
    applyAffordance(nudgeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "nudge") return;
        const ids = editor.selectedObjects.map((object) => object.id);
        if (ids.length === 0) return;
        editor.dispatch({ type: "object.translate", objectIds: ids, dx: hand.dx, dy: hand.dy });
        event.preventDefault();
      },
    });
  }

  return (
    <WidgetDemoFrame
      title="Canvas"
      description="Drag, marquee, nudge, snap, and pan all read { hand, cursor, commit }."
      illustration="peek"
      widgetLabel="Canvas"
      widget={(
        <div
          ref={surface}
          className="relative min-h-[16rem] overflow-hidden"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Canvas objects"
          tabIndex={0}
          onPointerDown={(event) => handlePointerDown(event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => {
            if (event.key === " ") setSpace(false);
          }}
        >
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            {document.objects.map((object) => {
              const offset = drag?.ids.includes(object.id) ? drag : null;
              const option = optionProps(editing.getItem(object.id));
              return (
                <SelectableItem
                  key={object.id}
                  role="option"
                  className="absolute grid place-items-center"
                  style={{
                    left: object.x + (offset?.dx ?? 0),
                    top: object.y + (offset?.dy ?? 0),
                    width: object.width,
                    height: object.height,
                    backgroundColor: object.color,
                    color: "#fff8f2",
                  }}
                  selected={option.selected}
                  focus={option.focus}
                  aria-selected={option["aria-selected"]}
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
                className={classes("pointer-events-none absolute", ui.surface.empty)}
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

function intersects(
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  object: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  return rect.x < object.x + object.width
    && rect.x + rect.width > object.x
    && rect.y < object.y + object.height
    && rect.y + rect.height > object.y;
}
