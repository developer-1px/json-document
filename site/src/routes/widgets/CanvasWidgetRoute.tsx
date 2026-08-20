import { useState } from "react";
import { createObjectEditor, type ObjectDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { SelectableItem } from "../../shared/ui/interactive";
import { WidgetDemoFrame } from "./WidgetDemoFrame";
import { optionProps } from "../../shared/widget-binding";

const initialObjects: ObjectDocument = {
  objects: [
    { id: "note", label: "Note", x: 24, y: 24, width: 120, height: 72, color: "#de6d55" },
    { id: "card", label: "Card", x: 168, y: 40, width: 120, height: 72, color: "#60786f" },
    { id: "chip", label: "Chip", x: 96, y: 136, width: 120, height: 72, color: "#c4a35a" },
  ],
};

export function CanvasWidgetRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjects));
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

  return (
    <WidgetDemoFrame
      title="Canvas"
      description="The canvas reads selected objects on a plane. Geometry and hit-testing stay on the host."
      illustration="peek"
      widgetLabel="Canvas"
      widget={(
        <div className="relative min-h-[16rem]" role="listbox" aria-multiselectable="true" aria-label="Canvas objects">
          {document.objects.map((object) => (
            <SelectableItem
              key={object.id}
              role="option"
              className="absolute grid place-items-center"
              style={{
                left: object.x,
                top: object.y,
                width: object.width,
                height: object.height,
                backgroundColor: object.color,
                color: "#fff8f2",
              }}
              {...optionProps(editing.getItem(object.id))}
            >
              {object.label}
            </SelectableItem>
          ))}
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
