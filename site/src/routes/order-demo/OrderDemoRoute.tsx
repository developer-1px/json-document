import { useState, type MouseEvent } from "react";
import {
  createOrderEditor,
  type OrderClipboard,
  type OrderDocument,
  type OrderIntent,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { selectionOperationFromModifiers } from "@interactive-os/json-document-web";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialOrder: OrderDocument = {
  items: [
    { id: "inbox", label: "Inbox" },
    { id: "today", label: "Today" },
    { id: "later", label: "Later" },
    { id: "done", label: "Done" },
  ],
};

export function OrderDemoRoute() {
  const [editor] = useState(() => createOrderEditor(initialOrder));
  const snapshot = useEditingSnapshot(editor);
  const [clipboard, setClipboard] = useState<OrderClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<OrderIntent | null>(null);
  const document = snapshot.value as OrderDocument;
  const selected = new Set(editor.selectedItemIds);

  function run(intent: OrderIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

  function copySelection() {
    const next = editor.copy();
    if (!next) return setAnnouncement("Select an item first");
    setClipboard(next);
    setAnnouncement(`Copied ${next.items.length} item${next.items.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) return setAnnouncement("Select an item first");
    setClipboard(result.clipboard);
    setAnnouncement(`Cut ${result.clipboard.items.length} item${result.clipboard.items.length === 1 ? "" : "s"}`);
  }

  function handleClick(event: MouseEvent, itemId: string) {
    run({ type: "selection.set", itemId, mode: selectionOperationFromModifiers(event) }, "Selection changed");
  }

  return (
    <PageFrame>
      <PageHeader
        illustration="cursor"
        title="Order Demo"
        aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedItemIds.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
        )}
      >
        A one-line list with range selection, structured clipboard, delete, and local history.
      </PageHeader>

      <ProductApp
        toolbarLabel="Order actions"
        toolbar={(
          <>
            <ActionButton onClick={copySelection}>Copy</ActionButton>
            <ActionButton onClick={cutSelection}>Cut</ActionButton>
            <ActionButton
              disabled={!clipboard}
              onClick={() => {
                if (!clipboard) return;
                run({ type: "clipboard.paste", clipboard }, `Pasted ${clipboard.items.length} item${clipboard.items.length === 1 ? "" : "s"}`);
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
            { label: "Canonical JSON", value: snapshot.value, testId: "order-demo-document", size: "tall" },
            { label: "intent", value: lastIntent, testId: "order-demo-intent", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "order-demo-selection", size: "compact" },
          ]} />
        )}
      >
        <section aria-label="Editable order">
          <ol className="m-0 grid list-none gap-1 p-0">
            {document.items.map((item, index) => (
              <SelectableItem
                key={item.id}
                selected={selected.has(item.id)}
                data-item-id={item.id}
                onClick={(event) => handleClick(event, item.id)}
                className={classes("grid grid-cols-[2rem_1fr] text-left", ui.surface.documentBlock)}
              >
                <span className={classes(ui.surface.documentIndex, ui.text.meta)}>{index + 1}</span>
                <span>{item.label}</span>
              </SelectableItem>
            ))}
          </ol>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>Shift-click selects a range. Mod-click adds or removes an item.</p>
        </section>
      </ProductApp>
    </PageFrame>
  );
}
