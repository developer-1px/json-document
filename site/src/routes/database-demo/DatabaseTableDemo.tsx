import {
  useRef,
  useState,
} from "react";
import {
  createDatabaseEditor,
  type DatabaseDocument,
  type DatabaseEditor,
  type DatabaseIntent,
  type DatabaseProperty,
  type DatabaseSelection,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import { useEditingObservation, useGridEditing } from "@interactive-os/json-document-react";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  activateAffordance,
  applyAffordance,
} from "@interactive-os/json-document-affordance";
import {
  pressInteractionFromWeb,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { gridCellProps } from "../../shared/widget-binding";
import { initialDatabase } from "./initial-database";
import { DatabasePropertyEditor, type DatabaseNativeTextLease } from "./DatabasePropertyEditor";
import {
  databaseSortAriaValue,
  databaseSortMark,
  useDatabaseTableHeaderInteractions,
} from "./useDatabaseTableHeaderInteractions";

const stubWidth = 36;

export function DatabaseTableDemo() {
  const [editor] = useState<DatabaseEditor>(() => createDatabaseEditor(initialDatabase));
  const [lease, setLease] = useState<DatabaseNativeTextLease | null>(null);
  const observation = useEditingObservation<DatabaseIntent>("Database ready");
  const nextRecord = useRef(5);
  const document = editor.snapshot.value as DatabaseDocument;
  const view = document.views[0]!;
  const header = useDatabaseTableHeaderInteractions(view, configure);
  const { dragPreview, menu, propertyWidth } = header;
  const topology = editor.tableTopology(view.id);
  const visiblePropertyIds = (dragPreview ?? view.propertyOrder)
    .filter((propertyId) => view.propertyVisibility[propertyId] !== false);
  const hiddenPropertyIds = view.propertyOrder.filter((propertyId) => view.propertyVisibility[propertyId] === false);
  const properties = visiblePropertyIds.map((id) => document.schema.properties.find((property) => property.id === id)!);
  const hiddenProperties = hiddenPropertyIds.map((id) => document.schema.properties.find((property) => property.id === id)!);
  const records = topology.recordIds.map((id) => document.records.find((record) => record.id === id)!);

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
                    aria-sort={databaseSortAriaValue(view.sort, property.id)}
                    onPointerDown={(event) => header.startDrag(event, property.id)}
                    onPointerMove={header.moveDrag}
                    onPointerUp={header.finishDrag}
                    onPointerCancel={(event) => header.cancelDrag(event.pointerId)}
                    onLostPointerCapture={(event) => header.cancelDrag(event.pointerId, "lost-capture")}
                    onContextMenu={(event) => header.openMenu(event, property.id)}
                    onKeyDown={(event) => header.onKeyDown(event, property.id, false)}
                    onKeyUp={(event) => header.onKeyDown(event, property.id, false)}
                    className={classes("relative cursor-grab px-3 py-2", ui.database.head)}
                    style={{ width: propertyWidth(property.id), minWidth: propertyWidth(property.id) }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{property.name}</span>
                      <span className={ui.database.type}>{property.type}{databaseSortMark(view.sort, property.id)}</span>
                    </span>
                    <span
                      data-resize-edge="e"
                      data-property-id={property.id}
                      className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize"
                      onPointerDown={(event) => header.startResize(event, property.id)}
                      onPointerMove={header.moveResize}
                      onPointerUp={header.finishResize}
                      onPointerCancel={(event) => header.cancelResize(event.pointerId)}
                      onLostPointerCapture={(event) => header.cancelResize(event.pointerId, "lost-capture")}
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
                          header.showProperty(property.id);
                        },
                      });
                    }}
                    onKeyDown={(event) => header.onKeyDown(event, property.id, true)}
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
                        <DatabasePropertyEditor
                          property={property}
                          record={record}
                          onCommit={(value) => commit(record.id, property.id, value)}
                          onLease={setLease}
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
              <button type="button" role="menuitem" className={ui.interactive.contextMenuItem} onClick={() => { header.hideProperty(menuProperty.id); header.closeMenu(); }}>
                Hide
              </button>
              {filterItems(menuProperty).map((item) => (
                <button
                  key={String(item.value)}
                  type="button"
                  role="menuitem"
                  className={ui.interactive.contextMenuItem}
                  onClick={() => {
                    header.setFilter({ propertyId: menuProperty.id, operator: "equals", value: item.value });
                    header.closeMenu();
                  }}
                >
                  Filter {item.label}
                </button>
              ))}
              {view.filter?.propertyId === menuProperty.id ? (
                <button type="button" role="menuitem" className={ui.interactive.contextMenuItem} onClick={() => { header.setFilter(null); header.closeMenu(); }}>
                  Clear filter
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
    </ProductApp>
  );
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
