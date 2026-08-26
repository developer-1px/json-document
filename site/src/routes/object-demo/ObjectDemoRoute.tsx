import { useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createObjectEditor,
  type ObjectClipboard,
  type ObjectDocument,
  type ObjectIntent,
} from "@interactive-os/json-document-editing";
import { useEditing, useEditingObservation } from "@interactive-os/json-document-react";
import { createWebClipboardSurface, objectClipboardCodec } from "@interactive-os/json-document-web";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
} from "@interactive-os/json-document-affordance";
import { initialObjectDemoDocument, objectDemoColors } from "../../shared/demo-workbench/object-demo-document";
import { Inspector } from "../../shared/ui/inspector";
import { IconButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

export function ObjectDemoRoute() {
  const [editor] = useState(() => createObjectEditor(initialObjectDemoDocument));
  const [clipboard, setClipboard] = useState<ObjectClipboard | null>(null);
  const observation = useEditingObservation<ObjectIntent>("Ready");
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: objectClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({
      type: "clipboard.paste",
      clipboard: payload,
      placement: { type: "offset", dx: 24, dy: 24 },
    }),
    onResult(result) {
      if (!result.ok) return observation.announce(result.code);
      if (result.operation !== "paste") setClipboard(result.payload);
      const verb = result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted";
      observation.announce(`${verb} ${result.payload.objects.length} structured object${result.payload.objects.length === 1 ? "" : "s"}`);
    },
  }));

  function run(intent: ObjectIntent, message: string) {
    return observation.dispatch(intent, editor.dispatch, message);
  }

  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedObjects.map((object) => object.id),
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (objectId, mode) => {
      run({
        type: "selection.set",
        objectIds: [objectId],
        mode,
      }, "Selection changed");
    },
    keyboard: {
      resolve: editingCommandFromWebKeyboardStroke,
      focusKey: () => editor.snapshot.selection.primaryKey ?? undefined,
      neighbor: () => null,
      onUndo: () => { editor.undo(); observation.announce("Undone"); },
      onRedo: () => { editor.redo(); observation.announce("Redone"); },
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as ObjectDocument;
  const commands = historyAffordance(snapshot).hand;

  function copySelection() {
    const next = editor.copy();
    if (!next) return observation.announce("Select an object first");
    setClipboard(next);
    observation.announce(`Copied ${next.objects.length} object${next.objects.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) return observation.announce("Select an object first");
    setClipboard(result.clipboard);
    observation.announce(`Cut ${result.clipboard.objects.length} object${result.clipboard.objects.length === 1 ? "" : "s"}`);
  }

  return (
    <DemoPage documentation={(
      <PageHeader
        illustration="peek"
        title="Object Demo"
        aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedObjects.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{observation.announcement}</div>
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
              <IconButton
                key={color}
                label={`Fill ${color}`}
                onClick={() => run({ type: "selection.fill", color }, "Fill applied")}
              >
                <span aria-hidden="true" style={{ display: "inline-block", width: "0.75rem", height: "0.75rem", backgroundColor: color }} />
              </IconButton>
            ))}
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <IconButton label="Copy" onClick={copySelection}>⧉</IconButton>
            <IconButton label="Cut" onClick={cutSelection}>✂</IconButton>
            <IconButton label="Paste"
              disabled={!clipboard}
              onClick={() => {
                if (!clipboard) return;
                run({
                  type: "clipboard.paste",
                  clipboard,
                  placement: { type: "offset", dx: 24, dy: 24 },
                }, `Pasted ${clipboard.objects.length} object${clipboard.objects.length === 1 ? "" : "s"}`);
              }}
            >
              ▣
            </IconButton>
            <IconButton label="Delete" onClick={() => run({ type: "selection.remove" }, "Selection deleted")}>⌫</IconButton>
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <IconButton label="Undo" disabled={commands.undo.disabled} onClick={() => { editor.undo(); observation.announce("Undone"); }}>↶</IconButton>
            <IconButton label="Redo" disabled={commands.redo.disabled} onClick={() => { editor.redo(); observation.announce("Redone"); }}>↷</IconButton>
          </>
        )}
        inspector={(
          <Inspector placement="inline" items={[
            { label: "Canonical JSON", value: snapshot.value, testId: "object-demo-document", size: "tall" },
            { label: "intent", value: observation.lastIntent, testId: "object-demo-intent", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "object-demo-selection", size: "compact" },
          ]} />
        )}
      >
        <section
          aria-label="Editable objects"
          className="contents"
          {...clipboardSurface}
          onKeyDown={editing.getKeyDownHandler()}
        >
          {document.objects.map((object) => (
            <SelectableItem
              key={object.id}
              data-object-id={object.id}
              className={ui.interactive.planeItem}
              {...editingItemProps(editing.getItem(object.id))}
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
