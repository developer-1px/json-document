import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  createObjectEditor,
  type ObjectDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  applyAffordance,
  commitAffordance,
  dragAffordance,
  escapeAffordance,
  marqueeAffordance,
  nudgeAffordance,
  panAffordance,
  pointerSelect,
  snapAffordance,
} from "@interactive-os/json-document-affordance";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";

const colors = ["#de6d55", "#60786f", "#c4a35a", "#4d6a8a"] as const;

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

export function CanvasDemoRoute() {
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
  });
  const document = editing.snapshot.value as ObjectDocument;

  function handlePointerDown(event: PointerEvent<HTMLElement>, objectId?: string) {
    surface.current?.setPointerCapture(event.pointerId);
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
      setPan({ x: pan.x, y: pan.y, originX: event.clientX - pan.x, originY: event.clientY - pan.y, active: true });
      return;
    }
    if (objectId) {
      let operation: "replace" | "extend" | "toggle" = "replace";
      applyAffordance(pointerSelect(event), {
        hand: (hand) => {
          if (hand.type !== "select") return;
          operation = hand.operation;
          editor.dispatch({
            type: "selection.set",
            objectIds: [objectId],
            mode: hand.operation === "extend" ? "add" : hand.operation,
          });
        },
      });
      const ids = operation !== "replace"
        ? [...new Set([...editor.selectedObjects.map((object) => object.id), objectId])]
        : [objectId];
      setDrag({ ids, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
      return;
    }
    const origin = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
    setMarquee({ originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, width: 0, height: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pan.active) {
      applyAffordance(
        panAffordance({
          spaceKey: true,
          buttons: event.buttons,
          origin: { x: pan.originX, y: pan.originY },
          point: { x: event.clientX, y: event.clientY },
        }),
        {
          cursor: (cursor) => {
            event.currentTarget.style.cursor = cursor;
          },
          hand: (hand) => {
            if (hand.type !== "translate") return;
            setPan((current) => ({ ...current, x: hand.dx, y: hand.dy }));
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
            if (hand.type === "translate") setDrag({ ...drag, dx: hand.dx, dy: hand.dy });
          },
        },
      );
      return;
    }
    if (marquee) {
      const origin = { x: marquee.originX, y: marquee.originY };
      const point = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
      applyAffordance(marqueeAffordance(origin, point), {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type !== "select" || !hand.rect) return;
          setMarquee({ originX: origin.x, originY: origin.y, ...hand.rect });
        },
      });
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pan.active) {
      setPan((current) => ({ ...current, active: false }));
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
      setDrag(null);
      return;
    }
    if (marquee) {
      const origin = { x: marquee.originX, y: marquee.originY };
      const point = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
      const committed = commitAffordance(marqueeAffordance(origin, point));
      if (committed) {
        applyAffordance(committed, {
          commit: (hand) => {
            if (hand.type !== "select" || !hand.rect) return;
            const hits = document.objects
              .filter((object) => intersects(hand.rect!, object))
              .map((object) => object.id);
            if (hits.length === 0) return;
            applyAffordance(pointerSelect(event), {
              hand: (selectHand) => {
                if (selectHand.type !== "select") return;
                editor.dispatch({
                  type: "selection.set",
                  objectIds: hits,
                  mode: selectHand.operation === "extend" ? "add" : selectHand.operation === "toggle" ? "toggle" : "replace",
                });
              },
            });
          },
        });
      }
      setMarquee(null);
    }
  }

  function cancelHands() {
    setDrag(null);
    setMarquee(null);
    setPan((current) => ({ ...current, active: false }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") {
      setSpace(true);
      event.preventDefault();
    }
    applyAffordance(escapeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "cancel") return;
        cancelHands();
        event.preventDefault();
      },
    });
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
    <PageFrame>
      <PageHeader illustration="peek" title="Canvas">
        Pick a box, drag it, then fill the selection. The board is the editor.
      </PageHeader>

      <ProductApp
        toolbarLabel="Canvas actions"
        canvasClassName="relative min-h-[22rem] overflow-hidden"
        toolbar={colors.map((color) => (
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
          className="relative min-h-[22rem] overflow-hidden"
          aria-label="Canvas"
          tabIndex={0}
          onPointerDown={(event) => handlePointerDown(event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={(event) => {
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
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            {document.objects.map((object) => {
              const offset = drag?.ids.includes(object.id) ? drag : null;
              const option = optionProps(editing.getItem(object.id));
              return (
                <SelectableItem
                  key={object.id}
                  data-object-id={object.id}
                  selected={option.selected}
                  focus={option.focus}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handlePointerDown(event, object.id);
                  }}
                  className="absolute grid place-items-center"
                  style={{
                    left: object.x + (offset?.dx ?? 0),
                    top: object.y + (offset?.dy ?? 0),
                    width: object.width,
                    height: object.height,
                    backgroundColor: object.color,
                    color: "#fff8f2",
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
      </ProductApp>
    </PageFrame>
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
