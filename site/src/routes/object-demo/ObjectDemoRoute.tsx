import { useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createObjectEditor,
  type ObjectClipboard,
  type ObjectDocument,
  type ObjectIntent,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { initialObjectDemoDocument, objectDemoColors } from "../../shared/demo-workbench/object-demo-document";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

export function ObjectDemoRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjectDemoDocument));
  const [clipboard, setClipboard] = useState<ObjectClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<ObjectIntent | null>(null);

  function run(intent: ObjectIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedObjects.map((object) => object.id),
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (objectId, mode) => {
      run({
        type: "selection.set",
        objectIds: [objectId],
        mode: mode === "extend" ? "add" : mode,
      }, "Selection changed");
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as ObjectDocument;

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

  return (
    <DemoPage documentation={(
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

    )}>
      <ProductApp
        toolbarLabel="Object actions"
        canvasClassName="relative min-h-[20rem] overflow-hidden"
        toolbar={(
          <>
            {objectDemoColors.map((color) => (
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
          </>
        )}
        inspector={(
          <Inspector placement="inline" items={[
            { label: "Canonical JSON", value: snapshot.value, testId: "object-demo-document", size: "tall" },
            { label: "intent", value: lastIntent, testId: "object-demo-intent", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "object-demo-selection", size: "compact" },
          ]} />
        )}
      >
        <section aria-label="Editable objects" className="contents">
          {document.objects.map((object) => (
            <SelectableItem
              key={object.id}
              selected={editing.getItem(object.id).getIsSelected()}
              focus={editing.getItem(object.id).getIsFocus()}
              data-object-id={object.id}
              onClick={editing.getItem(object.id).getPressHandler()}
              className={ui.interactive.planeItem}
              style={{
                left: object.x,
                top: object.y,
                width: object.width,
                height: object.height,
                backgroundColor: object.color,
                color: "rgb(var(--color-foreground-canvas-object))",
              }}
            >
              {object.label}
            </SelectableItem>
          ))}
          <p className={classes("absolute bottom-3 left-3 mb-0", ui.text.meta)}>Click a box. Mod-click toggles. Fill uses the selected IDs only.</p>
        </section>
      </ProductApp>
    </DemoPage>
  );
}
