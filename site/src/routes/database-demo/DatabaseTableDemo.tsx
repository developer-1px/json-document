import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createDatabaseEditor,
  type DatabaseDocument,
  type DatabaseEditor,
  type DatabaseFilter,
  type DatabaseIntent,
  type DatabaseProperty,
  type DatabaseRecord,
  type DatabaseSelection,
  type DatabaseSort,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import { useEditingObservation, useGridEditing } from "@interactive-os/json-document-react";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  activateAffordance,
  applyAffordance,
  commitAffordance,
  disclosureAffordance,
  dragAffordance,
  dropAffordance,
} from "@interactive-os/json-document-affordance";
import { pressInteractionFromWeb, webGridCellAddressProps } from "@interactive-os/json-document-web";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { gridCellProps } from "../../shared/widget-binding";
import { initialDatabase } from "./initial-database";

const defaultWidth = 160;
const minWidth = 88;
const stubWidth = 36;

type NativeTextLease = {
  readonly recordId: string;
  readonly propertyId: string;
  readonly composing: boolean;
};

type HeaderMenu = {
  readonly propertyId: string;
  readonly x: number;
  readonly y: number;
};

type HeaderDrag = {
  readonly propertyId: string;
  readonly originX: number;
  readonly originY: number;
  moved: boolean;
};

type HeaderResize = {
  readonly propertyId: string;
  readonly originX: number;
  readonly originWidth: number;
};

export function DatabaseTableDemo() {
  const [editor] = useState<DatabaseEditor>(() => createDatabaseEditor(initialDatabase));
  const [lease, setLease] = useState<NativeTextLease | null>(null);
  const [dragPreview, setDragPreview] = useState<ReadonlyArray<string> | null>(null);
  const [widthPreview, setWidthPreview] = useState<Readonly<Record<string, number>> | null>(null);
  const [menu, setMenu] = useState<HeaderMenu | null>(null);
  const [headerDragSession] = useState(() => createWebPointerSession<HeaderDrag>({
    onCancel: () => setDragPreview(null),
  }));
  const [headerResizeSession] = useState(() => createWebPointerSession<HeaderResize>({
    onCancel: () => setWidthPreview(null),
  }));
  const observation = useEditingObservation<DatabaseIntent>("Database ready");
  const nextRecord = useRef(5);
  const document = editor.snapshot.value as DatabaseDocument;
  const view = document.views[0]!;
  const topology = editor.tableTopology(view.id);
  const visiblePropertyIds = (dragPreview ?? view.propertyOrder)
    .filter((propertyId) => view.propertyVisibility[propertyId] !== false);
  const hiddenPropertyIds = view.propertyOrder.filter((propertyId) => view.propertyVisibility[propertyId] === false);
  const properties = visiblePropertyIds.map((id) => document.schema.properties.find((property) => property.id === id)!);
  const hiddenProperties = hiddenPropertyIds.map((id) => document.schema.properties.find((property) => property.id === id)!);
  const records = topology.recordIds.map((id) => document.records.find((record) => record.id === id)!);
  const widths = { ...view.propertyWidths, ...widthPreview };

  function dispatchIntent(intent: DatabaseIntent) {
    const result: EditingResult<DatabaseSelection> = editor.dispatch(intent);
    return observation.observe(intent, result);
  }

  function run(action: () => { readonly ok: boolean }, message: string) {
    return observation.run(action, message, "That action is not available");
  }

  const focus = editor.snapshot.selection.focus;
  const editing = useGridEditing({
    source: editor,
    selectedPoints: editor.selectedCellsIn(topology).map(databaseGridPoint),
    focusPoint: focus ? databaseGridPoint(focus) : null,
    onSelect: (point, mode) => {
      const { recordId, propertyId } = databasePoint(point);
      run(() => dispatchIntent({ type: "selection.set", recordId, propertyId, mode }), "Cell selection updated");
    },
    keyboard: {
      resolve: editingCommandFromWebKeyboardStroke,
      focusPoint: () => {
        const current = editor.snapshot.selection.focus;
        return current ? databaseGridPoint(current) : undefined;
      },
      neighbor: () => null,
      onUndo: () => { run(editor.undo, "Undone"); },
      onRedo: () => { run(editor.redo, "Redone"); },
    },
  });
  const snapshot = editing.snapshot;
  const commands = historyAffordance(snapshot).hand;

  function commit(recordId: string, propertyId: string, value: string | number | boolean) {
    run(() => dispatchIntent({ type: "cell.commit", recordId, propertyId, value }), `${propertyId} committed`);
  }

  function configure(patch: Extract<DatabaseIntent, { readonly type: "view.configure" }>) {
    run(() => dispatchIntent(patch), "Table view saved in canonical JSON");
  }

  function addRecord() {
    const recordId = `page-${nextRecord.current}`;
    nextRecord.current += 1;
    run(() => dispatchIntent({ type: "record.add", recordId }), "Record added");
  }

  function deleteSelectedRecord() {
    const recordId = snapshot.selection.focus?.recordId;
    if (!recordId) return;
    run(() => dispatchIntent({ type: "record.delete", recordId }), "Record deleted");
  }

  function propertyWidth(propertyId: string) {
    return Math.max(minWidth, widths[propertyId] ?? defaultWidth);
  }

  function cycleSort(propertyId: string) {
    configure({ type: "view.configure", viewId: view.id, sort: nextSort(view.sort, propertyId) });
  }

  function hideProperty(propertyId: string) {
    configure({
      type: "view.configure",
      viewId: view.id,
      propertyVisibility: { ...view.propertyVisibility, [propertyId]: false },
    });
  }

  function showProperty(propertyId: string) {
    configure({
      type: "view.configure",
      viewId: view.id,
      propertyVisibility: { ...view.propertyVisibility, [propertyId]: true },
    });
  }

  function setFilter(filter: DatabaseFilter | null) {
    configure({ type: "view.configure", viewId: view.id, filter });
  }

  function startHeaderDrag(event: ReactPointerEvent<HTMLElement>, propertyId: string) {
    if (event.button !== 0) return;
    headerDragSession.begin(event.currentTarget, event.pointerId, {
      propertyId,
      originX: event.clientX,
      originY: event.clientY,
      moved: false,
    });
  }

  function moveHeaderDrag(event: ReactPointerEvent<HTMLElement>) {
    let drag = headerDragSession.getSnapshot()?.state;
    if (!drag) return;
    applyAffordance(dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
    });
    if (!drag.moved && Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) < 6) return;
    drag = headerDragSession.preview(event.pointerId, (state) => ({ ...state, moved: true })) ?? drag;
    const target = globalThis.document.elementFromPoint(event.clientX, event.clientY);
    const propertyId = target instanceof Element
      ? target.closest("[data-property-id]")?.getAttribute("data-property-id")
      : null;
    if (!propertyId || propertyId === drag.propertyId) return;
    applyAffordance(dropAffordance({ canDrop: true }), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
    });
    setDragPreview((current) => {
      const order = [...(current ?? view.propertyOrder)];
      const sourceIndex = order.indexOf(drag.propertyId);
      const targetIndex = order.indexOf(propertyId);
      if (sourceIndex < 0 || targetIndex < 0) return order;
      order.splice(sourceIndex, 1);
      order.splice(targetIndex, 0, drag.propertyId);
      return order;
    });
  }

  function finishHeaderDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = headerDragSession.commit(event.pointerId);
    event.currentTarget.style.cursor = "";
    const next = dragPreview;
    setDragPreview(null);
    if (!drag) return;
    if (drag.moved) {
      const committed = commitAffordance(dragAffordance(
        { x: drag.originX, y: drag.originY },
        { x: event.clientX, y: event.clientY },
      ));
      if (committed) {
        applyAffordance(committed, {
          commit: () => {
            if (next && next.join("\u0000") !== view.propertyOrder.join("\u0000")) {
              configure({ type: "view.configure", viewId: view.id, propertyOrder: next });
            }
          },
        });
      }
      return;
    }
    applyAffordance(activateAffordance(pressInteractionFromWeb({ type: "click", button: 0, detail: 1 })), {
      hand: (hand) => {
        if (hand.type !== "activate") return;
        cycleSort(drag.propertyId);
      },
    });
  }

  function startResize(event: ReactPointerEvent<HTMLElement>, propertyId: string) {
    event.stopPropagation();
    const activeDrag = headerDragSession.getSnapshot();
    if (activeDrag !== null) headerDragSession.cancel(activeDrag.pointerId, "superseded");
    headerResizeSession.begin(event.currentTarget, event.pointerId, {
      propertyId,
      originX: event.clientX,
      originWidth: propertyWidth(propertyId),
    });
  }

  function moveResize(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    const resize = headerResizeSession.getSnapshot()?.state;
    if (!resize) return;
    event.currentTarget.style.cursor = "col-resize";
    setWidthPreview({
      ...view.propertyWidths,
      [resize.propertyId]: Math.max(minWidth, resize.originWidth + (event.clientX - resize.originX)),
    });
  }

  function finishResize(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    const resize = headerResizeSession.commit(event.pointerId);
    const preview = widthPreview;
    setWidthPreview(null);
    event.currentTarget.style.cursor = "";
    if (!resize || !preview) return;
    if (preview[resize.propertyId] === view.propertyWidths[resize.propertyId]) return;
    configure({ type: "view.configure", viewId: view.id, propertyWidths: preview });
  }

  function openHeaderMenu(event: { preventDefault(): void; clientX: number; clientY: number }, propertyId: string) {
    event.preventDefault();
    setMenu({ propertyId, x: event.clientX, y: event.clientY });
  }

  function onHeaderKeyDown(event: KeyboardEvent<HTMLElement>, propertyId: string, hidden: boolean) {
    if (hidden) {
      applyAffordance(disclosureAffordance({ key: event.key, expanded: false }), {
        hand: (hand) => {
          if (hand.type !== "expand") return;
          event.preventDefault();
          showProperty(propertyId);
        },
      });
      return;
    }
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setMenu({ propertyId, x: rect.left, y: rect.bottom });
      return;
    }
    const interaction = pressInteractionFromWeb(event);
    if (interaction?.source === "keyboard" && "key" in interaction && interaction.key === "Space" && interaction.phase === "start") {
      event.preventDefault();
    }
    applyAffordance(activateAffordance(interaction), {
      hand: (hand) => {
        if (hand.type !== "activate") return;
        event.preventDefault();
        cycleSort(propertyId);
      },
    });
  }

  const menuProperty = menu ? document.schema.properties.find((property) => property.id === menu.propertyId) : null;

  return (
    <ProductApp
      toolbarLabel="Database and view actions"
      canvasClassName="relative overflow-auto p-0"
      toolbar={(
        <>
          <ActionButton kind="primary" onClick={addRecord}>New record</ActionButton>
          <ActionButton kind="danger" onClick={deleteSelectedRecord}>Delete selected</ActionButton>
          <span className={classes("mx-1 h-6 w-px", ui.surface.separator)} aria-hidden="true" />
          <ActionButton disabled={commands.undo.disabled} onClick={() => run(editor.undo, "Undone")}>Undo</ActionButton>
          <ActionButton disabled={commands.redo.disabled} onClick={() => run(editor.redo, "Redone")}>Redo</ActionButton>
          <output aria-live="polite" className={classes("ml-auto", ui.text.meta)}>{observation.announcement}</output>
          {dragPreview ? <output data-testid="property-drag-preview" className={ui.database.lease}>Local drag preview · {dragPreview.join(" → ")}</output> : null}
          {lease ? (
            <output data-testid="native-text-lease" className={ui.database.lease}>
              Native text lease · {lease.recordId}/{lease.propertyId}{lease.composing ? " · composing" : ""}
            </output>
          ) : <output data-testid="native-text-lease" className={ui.text.meta}>Structural navigation</output>}
        </>
      )}
      inspector={(
        <Inspector placement="inline" label="Inspect database state" items={[
          { label: "intent", meta: observation.lastIntent ? observation.lastIntent.type : "dispatch only", value: observation.lastIntent, testId: "database-intent-json" },
          { label: "result", meta: observation.lastResult?.ok === false ? observation.lastResult.code : observation.lastResult?.ok ? "ok" : "none yet", value: observation.lastResult, testId: "database-result-json" },
          { label: "Persistent Table view", value: view, testId: "database-view-json" },
          { label: "Structural selection", value: snapshot.selection, testId: "database-selection-json", size: "compact" },
          { label: "Canonical database", signal: `revision ${snapshot.revision}`, value: document, testId: "database-document-json" },
        ]} />
      )}
    >
        <section
          aria-label="Database editor"
          className="relative"
          tabIndex={0}
          onKeyDown={editing.getKeyDownHandler()}
        >
          <table role="grid" aria-label="Notion-style database" aria-multiselectable="true" className={classes("w-full", ui.database.table)}>
            <thead>
              <tr>
                {properties.map((property) => (
                  <th
                    key={property.id}
                    scope="col"
                    tabIndex={0}
                    data-property-id={property.id}
                    aria-sort={ariaSort(view.sort, property.id)}
                    onPointerDown={(event) => startHeaderDrag(event, property.id)}
                    onPointerMove={moveHeaderDrag}
                    onPointerUp={finishHeaderDrag}
                    onPointerCancel={(event) => headerDragSession.cancel(event.pointerId)}
                    onLostPointerCapture={(event) => headerDragSession.cancel(event.pointerId, "lost-capture")}
                    onContextMenu={(event) => openHeaderMenu(event, property.id)}
                    onKeyDown={(event) => onHeaderKeyDown(event, property.id, false)}
                    onKeyUp={(event) => onHeaderKeyDown(event, property.id, false)}
                    className={classes("relative cursor-grab px-3 py-2", ui.database.head)}
                    style={{ width: propertyWidth(property.id), minWidth: propertyWidth(property.id) }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{property.name}</span>
                      <span className={ui.database.type}>{property.type}{sortMark(view.sort, property.id)}</span>
                    </span>
                    <span
                      data-resize-edge="e"
                      data-property-id={property.id}
                      className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize"
                      onPointerDown={(event) => startResize(event, property.id)}
                      onPointerMove={moveResize}
                      onPointerUp={finishResize}
                      onPointerCancel={(event) => headerResizeSession.cancel(event.pointerId)}
                      onLostPointerCapture={(event) => headerResizeSession.cancel(event.pointerId, "lost-capture")}
                    />
                  </th>
                ))}
                {hiddenProperties.map((property) => (
                  <th
                    key={property.id}
                    scope="col"
                    tabIndex={0}
                    data-property-id={property.id}
                    data-hidden-property={property.id}
                    aria-expanded={false}
                    aria-label={`Show ${property.name}`}
                    onClick={(event) => {
                      applyAffordance(activateAffordance(pressInteractionFromWeb(event)), {
                        hand: (hand) => {
                          if (hand.type !== "activate") return;
                          showProperty(property.id);
                        },
                      });
                    }}
                    onKeyDown={(event) => onHeaderKeyDown(event, property.id, true)}
                    className={classes("cursor-pointer px-1 py-2", ui.database.head)}
                    style={{ width: stubWidth, minWidth: stubWidth }}
                  >
                    <span className="sr-only">{property.name}</span>
                    <span aria-hidden="true">·</span>
                  </th>
                ))}
                <th scope="col" className={classes("w-10 px-2 py-2", ui.database.rowAction)}>Row</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} data-record-id={record.id}>
                  {properties.map((property) => {
                    const point = databaseGridPoint({ recordId: record.id, propertyId: property.id });
                    const item = editing.getCell(point);
                    return (
                      <SelectableItem
                        as="td"
                        key={property.id}
                        {...webGridCellAddressProps(point)}
                        data-record-id={record.id}
                        data-property-id={property.id}
                        className={classes("p-0", ui.database.cell)}
                        style={{ width: propertyWidth(property.id), minWidth: propertyWidth(property.id) }}
                        {...gridCellProps(item)}
                      >
                        <PropertyEditor
                          property={property}
                          record={record}
                          onCommit={(value) => commit(record.id, property.id, value)}
                          onLease={(next) => setLease(next ? { recordId: record.id, propertyId: property.id, composing: next.composing } : null)}
                        />
                      </SelectableItem>
                    );
                  })}
                  {hiddenProperties.map((property) => (
                    <td key={property.id} className={classes("p-0", ui.database.cell)} style={{ width: stubWidth, minWidth: stubWidth }} />
                  ))}
                  <td className={classes("px-2 py-2", ui.database.rowAction)}>{record.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 ? <div className={classes("m-3 p-6", ui.surface.empty)}>No records in this view.</div> : null}
          {menu && menuProperty ? (
            <div
              role="menu"
              aria-label={`${menuProperty.name} property`}
              className={classes("fixed", ui.interactive.contextMenu)}
              style={{ left: menu.x, top: menu.y }}
            >
              <button type="button" role="menuitem" className={ui.interactive.contextMenuItem} onClick={() => { hideProperty(menuProperty.id); setMenu(null); }}>
                Hide
              </button>
              {filterItems(menuProperty).map((item) => (
                <button
                  key={String(item.value)}
                  type="button"
                  role="menuitem"
                  className={ui.interactive.contextMenuItem}
                  onClick={() => {
                    setFilter({ propertyId: menuProperty.id, operator: "equals", value: item.value });
                    setMenu(null);
                  }}
                >
                  Filter {item.label}
                </button>
              ))}
              {view.filter?.propertyId === menuProperty.id ? (
                <button type="button" role="menuitem" className={ui.interactive.contextMenuItem} onClick={() => { setFilter(null); setMenu(null); }}>
                  Clear filter
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
    </ProductApp>
  );
}

function PropertyEditor(props: {
  readonly property: DatabaseProperty;
  readonly record: DatabaseRecord;
  readonly onCommit: (value: string | number | boolean) => void;
  readonly onLease: (lease: { readonly composing: boolean } | null) => void;
}) {
  const value = props.record.values[props.property.id]!;
  if (props.property.type === "checkbox") {
    return (
      <label className="flex items-center justify-center px-3 py-2">
        <input
          type="checkbox"
          aria-label={`${props.property.name} ${props.record.id}`}
          checked={Boolean(value)}
          onChange={(event) => props.onCommit(event.currentTarget.checked)}
          className={ui.database.checkbox}
        />
      </label>
    );
  }
  if (props.property.type === "select") {
    return (
      <div className="px-2 py-1.5">
        <select
          aria-label={`${props.property.name} ${props.record.id}`}
          value={String(value)}
          onChange={(event) => props.onCommit(event.currentTarget.value)}
          className={classes("w-full", ui.database.select)}
        >
          {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
    );
  }
  const isText = props.property.type === "title" || props.property.type === "text";
  return (
    <input
      key={String(value)}
      type={props.property.type === "number" ? "number" : "text"}
      aria-label={`${props.property.name} ${props.record.id}`}
      defaultValue={String(value)}
      onFocus={() => isText && props.onLease({ composing: false })}
      onCompositionStart={() => isText && props.onLease({ composing: true })}
      onCompositionEnd={() => isText && props.onLease({ composing: false })}
      onBlur={(event) => {
        commitInput(event, props.property, props.onCommit);
        if (isText) props.onLease(null);
      }}
      className={classes("w-full min-w-0", ui.field.seamless)}
    />
  );
}

function commitInput(
  event: FocusEvent<HTMLInputElement>,
  property: DatabaseProperty,
  commit: (value: string | number) => void,
) {
  commit(property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value);
}

function nextSort(sort: DatabaseSort | null, propertyId: string): DatabaseSort | null {
  if (sort?.propertyId !== propertyId) return { propertyId, direction: "ascending" };
  if (sort.direction === "ascending") return { propertyId, direction: "descending" };
  return null;
}

function ariaSort(sort: DatabaseSort | null, propertyId: string): "ascending" | "descending" | "none" {
  if (sort?.propertyId !== propertyId) return "none";
  return sort.direction;
}

function sortMark(sort: DatabaseSort | null, propertyId: string): string {
  if (sort?.propertyId !== propertyId) return "";
  return sort.direction === "ascending" ? " ↑" : " ↓";
}

function filterItems(property: DatabaseProperty): ReadonlyArray<{ readonly label: string; readonly value: string | boolean }> {
  if (property.type === "select") return property.options.map((option) => ({ label: option.name, value: option.id }));
  if (property.type === "checkbox") return [{ label: "checked", value: true }, { label: "unchecked", value: false }];
  return [];
}

function databaseGridPoint(point: { readonly recordId: string; readonly propertyId: string }) {
  return { rowId: point.recordId, columnId: point.propertyId };
}

function databasePoint(point: { readonly rowId: string; readonly columnId: string }) {
  return { recordId: point.rowId, propertyId: point.columnId };
}
