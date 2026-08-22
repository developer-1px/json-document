import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createOrderEditor,
  type OrderClipboard,
  type OrderDocument,
  type OrderIntent,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  lineBoundary,
  moveLinePoint,
  orderClipboardCodec,
} from "@interactive-os/json-document-web";
import {
  applyAffordance,
  escapeAffordance,
  focusAffordance,
  pointerSelect,
  renameAffordance,
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
  const [webClipboard] = useState(() => createWebClipboardBinding({
    codec: orderClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<OrderIntent | null>(null);
  const [typeahead, setTypeahead] = useState({ buffer: "", at: 0 });
  const [focusId, setFocusId] = useState(initialOrder.items[0]?.id ?? null);
  const [renaming, setRenaming] = useState<{ readonly id: string; readonly draft: string } | null>(null);
  const lastClick = useRef<{ readonly id: string; readonly at: number } | null>(null);
  const orderRef = useRef<HTMLOListElement>(null);

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

  const focusKey = focusId;

  function beginRename(itemId: string) {
    const item = document.items.find((candidate) => candidate.id === itemId);
    if (item) setRenaming({ id: item.id, draft: item.label });
  }

  function finishRename() {
    if (!renaming) return;
    const itemId = renaming.id;
    run({ type: "item.rename", itemId: renaming.id, label: renaming.draft }, "Item renamed");
    setRenaming(null);
    restoreItemFocus(itemId);
  }

  function cancelRename() {
    if (!renaming) return;
    const itemId = renaming.id;
    setRenaming(null);
    restoreItemFocus(itemId);
  }

  function restoreItemFocus(itemId: string) {
    requestAnimationFrame(() => {
      orderRef.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(itemId)}"]`)?.focus();
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      editing.getKeyDownHandler()(event);
      return;
    }
    let focused = false;
    applyAffordance(focusAffordance(event), {
      hand: (hand) => {
        if (hand.type === "tab") return;
        if (hand.type === "move") {
          focused = true;
          const keys = ids();
          const from = focusId ?? keys[0];
          const next = from === undefined ? null : moveLinePoint(keys, from, hand.direction);
          setFocusId(next);
          if (next) event.currentTarget.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(next)}"]`)?.focus();
        }
        if (hand.type === "boundary") {
          focused = true;
          const next = lineBoundary(ids(), hand.edge);
          setFocusId(next);
          if (next) event.currentTarget.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(next)}"]`)?.focus();
        }
      },
    });
    if (focused) {
      event.preventDefault();
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

  function handleNativeCopy(event: ClipboardEvent<HTMLOListElement>) {
    const result = webClipboard.copy(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Copied ${result.payload.items.length} structured item${result.payload.items.length === 1 ? "" : "s"}`);
  }

  function handleNativeCut(event: ClipboardEvent<HTMLOListElement>) {
    const result = webClipboard.cut(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Cut ${result.payload.items.length} structured item${result.payload.items.length === 1 ? "" : "s"}`);
  }

  function handleNativePaste(event: ClipboardEvent<HTMLOListElement>) {
    const result = webClipboard.paste(event);
    setAnnouncement(result.ok
      ? `Pasted ${result.payload.items.length} structured item${result.payload.items.length === 1 ? "" : "s"}`
      : result.code);
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
            ref={orderRef}
            className="m-0 grid list-none gap-1 p-0"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onCopy={handleNativeCopy}
            onCut={handleNativeCut}
            onPaste={handleNativePaste}
          >
            {document.items.map((item, index) => renaming?.id === item.id ? (
              <input
                key={item.id}
                autoFocus
                aria-label={`Rename ${item.label}`}
                value={renaming.draft}
                onChange={(event) => setRenaming({ id: item.id, draft: event.currentTarget.value })}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  applyAffordance(renameAffordance(event), {
                    hand: (hand) => {
                      if (hand.type !== "rename") return;
                      if (hand.action === "commit") finishRename();
                      if (hand.action === "cancel") cancelRename();
                    },
                  });
                }}
                className={classes("w-full", ui.field.seamless)}
              />
            ) : (
              <SelectableItem
                key={item.id}
                id={`order-item-${item.id}`}
                data-item-id={item.id}
                tabIndex={focusId === item.id ? 0 : -1}
                className={classes("grid grid-cols-[2rem_1fr] text-left", ui.surface.documentBlock)}
                {...optionProps(editing.getItem(item.id))}
                focus={focusId === item.id}
                onFocus={() => setFocusId(item.id)}
                onClick={(event) => {
                  const previous = lastClick.current;
                  const intervalMs = previous?.id === item.id ? event.timeStamp - previous.at : 0;
                  lastClick.current = { id: item.id, at: event.timeStamp };
                  setFocusId(item.id);
                  applyAffordance(pointerSelect(event), {
                    hand: (hand) => {
                      if (hand.type !== "select") return;
                      run({ type: "selection.set", itemId: item.id, mode: hand.operation }, "Selection changed");
                    },
                  });
                  applyAffordance(renameAffordance({
                    type: "pointer",
                    detail: event.detail,
                    intervalMs,
                  }), {
                    hand: (hand) => {
                      if (hand.type === "rename" && hand.action === "begin") beginRename(item.id);
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
