import { useState } from "react";
import {
  createOrderEditor,
  type OrderClipboard,
  type OrderDocument,
  type OrderIntent,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { historyCommands, optionProps } from "../../shared/widget-binding";

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
  const [clipboard, setClipboard] = useState<OrderClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<OrderIntent | null>(null);

  function run(intent: OrderIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedItemIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? null,
    onSelect: (itemId, mode) => {
      run({ type: "selection.set", itemId, mode }, "Selection changed");
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as OrderDocument;
  const commands = historyCommands(snapshot);

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
            <ActionButton disabled={commands.undo.disabled} onClick={() => { editor.undo(); setAnnouncement("Undone"); }}>Undo</ActionButton>
            <ActionButton disabled={commands.redo.disabled} onClick={() => { editor.redo(); setAnnouncement("Redone"); }}>Redo</ActionButton>
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
                data-item-id={item.id}
                className={classes("grid grid-cols-[2rem_1fr] text-left", ui.surface.documentBlock)}
                {...optionProps(editing.getItem(item.id))}
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
