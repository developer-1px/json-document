import { useState, type PointerEvent } from "react";
import {
  createObjectEditor,
  type ObjectDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  applyAffordance,
  commitAffordance,
  dragAffordance,
  pointerSelect,
} from "@interactive-os/json-document-affordance";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
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

export function CanvasDemoRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjects));
  const [drag, setDrag] = useState<DragState | null>(null);
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
  const snapshot = editing.snapshot;
  const document = snapshot.value as ObjectDocument;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, objectId: string) {
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
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ ids, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    applyAffordance(
      dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }),
      {
        hand: (hand) => {
          if (hand.type === "translate") setDrag({ ...drag, dx: hand.dx, dy: hand.dy });
        },
      },
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const committed = commitAffordance(
      dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }),
    );
    if (committed) {
      applyAffordance(committed, {
        commit: (hand) => {
          if (hand.type !== "translate") return;
          editor.dispatch({
            type: "object.translate",
            objectIds: drag.ids,
            dx: hand.dx,
            dy: hand.dy,
          });
        },
      });
    }
    setDrag(null);
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
        <section aria-label="Canvas" className="contents">
          {document.objects.map((object) => {
            const offset = drag?.ids.includes(object.id) ? drag : null;
            const option = optionProps(editing.getItem(object.id));
            return (
              <SelectableItem
                key={object.id}
                data-object-id={object.id}
                selected={option.selected}
                focus={option.focus}
                onPointerDown={(event) => handlePointerDown(event, object.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
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
        </section>
      </ProductApp>
    </PageFrame>
  );
}
