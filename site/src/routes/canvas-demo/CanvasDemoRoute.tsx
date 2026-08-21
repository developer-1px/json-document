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

type PanState = {
  readonly x: number;
  readonly y: number;
  readonly originX: number;
  readonly originY: number;
  readonly active: boolean;
};

export function CanvasDemoRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjects));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0, originX: 0, originY: 0, active: false });
  const [space, setSpace] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const panRef = useRef(pan);
  const spaceRef = useRef(space);
  panRef.current = pan;
  spaceRef.current = space;
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
    surface.current?.setPointerCapture(event.pointerId);
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
      x: event.nativeEvent.offsetX - panRef.current.x,
      y: event.nativeEvent.offsetY - panRef.current.y,
    };
  }

  function commitCurrentDrag(event: PointerEvent<HTMLElement>) {
    const current = dragRef.current;
    if (!current) return;
    const committed = commitAffordance(
      dragAffordance({ x: current.originX, y: current.originY }, { x: event.clientX, y: event.clientY }),
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
                  objectIds: current.ids,
                  dx: snapped.dx,
                  dy: snapped.dy,
                });
              },
            },
          );
        },
      });
    }
    setDragState(null);
  }

  function handleObjectPointerDown(event: PointerEvent<HTMLElement>, objectId: string) {
    event.preventDefault();
    event.stopPropagation();
    surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    if (isPanStart(event)) {
      startPan(event);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
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
    setDragState({ ids, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
  }

  function handleObjectPointerMove(event: PointerEvent<HTMLElement>) {
    const current = dragRef.current;
    if (!current) return;
    applyAffordance(
      dragAffordance({ x: current.originX, y: current.originY }, { x: event.clientX, y: event.clientY }),
      {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type !== "translate") return;
          setDragState({ ...current, dx: hand.dx, dy: hand.dy });
        },
      },
    );
  }

  function handleSurfacePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    surface.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    if (isPanStart(event)) {
      startPan(event);
      return;
    }
    surface.current?.setPointerCapture(event.pointerId);
    const origin = planePoint(event);
    setMarqueeState({ originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, width: 0, height: 0 });
  }

  function handleSurfacePointerMove(event: PointerEvent<HTMLDivElement>) {
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
    applyAffordance(marqueeAffordance(origin, point), {
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
    const currentPan = panRef.current;
    if (currentPan.active) {
      setPanState({ ...currentPan, active: false });
      return;
    }
    const currentMarquee = marqueeRef.current;
    if (!currentMarquee) return;
    const origin = { x: currentMarquee.originX, y: currentMarquee.originY };
    const point = planePoint(event);
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
    setMarqueeState(null);
  }

  function cancelHands() {
    setDragState(null);
    setMarqueeState(null);
    setPanState({ ...panRef.current, active: false });
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
          className={classes("relative min-h-[22rem] overflow-hidden", ui.state.focus)}
          aria-label="Canvas"
          tabIndex={0}
          onPointerDown={handleSurfacePointerDown}
          onPointerMove={handleSurfacePointerMove}
          onPointerUp={handleSurfacePointerUp}
          onPointerCancel={(event) => {
            applyAffordance(escapeAffordance(event), {
              hand: (hand) => {
                if (hand.type !== "cancel") return;
                setMarqueeState(null);
                setPanState({ ...panRef.current, active: false });
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
                  onPointerDown={(event) => handleObjectPointerDown(event, object.id)}
                  onPointerMove={handleObjectPointerMove}
                  onPointerUp={commitCurrentDrag}
                  onLostPointerCapture={(event) => {
                    if (event.buttons !== 0) return;
                    commitCurrentDrag(event);
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
                className={classes("pointer-events-none absolute", ui.surface.marquee)}
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
