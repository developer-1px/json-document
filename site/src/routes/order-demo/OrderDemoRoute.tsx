import { useState, type KeyboardEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createOrderEditor,
  type OrderClipboard,
  type OrderDocument,
  type OrderIntent,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import {
  applyAffordance,
  escapeAffordance,
  pointerSelect,
  typeaheadAffordance,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingCommandFromStroke, historyCommands, optionProps } from "../../shared/widget-binding";

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
  const [typeahead, setTypeahead] = useState({ buffer: "", at: 0 });

  function run(intent: OrderIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

  const ids = () => (editor.snapshot.value as OrderDocument).items.map((item) => item.id);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedItemIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? null,
    onSelect: (itemId, mode) => {
      run({ type: "selection.set", itemId, mode }, "Selection changed");
    },
    keyboard: {
      resolve: (stroke) => editingCommandFromStroke(stroke),
      focusKey: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? undefined,
      neighbor: (key, command) => command.type === "move"
        ? moveLinePoint(ids(), key, command.direction)
        : lineBoundary(ids(), command.edge),
      onDelete: () => {
        run({ type: "selection.remove" }, "Selection deleted");
      },
      onUndo: () => {
        editor.undo();
        setAnnouncement("Undone");
      },
      onRedo: () => {
        editor.redo();
        setAnnouncement("Redone");
      },
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

  const focusKey = snapshot.selection.ranges[snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? null;

  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    const names = document.items.map((item) => item.label);
    const from = document.items.find((item) => item.id === focusKey)?.label ?? null;
    const result = typeaheadAffordance({
      buffer: typeahead.buffer,
      key: event.key,
      elapsedMs: event.timeStamp - typeahead.at,
      names,
      from,
    });
    let consumed = false;
    applyAffordance(result, {
      hand: (hand) => {
        if (hand.type !== "typeahead") return;
        consumed = true;
        setTypeahead({ buffer: hand.buffer, at: event.timeStamp });
        const item = document.items.find((candidate) => candidate.label === hand.name);
        if (item) run({ type: "selection.set", itemId: item.id, mode: "replace" }, "Selection changed");
      },
    });
    if (consumed) {
      event.preventDefault();
      return;
    }
    applyAffordance(escapeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "cancel") return;
        setTypeahead({ buffer: "", at: 0 });
      },
    });
    editing.getKeyDownHandler()(event);
  }

  return (
    <DemoPage documentation={(
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

    )}>
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
          <ol
            className="m-0 grid list-none gap-1 p-0"
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            {document.items.map((item, index) => (
              <SelectableItem
                key={item.id}
                data-item-id={item.id}
                className={classes("grid grid-cols-[2rem_1fr] text-left", ui.surface.documentBlock)}
                {...optionProps(editing.getItem(item.id))}
                onClick={(event) => {
                  applyAffordance(pointerSelect(event), {
                    hand: (hand) => {
                      if (hand.type !== "select") return;
                      run({ type: "selection.set", itemId: item.id, mode: hand.operation }, "Selection changed");
                    },
                  });
                }}
              >
                <span className={classes(ui.surface.documentIndex, ui.text.meta)}>{index + 1}</span>
                <span>{item.label}</span>
              </SelectableItem>
            ))}
          </ol>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>Shift-click selects a range. Mod-click adds or removes an item.</p>
        </section>
      </ProductApp>
    </DemoPage>
  );
}
