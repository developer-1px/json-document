import { useState, type PointerEvent } from "react";
import { createObjectEditor, type ObjectDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  dragOffset,
  dragShouldCommit,
  pointerSelect,
} from "@interactive-os/json-document-affordance";
import { SelectableItem } from "../../shared/ui/interactive";
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

export function CanvasWidgetRoute() {
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
    operationFromEvent: (event) => pointerSelect({
      shiftKey: event.shiftKey ?? false,
      metaKey: event.metaKey ?? false,
      ctrlKey: event.ctrlKey ?? false,
    }),
  });
  const document = editing.snapshot.value as ObjectDocument;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, objectId: string) {
    editing.getItem(objectId).getPressHandler()(event);
    const ids = pointerSelect(event) === "replace"
      ? [objectId]
      : [...new Set([...editor.selectedObjects.map((object) => object.id), objectId])];
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ ids, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const offset = dragOffset({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY });
    setDrag({ ...drag, dx: offset.dx, dy: offset.dy });
  }

  function handlePointerUp() {
    if (!drag) return;
    const offset = { dx: drag.dx, dy: drag.dy };
    if (dragShouldCommit(offset)) {
      editor.dispatch({ type: "object.translate", objectIds: drag.ids, dx: offset.dx, dy: offset.dy });
    }
    setDrag(null);
  }

  return (
    <WidgetDemoFrame
      title="Canvas"
      description="The canvas attaches select and drag. Geometry stays on the host."
      illustration="peek"
      widgetLabel="Canvas"
      widget={(
        <div className="relative min-h-[16rem]" role="listbox" aria-multiselectable="true" aria-label="Canvas objects">
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
                onPointerDown={(event) => handlePointerDown(event, object.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {object.label}
              </SelectableItem>
            );
          })}
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
