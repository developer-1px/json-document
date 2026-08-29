import { useRef, useState, type KeyboardEvent } from "react";
import { ClipboardPaste, Copy, Redo2, Scissors, Trash2, Undo2 } from "lucide-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createOrderEditor,
  type OrderClipboard,
  type OrderDocument,
  type OrderIntent,
} from "@interactive-os/json-document-editing";
import { useEditing, useEditingObservation } from "@interactive-os/json-document-react";
import {
  focusWebItem,
  createWebClipboardSurface,
  lineBoundary,
  moveLinePoint,
  orderClipboardCodec,
  webFocusItemProps,
} from "@interactive-os/json-document-web";
import {
  historyAffordance,
  createLineFocusSession,
  createRenameSession,
  createTypeaheadSession,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  escapeAffordance,
  renameAffordance,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { Command, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { ProductShell } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

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
  const observation = useEditingObservation<OrderIntent>("Ready");
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: orderClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
    onResult(result) {
      if (!result.ok) return observation.announce(result.code);
      if (result.operation !== "paste") setClipboard(result.payload);
      const verb = result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted";
      observation.announce(`${verb} ${result.payload.items.length} structured item${result.payload.items.length === 1 ? "" : "s"}`);
    },
  }));
  const [focusId, setFocusId] = useState(initialOrder.items[0]?.id ?? null);
  const [renaming, setRenaming] = useState<{ readonly id: string; readonly draft: string } | null>(null);
  const orderRef = useRef<HTMLOListElement>(null);
  const [typeaheadSession] = useState(() => createTypeaheadSession<string>({
    onMatch: (itemId) => run({ type: "selection.set", itemId, mode: "replace" }, "Selection changed"),
  }));
  const [focusSession] = useState(() => createLineFocusSession<string>({
    initialKey: initialOrder.items[0]?.id ?? null,
    onFocus: (itemId) => {
      setFocusId(itemId);
    },
  }));
  const [renameSession] = useState(() => createRenameSession<string>({
    onCommit: (itemId, label) => run({ type: "item.rename", itemId, label }, "Item renamed"),
    onFinish: (itemId) => requestAnimationFrame(() => focusWebItem<HTMLElement>(orderRef.current, itemId)),
    onSnapshot: (snapshot) => setRenaming(snapshot === null ? null : { id: snapshot.key, draft: snapshot.draft }),
  }));

  function run(intent: OrderIntent, message: string) {
    return observation.dispatch(intent, editor.dispatch, message);
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
      resolve: (stroke) => editingCommandFromWebKeyboardStroke(stroke),
      focusKey: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? undefined,
      neighbor: (key, command) => command.type === "move"
        ? moveLinePoint(ids(), key, command.direction)
        : lineBoundary(ids(), command.edge),
      onDelete: () => {
        run({ type: "selection.remove" }, "Selection deleted");
      },
      onUndo: () => {
        editor.undo();
        observation.announce("Undone");
      },
      onRedo: () => {
        editor.redo();
        observation.announce("Redone");
      },
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as OrderDocument;
  const commands = historyAffordance(snapshot).hand;

  function copySelection() {
    const next = editor.copy();
    if (!next) return observation.announce("Select an item first");
    setClipboard(next);
    observation.announce(`Copied ${next.items.length} item${next.items.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut();
    if (!result) return observation.announce("Select an item first");
    setClipboard(result.clipboard);
    observation.announce(`Cut ${result.clipboard.items.length} item${result.clipboard.items.length === 1 ? "" : "s"}`);
  }

  const focusKey = focusId;

  function beginRename(itemId: string) {
    const item = document.items.find((candidate) => candidate.id === itemId);
    if (item) renameSession.begin(item.id, item.label);
  }

  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    if (focusSession.handle(event, ids())) {
      event.preventDefault();
      const next = focusSession.getFocusKey();
      if (next !== null) focusWebItem<HTMLElement>(orderRef.current, next);
      return;
    }
    applyAffordance(renameAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "rename" || hand.action !== "begin" || !focusId) return;
        event.preventDefault();
        beginRename(focusId);
      },
    });
    if (event.defaultPrevented) return;
    const consumed = typeaheadSession.handle({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      timeStamp: event.timeStamp,
      items: document.items.map((item) => ({ key: item.id, name: item.label })),
      fromKey: focusKey,
    });
    if (consumed) {
      event.preventDefault();
      return;
    }
    applyAffordance(escapeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "cancel") return;
        typeaheadSession.reset();
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
            <div aria-live="polite">{observation.announcement}</div>
          </div>
        )}
      >
        A one-line list with range selection, structured clipboard, delete, and local history.
      </PageHeader>

    )}>
      <ProductShell
        toolbarLabel="Order actions"
        toolbar={(
          <>
            <Command label="Copy" onClick={copySelection}><Copy aria-hidden="true" size={16} /></Command>
            <Command label="Cut" onClick={cutSelection}><Scissors aria-hidden="true" size={16} /></Command>
            <Command label="Paste"
              disabled={!clipboard}
              onClick={() => {
                if (!clipboard) return;
                run({ type: "clipboard.paste", clipboard }, `Pasted ${clipboard.items.length} item${clipboard.items.length === 1 ? "" : "s"}`);
              }}
            >
              <ClipboardPaste aria-hidden="true" size={16} />
            </Command>
            <Command label="Delete" onClick={() => run({ type: "selection.remove" }, "Selection deleted")}><Trash2 aria-hidden="true" size={16} /></Command>
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <Command label="Undo" disabled={commands.undo.disabled} onClick={() => { editor.undo(); observation.announce("Undone"); }}><Undo2 aria-hidden="true" size={16} /></Command>
            <Command label="Redo" disabled={commands.redo.disabled} onClick={() => { editor.redo(); observation.announce("Redone"); }}><Redo2 aria-hidden="true" size={16} /></Command>
          </>
        )}
        inspector={(
          <Inspector placement="inline" items={[
            { label: "Canonical JSON", value: snapshot.value, testId: "order-demo-document", size: "tall" },
            { label: "intent", value: observation.lastIntent, testId: "order-demo-intent", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "order-demo-selection", size: "compact" },
          ]} />
        )}
      >
        <section aria-label="Editable order">
          <ol
            ref={orderRef}
            className="m-0 grid list-none gap-1 p-0"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            {...clipboardSurface}
          >
            {document.items.map((item, index) => renaming?.id === item.id ? (
              <input
                key={item.id}
                autoFocus
                aria-label={`Rename ${item.label}`}
                value={renaming.draft}
                onChange={(event) => renameSession.update(event.currentTarget.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (renameSession.handleKey(event.key)) event.preventDefault();
                }}
                className={classes("w-full", ui.field.seamless)}
              />
            ) : (
              <SelectableItem
                key={item.id}
                id={`order-item-${item.id}`}
                data-item-id={item.id}
                {...webFocusItemProps(item.id, focusId === item.id)}
                className={classes("grid grid-cols-[2rem_1fr] text-left", ui.surface.documentBlock)}
                {...editingItemProps(editing.getItem(item.id))}
                focus={focusId === item.id}
                onFocus={() => focusSession.setFocus(item.id)}
                onClick={(event) => {
                  focusSession.setFocus(item.id);
                  editing.getItem(item.id).getPressHandler()(event);
                  renameSession.handlePointer(item.id, item.label, event.detail, event.timeStamp);
                }}
              >
                <span className={classes(ui.surface.documentIndex, ui.text.meta)}>{index + 1}</span>
                <span>{item.label}</span>
              </SelectableItem>
            ))}
          </ol>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>Shift-click selects a range. Mod-click adds or removes an item.</p>
        </section>
      </ProductShell>
    </DemoPage>
  );
}
