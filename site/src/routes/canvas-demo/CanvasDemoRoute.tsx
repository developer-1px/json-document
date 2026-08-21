import { useState, type PointerEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createObjectEditor,
  type ObjectDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { initialObjectDemoDocument, objectDemoColors } from "../../shared/demo-workbench/object-demo-document";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { ui } from "../../shared/ui/styles";

type DragState = {
  readonly ids: ReadonlyArray<string>;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
};

export function CanvasDemoRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjectDemoDocument));
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
    editing.getItem(objectId).getPressHandler()(event);
    const mode = event.shiftKey ? "extend" : event.metaKey || event.ctrlKey ? "toggle" : "replace";
    const ids = mode === "toggle" || mode === "extend"
      ? [...new Set([...editor.selectedObjects.map((object) => object.id), objectId])]
      : [objectId];
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ ids, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    setDrag({
      ...drag,
      dx: event.clientX - drag.originX,
      dy: event.clientY - drag.originY,
    });
  }

  function handlePointerUp() {
    if (!drag) return;
    if (drag.dx !== 0 || drag.dy !== 0) {
      editor.dispatch({ type: "object.translate", objectIds: drag.ids, dx: drag.dx, dy: drag.dy });
    }
    setDrag(null);
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
        <section aria-label="Canvas" className="contents">
          {document.objects.map((object) => {
            const offset = drag?.ids.includes(object.id) ? drag : null;
            return (
              <SelectableItem
                key={object.id}
                selected={editing.getItem(object.id).getIsSelected()}
                focus={editing.getItem(object.id).getIsFocus()}
                data-object-id={object.id}
                onPointerDown={(event) => handlePointerDown(event, object.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={ui.interactive.planeItem}
                style={{
                  left: object.x + (offset?.dx ?? 0),
                  top: object.y + (offset?.dy ?? 0),
                  width: object.width,
                  height: object.height,
                  backgroundColor: object.color,
                  color: "rgb(var(--color-foreground-canvas-object))",
                }}
              >
                {object.label}
              </SelectableItem>
            );
          })}
        </section>
      </ProductApp>
    </DemoPage>
  );
}
