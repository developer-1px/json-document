import { useState, type MouseEvent } from "react";
import {
  createObjectEditor,
  type ObjectClipboard,
  type ObjectDocument,
  type ObjectIntent,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { selectionOperationFromModifiers } from "@interactive-os/json-document-web";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const colors = ["#de6d55", "#60786f", "#c4a35a", "#4d6a8a"] as const;

const initialObjects: ObjectDocument = {
  objects: [
    { id: "note", label: "Note", x: 24, y: 24, width: 120, height: 72, color: "#de6d55" },
    { id: "card", label: "Card", x: 168, y: 40, width: 120, height: 72, color: "#60786f" },
    { id: "chip", label: "Chip", x: 96, y: 136, width: 120, height: 72, color: "#c4a35a" },
  ],
};

export function ObjectDemoRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjects));
  const snapshot = useEditingSnapshot(editor);
  const [clipboard, setClipboard] = useState<ObjectClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<ObjectIntent | null>(null);
  const document = snapshot.value as ObjectDocument;
  const selected = new Set(editor.selectedObjects.map((object) => object.id));

  function run(intent: ObjectIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

  function copySelection() {
    const next = editor.copy();
    if (!next) return setAnnouncement("Select an object first");
    setClipboard(next);
    setAnnouncement(`Copied ${next.objects.length} object${next.objects.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) return setAnnouncement("Select an object first");
    setClipboard(result.clipboard);
    setAnnouncement(`Cut ${result.clipboard.objects.length} object${result.clipboard.objects.length === 1 ? "" : "s"}`);
  }

  function handleClick(event: MouseEvent, objectId: string) {
    const mode = selectionOperationFromModifiers(event);
    run({
      type: "selection.set",
      objectIds: [objectId],
      mode: mode === "extend" ? "add" : mode,
    }, "Selection changed");
  }

  return (
    <PageFrame>
      <PageHeader
        illustration="peek"
        title="Object Demo"
        aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedObjects.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
        )}
      >
        A key-family board. The host hit-tests boxes and sends only stable IDs. Fill changes color without moving geometry.
      </PageHeader>

      <div className={classes("mb-3 flex flex-wrap gap-1 p-2", ui.surface.workspace)} role="toolbar" aria-label="Object actions">
        {colors.map((color) => (
          <ActionButton
            key={color}
            aria-label={`Fill ${color}`}
            onClick={() => run({ type: "selection.fill", color }, "Fill applied")}
          >
            <span aria-hidden="true" style={{ display: "inline-block", width: "0.75rem", height: "0.75rem", backgroundColor: color }} />
          </ActionButton>
        ))}
        <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
        <ActionButton onClick={copySelection}>Copy</ActionButton>
        <ActionButton onClick={cutSelection}>Cut</ActionButton>
        <ActionButton
          disabled={!clipboard}
          onClick={() => {
            if (!clipboard) return;
            run({
              type: "clipboard.paste",
              clipboard: {
                ...clipboard,
                objects: clipboard.objects.map((object) => ({ ...object, x: object.x + 24, y: object.y + 24 })),
              },
            }, `Pasted ${clipboard.objects.length} object${clipboard.objects.length === 1 ? "" : "s"}`);
          }}
        >
          Paste
        </ActionButton>
        <ActionButton onClick={() => run({ type: "selection.remove" }, "Selection deleted")}>Delete</ActionButton>
        <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
        <ActionButton disabled={!snapshot.canUndo} onClick={() => { editor.undo(); setAnnouncement("Undone"); }}>Undo</ActionButton>
        <ActionButton disabled={!snapshot.canRedo} onClick={() => { editor.redo(); setAnnouncement("Redone"); }}>Redo</ActionButton>
      </div>

      <section aria-label="Editable objects" className={classes("relative min-h-[20rem] overflow-hidden", ui.surface.raised)}>
        {document.objects.map((object) => (
          <SelectableItem
            key={object.id}
            selected={selected.has(object.id)}
            data-object-id={object.id}
            onClick={(event) => handleClick(event, object.id)}
            className="absolute grid place-items-center"
            style={{
              left: object.x,
              top: object.y,
              width: object.width,
              height: object.height,
              backgroundColor: object.color,
              color: "#fff8f2",
            }}
          >
            {object.label}
          </SelectableItem>
        ))}
        <p className={classes("absolute bottom-3 left-3 mb-0", ui.text.meta)}>Click a box. Mod-click toggles. Fill uses the selected IDs only.</p>
      </section>

      <section className={classes("mt-4 p-3", ui.surface.raised)}>
        <Inspector items={[
          { label: "Canonical JSON", value: snapshot.value, testId: "object-demo-document", size: "tall" },
          { label: "intent", value: lastIntent, testId: "object-demo-intent", size: "compact" },
          { label: "selection", value: snapshot.selection, testId: "object-demo-selection", size: "compact" },
        ]} />
      </section>
    </PageFrame>
  );
}
