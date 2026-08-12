import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  idlePointerInteraction,
  reduceMarqueeInteraction,
  type KeySelection,
  type MaskSelection,
  type PointerInteractionState,
  type SelectionOperation,
} from "@interactive-os/json-document-selection";
import {
  deleteRecords,
  gridContext,
  gridFields,
  gridRangeFamily,
  keyFamily,
  orderContext,
  recordContext,
  recordRangeFamily,
  selectedGridTargets,
  selectedRecordIds,
  treeContext,
  useWorkspaceSession,
  visibleTreeIds,
  type GridField,
  type GridPoint,
  type WorkspaceDocument,
  type WorkspaceRecord,
  type WorkspaceSession,
  type WorkspaceState,
} from "./selection-workbench-state";
import { CodeBlock } from "../../shared/ui/code-block";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { Button, PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

type FamilyId = "order" | "grid" | "objects" | "tree" | "protocols";
type HistoryClass = "selection-only" | "document-mutation" | "undo" | "redo" | "reconcile" | "cancel";

interface ContractTrace {
  readonly input: { readonly source: string; readonly physical: string };
  readonly adapter: {
    readonly operation: SelectionOperation | "undo" | "redo" | "reconcile" | "edit";
  };
  readonly family: { readonly name: "key" | "range" | "mask"; readonly command: unknown };
  readonly lifecycle: {
    readonly stage: "transition" | "reconcile" | "map" | "cancel";
    readonly before: unknown;
    readonly after: unknown;
    readonly targets: unknown;
  };
  readonly history: { readonly classification: HistoryClass; readonly createsEntry: boolean };
}

interface TimelineEntry {
  readonly id: number;
  readonly label: string;
  readonly classification: HistoryClass;
}

const families: ReadonlyArray<{
  readonly id: FamilyId;
  readonly label: string;
  readonly detail: string;
}> = [
  { id: "order", label: "Order", detail: "1D projection" },
  { id: "grid", label: "Grid", detail: "2D projection" },
  { id: "objects", label: "Objects", detail: "geometry projection" },
  { id: "tree", label: "Tree", detail: "hierarchy projection" },
  { id: "protocols", label: "Protocols", detail: "all + scope + mask" },
];

export function SelectionLabRoute() {
  const [family, setFamily] = useState<FamilyId>("objects");
  const session = useWorkspaceSession();

  return (
    <PageFrame>
        <PageHeader
          illustration="cursor"
          label="One canonical document · family-owned selection"
          title="Selection Workbench"
          aside={(
            <span className={classes("inline-block px-3 py-1.5", ui.surface.workspace, ui.text.meta)}>
              Same document → different projection
            </span>
          )}
        >
            Every family projects the same records through a different topology. Document mutations and history are shared; selection and editing state remain family-specific.
        </PageHeader>

        <SharedDocumentStrip session={session} />

        <nav
          aria-label="Selection family"
          className={classes("mb-4 grid grid-cols-2 gap-1 p-1 md:grid-cols-5", ui.surface.workspace)}
        >
          {families.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={family === item.id}
              onClick={() => setFamily(item.id)}
              className={classes("px-3 py-2 text-left", ui.workbench.tab)}
            >
              <span className={classes("block", ui.text.label)}>{item.label}</span>
              <span className={classes("block opacity-60", ui.workbench.darkMeta)}>{item.detail}</span>
            </button>
          ))}
        </nav>

        {family === "order" && <OrderWorkbench session={session} />}
        {family === "grid" && <GridWorkbench session={session} />}
        {family === "objects" && <ObjectWorkbench session={session} />}
        {family === "tree" && <TreeWorkbench session={session} />}
        {family === "protocols" && <ProtocolWorkbench session={session} />}
    </PageFrame>
  );
}

function SharedDocumentStrip({ session }: { readonly session: WorkspaceSession }) {
  return (
    <section aria-label="Shared canonical document" className={classes("mb-4 px-4 py-3", ui.workbench.darkStrip)}>
      <div className="flex flex-wrap items-center gap-2">
        <strong className={classes("mr-2", ui.workbench.darkLabel)}>Canonical records</strong>
        {session.state.document.records.map((record) => (
          <span key={record.id} data-testid={`shared-record-${record.id}`} className={classes("px-2 py-1", ui.workbench.darkChip)}>
            {record.label} · {record.status}
          </span>
        ))}
        <span className={classes("ml-auto", ui.workbench.darkMeta)}>
          {session.state.document.records.length} records · {session.canUndo ? "history available" : "clean history"}
        </span>
      </div>
    </section>
  );
}

function useContractLog() {
  const [trace, setTrace] = useState<ContractTrace | null>(null);
  const [timeline, setTimeline] = useState<ReadonlyArray<TimelineEntry>>([]);

  function record(next: ContractTrace, label: string) {
    setTrace(next);
    setTimeline((current) => [
      ...current.slice(-7),
      {
        id: (current.at(-1)?.id ?? 0) + 1,
        label,
        classification: next.history.classification,
      },
    ]);
  }

  return { trace, timeline, record };
}

function Workbench(props: {
  readonly title: string;
  readonly family: string;
  readonly affordances: ReadonlyArray<string>;
  readonly affordance: string;
  readonly onAffordance: (value: string) => void;
  readonly scenarios: ReactNode;
  readonly selection: unknown;
  readonly session: WorkspaceState;
  readonly trace: ContractTrace | null;
  readonly timeline: ReadonlyArray<TimelineEntry>;
  readonly testId: string;
  readonly children: ReactNode;
}) {
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <section
      aria-label={`${props.title} selection workbench`}
      className={classes("overflow-hidden", ui.surface.raised)}
    >
      <div className={classes("grid gap-4 p-4 lg:grid-cols-[1fr_auto]", ui.frame.header)}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={classes("m-0", ui.text.heading)}>{props.title}</h2>
            <Badge>{props.family}</Badge>
          </div>
          <p className={classes("mb-0 mt-1", ui.text.meta)}>
            This projection owns its selection; the canonical records and document history live above every family.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Affordance">
          <span className={classes("mr-1 uppercase", ui.text.label)}>Affordance</span>
          {props.affordances.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={props.affordance === item}
              onClick={() => props.onAffordance(item)}
              className={classes("px-2 py-1", ui.action.toggle)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 p-4">
          <div className={classes("mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2", ui.surface.inset)}>
            <span className={ui.text.meta}>
              Active view: <strong className={ui.text.heading}>{props.affordance}</strong>
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <span className={classes("mr-1 uppercase", ui.text.label)}>Scenarios</span>
              {props.scenarios}
            </div>
          </div>
          {props.children}
        </div>

        <aside className={classes("p-3", ui.workbench.sidebar)}>
          <h3 className={classes("m-0 uppercase", ui.text.label)}>Family selection</h3>
          <JsonOutput label="Selection" testId={`${props.testId}-selection-json`} value={props.selection} compact />
          <JsonOutput
            label="Canonical document"
            testId={`${props.testId}-document-json`}
            value={props.session.document}
            compact
          />
          <h3 className={classes("mb-2 mt-4 uppercase", ui.text.label)}>History timeline</h3>
          <ol data-testid={`${props.testId}-timeline`} className="m-0 grid list-none gap-1 p-0">
            {props.timeline.length === 0 && <li className={ui.text.meta}>No interaction in this family yet</li>}
            {props.timeline.map((entry) => (
              <li key={entry.id} className={classes("flex items-center gap-2", ui.text.meta)}>
                <span className={classes("px-1.5 py-0.5", ui.surface.workspace)}>{entry.id}</span>
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                <span className={ui.workbench.darkMeta}>{entry.classification}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <div className={ui.surface.divider}>
        <button
          type="button"
          aria-expanded={inspectorOpen}
          onClick={() => setInspectorOpen((open) => !open)}
          className={classes("flex w-full items-center justify-between px-4 py-3 text-left", ui.workbench.inspectorToggle)}
        >
          Contract inspector <span>{inspectorOpen ? "Hide ↑" : "Open ↓"}</span>
        </button>
        {inspectorOpen && <ContractInspector trace={props.trace} testId={props.testId} />}
      </div>
    </section>
  );
}

function ContractInspector({ trace, testId }: { readonly trace: ContractTrace | null; readonly testId: string }) {
  const cells = trace === null ? [] : [
    ["1 · physical input", trace.input],
    ["2 · platform adapter", trace.adapter],
    ["3 · family command", trace.family],
    ["4 · lifecycle result", trace.lifecycle],
    ["5 · history policy", trace.history],
  ] as const;

  return (
    <div data-testid={`${testId}-contract-inspector`} className={classes("grid gap-px md:grid-cols-5", ui.workbench.inspectorGrid)}>
      {trace === null ? (
        <p className={classes("col-span-full m-0 p-4", ui.workbench.inspectorCell, ui.text.meta)}>
          Interact with the active view to trace the complete host → core → shared document path.
        </p>
      ) : cells.map(([label, value]) => (
        <div key={label} className={classes("min-w-0 p-3", ui.workbench.inspectorCell)}>
          <div className={classes("mb-2", ui.workbench.inspectorLabel)}>{label}</div>
          <CodeBlock language="json" size="compact" source={JSON.stringify(value, null, 2)} />
        </div>
      ))}
    </div>
  );
}

function OrderWorkbench({ session }: { readonly session: WorkspaceSession }) {
  const state = session.state;
  const document = state.document;
  const selection = state.selections.order;
  const selected = new Set(selectedRecordIds(selection, document));
  const [affordance, setAffordance] = useState("List");
  const log = useContractLog();

  function select(event: MouseEvent, recordId: string) {
    const operation = operationFromMouse(event);
    const command = rangeCommand(operation, { recordId });
    const result = recordRangeFamily.transition(selection, command, orderContext(document));
    session.select((current) => ({
      ...current,
      selections: { ...current.selections, order: result.state },
    }));
    log.record(
      trace("range", `${event.type} ${recordId}`, operation, command, selection, result.state, selectedRecordIds(result.state, document), "transition", "selection-only"),
      `Select ${recordId}`,
    );
  }

  function removeSelection() {
    const targets = selectedRecordIds(selection, document);
    const after = session.mutate("order.remove", (current) => deleteRecords(current, new Set(targets)));
    log.record(
      trace("range", "Delete selection", "edit", { type: "records.remove", ids: targets }, selection, after.selections.order, selectedRecordIds(after.selections.order, after.document), "map", "document-mutation"),
      "Delete shared records",
    );
  }

  const history = historyActions(session, "range", selection, log.record);

  return (
    <Workbench
      title="Order"
      family="range · ordered projection"
      affordances={["List", "Timeline", "Compact"]}
      affordance={affordance}
      onAffordance={setAffordance}
      scenarios={<><Action label="Delete selection" onClick={removeSelection} /><HistoryActions session={session} actions={history} /></>}
      selection={selection}
      session={state}
      trace={log.trace}
      timeline={log.timeline}
      testId="order"
    >
      <div className={affordance === "Timeline" ? "flex gap-2 overflow-auto py-5" : affordance === "Compact" ? ui.workbench.compactList : "grid gap-2"}>
        {document.records.map((record, index) => (
          <button
            key={record.id}
            type="button"
            aria-label={`Order ${record.label}`}
            aria-pressed={selected.has(record.id)}
            onClick={(event) => select(event, record.id)}
            className={classes(affordance === "Timeline" ? "min-w-28" : "w-full", "flex items-center gap-3 px-3 py-2 text-left", ui.workbench.item)}
          >
            <span className={ui.text.meta}>{index + 1}</span>
            <span className="flex-1">{record.label}</span>
            <span className={ui.workbench.darkMeta}>{record.status}</span>
          </button>
        ))}
      </div>
    </Workbench>
  );
}

function GridWorkbench({ session }: { readonly session: WorkspaceSession }) {
  const state = session.state;
  const document = state.document;
  const selection = state.selections.grid;
  const selected = new Set(selectedGridTargets(selection, document));
  const [affordance, setAffordance] = useState("Spreadsheet");
  const log = useContractLog();

  function select(event: MouseEvent, point: GridPoint) {
    const operation = operationFromMouse(event);
    const command = rangeCommand(operation, point);
    const result = gridRangeFamily.transition(selection, command, gridContext(document));
    session.select((current) => ({
      ...current,
      gridCurrent: point,
      selections: { ...current.selections, grid: result.state },
    }));
    log.record(
      trace("range", `${event.type} ${point.recordId}:${point.field}`, operation, command, selection, result.state, selectedGridTargets(result.state, document), "transition", "selection-only"),
      `Select ${point.recordId}:${point.field}`,
    );
  }

  function fillSelection() {
    const targets = new Set(selectedGridTargets(selection, document));
    const after = session.mutate("grid.fill", (current) => ({
      records: current.records.map((record) => {
        let next = record;
        if (targets.has(`${record.id}:label`)) next = { ...next, label: "Selected" };
        if (targets.has(`${record.id}:status`)) next = { ...next, status: "Selected" };
        if (targets.has(`${record.id}:color`)) next = { ...next, color: "#8b5cf6" };
        return next;
      }),
    }));
    log.record(
      trace("range", "Fill selection", "edit", { type: "grid.fill", targets: [...targets] }, selection, after.selections.grid, [...targets], "map", "document-mutation"),
      "Fill shared fields",
    );
  }

  function enterEdit() {
    if (state.gridCurrent === null) return;
    session.select((current) => ({
      ...current,
      editing: { kind: "edit", lease: `cell:${state.gridCurrent!.recordId}:${state.gridCurrent!.field}` },
    }));
    log.record(
      trace("range", "Enter / double click", "edit", { type: "native-text.acquire", point: state.gridCurrent }, selection, selection, selectedGridTargets(selection, document), "transition", "selection-only"),
      "Acquire native text lease",
    );
  }

  const history = historyActions(session, "range", selection, log.record);

  return (
    <Workbench
      title="Grid"
      family="range · record × field projection"
      affordances={["Spreadsheet", "Heatmap", "Records"]}
      affordance={affordance}
      onAffordance={setAffordance}
      scenarios={<><Action label="Fill selection" onClick={fillSelection} /><Action label="Edit current" disabled={state.gridCurrent === null} onClick={enterEdit} /><Action label="Exit edit" disabled={state.editing.kind === "navigate"} onClick={() => session.select((current) => ({ ...current, editing: { kind: "navigate" } }))} /><HistoryActions session={session} actions={history} /></>}
      selection={selection}
      session={state}
      trace={log.trace}
      timeline={log.timeline}
      testId="grid"
    >
      <div data-testid="grid-editing-state" className={classes("mb-2", ui.text.meta)}>
        current: {state.gridCurrent === null ? "none" : `${state.gridCurrent.recordId}:${state.gridCurrent.field}`} · editing: {state.editing.kind}
      </div>
      <div className={affordance === "Records" ? "grid gap-2" : "grid grid-cols-3 gap-1"}>
        {document.records.flatMap((record) => (
          gridFields.map((field) => (
            <CellButton
              key={`${record.id}:${field}`}
              point={{ recordId: record.id, field }}
              value={record[field]}
              selected={selected.has(`${record.id}:${field}`)}
              heatmap={affordance === "Heatmap"}
              records={affordance === "Records"}
              onSelect={select}
              onEdit={enterEdit}
            />
          ))
        ))}
      </div>
    </Workbench>
  );
}

function CellButton(props: {
  readonly point: GridPoint;
  readonly value: string;
  readonly selected: boolean;
  readonly heatmap: boolean;
  readonly records: boolean;
  readonly onSelect: (event: MouseEvent, point: GridPoint) => void;
  readonly onEdit: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Grid ${props.point.recordId} ${props.point.field}`}
      aria-pressed={props.selected}
      onClick={(event) => props.onSelect(event, props.point)}
      onDoubleClick={props.onEdit}
      className={classes("px-2 py-3", ui.workbench.itemStrong)}
    >
      <span className={classes("block uppercase", ui.workbench.darkMeta)}>{props.point.recordId} · {props.point.field}</span>
      {props.point.field === "color" ? <span className={classes("mx-auto mt-1 block h-4 w-10", ui.surface.inset)} style={{ background: props.value }} /> : props.value}
    </button>
  );
}

type CanvasPoint = { readonly x: number; readonly y: number };
type DragBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

function ObjectWorkbench({ session }: { readonly session: WorkspaceSession }) {
  const state = session.state;
  const document = state.document;
  const selection = state.selections.objects;
  const context = recordContext(document);
  const selected = new Set(keyFamily.targets(selection, context));
  const [affordance, setAffordance] = useState("Canvas");
  const [regionMode, setRegionMode] = useState<"intersects" | "contains">("intersects");
  const [pointMode, setPointMode] = useState<"topmost" | "deepest">("topmost");
  const dragRef = useRef<PointerInteractionState<CanvasPoint>>(idlePointerInteraction());
  const [drag, setDrag] = useState<DragBox | null>(null);
  const log = useContractLog();

  function applyKeySelection(operation: SelectionOperation, ids: ReadonlyArray<string>, physical: string) {
    const command = { type: operation === "extend" ? "add" : operation, keys: ids } as const;
    const result = keyFamily.transition(selection, command, context);
    session.select((current) => ({
      ...current,
      selections: { ...current.selections, objects: result.state },
    }));
    log.record(
      trace("key", physical, operation, command, selection, result.state, keyFamily.targets(result.state, context), "transition", "selection-only"),
      `Select ${ids.join(", ") || "empty"}`,
    );
  }

  function selectObject(event: MouseEvent, recordId: string) {
    applyKeySelection(operationFromMouse(event), [recordId], `${event.type} ${recordId}`);
  }

  function localPoint(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function marquee(event: PointerEvent<HTMLDivElement>, phase: "start" | "move" | "end" | "cancel") {
    if (phase === "start" && event.target !== event.currentTarget) return;
    const point = localPoint(event);
    const sample = phase === "cancel"
      ? { phase, pointerId: String(event.pointerId) } as const
      : {
          phase,
          pointerId: String(event.pointerId),
          point,
          ...(phase === "start" ? { operation: pointerOperation(event, "add") } : {}),
        } as Parameters<typeof reduceMarqueeInteraction<CanvasPoint, DragBox, string>>[1];
    if (phase === "start") event.currentTarget.setPointerCapture(event.pointerId);
    const result = reduceMarqueeInteraction(dragRef.current, sample, marqueeContext(document.records, regionMode));
    dragRef.current = result.state;
    setDrag(result.preview?.region ?? null);
    if (result.commit !== null) applyKeySelection(result.commit.operation, result.commit.keys, `pointer ${phase} · ${regionMode}`);
    if (phase === "cancel") {
      log.record(trace("key", "pointercancel", "replace", { type: "preview.clear" }, selection, selection, [], "cancel", "cancel"), "Cancel pointer preview");
    }
    if (phase === "end" || phase === "cancel") setDrag(null);
  }

  function hitOverlap() {
    const point = { x: 110, y: 70 };
    const id = marqueeContext(document.records, regionMode).spatialIndex.hitPoint(point, pointMode);
    if (id !== null) applyKeySelection("replace", [id], `host ${pointMode} hit @ 110,70`);
  }

  function renameSelection() {
    const ids = new Set(keyFamily.targets(selection, context));
    const after = session.mutate("objects.rename", (current) => ({
      records: current.records.map((record) => ids.has(record.id) ? { ...record, label: `${record.label} ★` } : record),
    }));
    log.record(
      trace("key", "Rename selected records", "edit", { type: "records.rename", ids: [...ids] }, selection, after.selections.objects, keyFamily.targets(after.selections.objects, recordContext(after.document)), "reconcile", "document-mutation"),
      "Rename shared records",
    );
  }

  function colorSelection() {
    const ids = new Set(keyFamily.targets(selection, context));
    const after = session.mutate("objects.color", (current) => ({
      records: current.records.map((record) => ids.has(record.id) ? { ...record, color: "#8b5cf6" } : record),
    }));
    log.record(
      trace("key", "Color selected records", "edit", { type: "records.color", ids: [...ids] }, selection, after.selections.objects, [...ids], "reconcile", "document-mutation"),
      "Color shared records",
    );
  }

  function removeSelection() {
    const ids = new Set(keyFamily.targets(selection, context));
    const after = session.mutate("objects.remove", (current) => deleteRecords(current, ids));
    log.record(
      trace("key", "Delete selected records", "edit", { type: "records.remove", ids: [...ids] }, selection, after.selections.objects, keyFamily.targets(after.selections.objects, recordContext(after.document)), "map", "document-mutation"),
      "Delete shared records",
    );
  }

  const history = historyActions(session, "key", selection, log.record);

  return (
    <Workbench
      title="Objects"
      family="key · geometry projection"
      affordances={["Canvas", "Layer list", "Cards"]}
      affordance={affordance}
      onAffordance={setAffordance}
      scenarios={<><select aria-label="Region hit mode" value={regionMode} onChange={(event) => setRegionMode(event.target.value as typeof regionMode)} className={classes("px-2 py-1", ui.field.control)}><option value="intersects">intersects</option><option value="contains">contains</option></select><select aria-label="Point hit mode" value={pointMode} onChange={(event) => setPointMode(event.target.value as typeof pointMode)} className={classes("px-2 py-1", ui.field.control)}><option value="topmost">topmost</option><option value="deepest">deepest</option></select><Action label="Hit overlap" onClick={hitOverlap} /><Action label="Rename" onClick={renameSelection} /><Action label="Color" onClick={colorSelection} /><Action label="Delete" onClick={removeSelection} /><HistoryActions session={session} actions={history} /></>}
      selection={selection}
      session={state}
      trace={log.trace}
      timeline={log.timeline}
      testId="object"
    >
      {affordance === "Canvas" ? (
        <div
          data-testid="object-stage"
          onPointerDown={(event) => marquee(event, "start")}
          onPointerMove={(event) => dragRef.current.kind !== "idle" && marquee(event, "move")}
          onPointerUp={(event) => marquee(event, "end")}
          onPointerCancel={(event) => marquee(event, "cancel")}
          className={classes("relative h-64 touch-none select-none overflow-hidden", ui.workbench.canvas)}
        >
          {document.records.map((record) => (
            <button
              key={record.id}
              type="button"
              aria-label={`Object ${record.label}`}
              aria-pressed={selected.has(record.id)}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => selectObject(event, record.id)}
              className={classes("absolute", ui.workbench.canvasObject)}
              style={objectStyle(record)}
            >
              {record.label}
            </button>
          ))}
          {drag && <div className={classes("pointer-events-none absolute", ui.workbench.marquee)} style={{ left: drag.x, top: drag.y, width: drag.width, height: drag.height }} />}
        </div>
      ) : (
        <div className={affordance === "Cards" ? "grid grid-cols-2 gap-2" : "grid gap-1"}>
          {document.records.map((record, index) => (
            <button
              key={record.id}
              type="button"
              aria-label={`Object ${record.label}`}
              aria-pressed={selected.has(record.id)}
              onClick={(event) => selectObject(event, record.id)}
              className={classes(affordance === "Cards" && "h-24", "flex items-center gap-3 p-3 text-left", ui.workbench.item)}
            >
              <span className={classes("h-4 w-4", ui.surface.inset)} style={{ background: record.color }} />
              <span className="flex-1">{record.label}</span>
              <span className={ui.text.meta}>{index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </Workbench>
  );
}

function TreeWorkbench({ session }: { readonly session: WorkspaceSession }) {
  const state = session.state;
  const document = state.document;
  const selection = state.selections.tree;
  const context = treeContext(document, state.expanded);
  const visibleIds = visibleTreeIds(document.records, new Set(state.expanded));
  const selected = new Set(recordRangeFamily.targets(selection, context));
  const [affordance, setAffordance] = useState("Outline");
  const log = useContractLog();

  function select(event: MouseEvent, recordId: string) {
    const operation = operationFromMouse(event);
    const command = rangeCommand(operation, { recordId });
    const result = recordRangeFamily.transition(selection, command, context);
    session.select((current) => ({
      ...current,
      selections: { ...current.selections, tree: result.state },
    }));
    log.record(
      trace("range", `${event.type} ${recordId}`, operation, command, selection, result.state, recordRangeFamily.targets(result.state, context), "transition", "selection-only"),
      `Select ${recordId}`,
    );
  }

  function toggle(recordId: string) {
    const expanded = new Set(state.expanded);
    if (expanded.has(recordId)) expanded.delete(recordId);
    else expanded.add(recordId);
    const nextExpanded = [...expanded];
    const result = recordRangeFamily.reconcile(selection, treeContext(document, nextExpanded));
    session.select((current) => ({
      ...current,
      expanded: nextExpanded,
      selections: { ...current.selections, tree: result.state },
    }));
    log.record(
      trace("range", `Toggle ${recordId}`, "reconcile", { type: "topology.visible", expanded: nextExpanded }, selection, result.state, recordRangeFamily.targets(result.state, treeContext(document, nextExpanded)), "reconcile", "reconcile"),
      `Reconcile ${recordId}`,
    );
  }

  function removeSelection() {
    const ids = new Set(recordRangeFamily.targets(selection, context));
    const after = session.mutate("tree.remove", (current) => deleteRecords(current, ids));
    log.record(
      trace("range", "Delete selected branch", "edit", { type: "records.remove", ids: [...ids] }, selection, after.selections.tree, recordRangeFamily.targets(after.selections.tree, treeContext(after.document, after.expanded)), "map", "document-mutation"),
      "Delete shared branch",
    );
  }

  const history = historyActions(session, "range", selection, log.record);

  return (
    <Workbench
      title="Tree"
      family="range · hierarchy projection"
      affordances={["Outline", "Visible order", "Cards"]}
      affordance={affordance}
      onAffordance={setAffordance}
      scenarios={<><Action label="Toggle Alpha" onClick={() => toggle("alpha")} /><Action label="Delete selection" onClick={removeSelection} /><HistoryActions session={session} actions={history} /></>}
      selection={selection}
      session={state}
      trace={log.trace}
      timeline={log.timeline}
      testId="tree"
    >
      <output data-testid="tree-visible-order" className={classes("mb-3 block px-2 py-1", ui.surface.inset, ui.text.meta)}>
        visible: {visibleIds.join(" → ")}
      </output>
      <div className={affordance === "Visible order" ? "flex gap-2 overflow-auto py-3" : affordance === "Cards" ? "grid grid-cols-2 gap-2" : "grid gap-1"}>
        {document.records.filter((record) => visibleIds.includes(record.id)).map((record) => {
          const hasChildren = document.records.some((candidate) => candidate.parentId === record.id);
          const depth = treeDepth(record, document.records);
          return (
            <div key={record.id} className={affordance === "Visible order" ? "min-w-32" : "flex"} style={affordance === "Outline" ? { paddingLeft: depth * 18 } : undefined}>
              {affordance === "Outline" && hasChildren ? (
                <button type="button" aria-label={`${state.expanded.includes(record.id) ? "Collapse" : "Expand"} ${record.label}`} onClick={() => toggle(record.id)} className={classes("w-8 shrink-0", ui.action.secondary)}>
                  {state.expanded.includes(record.id) ? "−" : "+"}
                </button>
              ) : affordance === "Outline" ? <span className="w-8" /> : null}
              <button type="button" aria-label={`Tree ${record.label}`} aria-pressed={selected.has(record.id)} onClick={(event) => select(event, record.id)} className={classes(affordance === "Cards" && "h-20", "min-w-0 flex-1 px-2 py-2 text-left", ui.workbench.item)}>
                {record.label}
              </button>
            </div>
          );
        })}
      </div>
    </Workbench>
  );
}

function ProtocolWorkbench({ session }: { readonly session: WorkspaceSession }) {
  const state = session.state;
  const document = state.document;
  const selection = state.selections.protocol;
  const context = recordContext(document, state.universe);
  const [affordance, setAffordance] = useState("Ownership stack");
  const log = useContractLog();

  function transition(command: Parameters<typeof keyFamily.transition>[1], label: string) {
    const result = keyFamily.transition(selection, command, context);
    session.select((current) => ({
      ...current,
      selections: { ...current.selections, protocol: result.state },
    }));
    log.record(
      trace("key", label, command.type === "subtract" ? "subtract" : "replace", command, selection, result.state, keyFamily.targets(result.state, context), "transition", "selection-only"),
      label,
    );
  }

  function switchUniverse() {
    const universe = state.universe === "workspace:v1" ? "workspace:v2" : "workspace:v1";
    const result = keyFamily.reconcile(selection, recordContext(document, universe));
    session.select((current) => ({
      ...current,
      universe,
      selections: { ...current.selections, protocol: result.state },
    }));
    log.record(
      trace("key", "Host query changed", "reconcile", { type: "universe.changed", universe, policy: "clear" }, selection, result.state, keyFamily.targets(result.state, recordContext(document, universe)), "reconcile", "reconcile"),
      "Universe mismatch → clear",
    );
  }

  function enterText() {
    session.select((current) => ({
      ...current,
      scoped: { scope: "text", selection: { kind: "explicit", keys: ["label"], primaryKey: "label" } },
      editing: { kind: "edit", lease: "native-text:label" },
    }));
    log.record(
      trace("key", "Double click label", "edit", { type: "scope.enter", scope: "text" }, selection, selection, keyFamily.targets(selection, context), "transition", "selection-only"),
      "Enter native text lease",
    );
  }

  function softMask() {
    const before: MaskSelection<ReadonlyArray<number>> = { kind: "mask", representation: state.mask };
    const mask = document.records.map((_, index) => index / Math.max(document.records.length - 1, 1));
    const after: MaskSelection<ReadonlyArray<number>> = { kind: "mask", representation: mask };
    session.select((current) => ({ ...current, mask }));
    log.record(
      trace("mask", "Brush stroke", "add", { type: "union", region: mask }, before, after, mask.map((weight, index) => weight > 0 ? index : null).filter((value) => value !== null), "transition", "selection-only"),
      "Union soft mask",
    );
  }

  return (
    <Workbench
      title="Protocols"
      family="key all · nested ownership · mask extension"
      affordances={["Ownership stack", "Compact panel", "Raster strip"]}
      affordance={affordance}
      onAffordance={setAffordance}
      scenarios={<><Action label="Select all" onClick={() => transition({ type: "select-all", universe: state.universe }, "Select symbolic all")} /><Action label="Exclude Beta" disabled={!document.records.some((record) => record.id === "beta")} onClick={() => transition({ type: "subtract", keys: ["beta"] }, "Exclude beta")} /><Action label="Switch universe" onClick={switchUniverse} /><Action label="Enter text edit" onClick={enterText} /><Action label="Soft mask" onClick={softMask} /></>}
      selection={selection}
      session={state}
      trace={log.trace}
      timeline={log.timeline}
      testId="protocol"
    >
      {affordance === "Raster strip" ? (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(state.mask.length, 1)}, minmax(0, 1fr))` }}>
          {state.mask.map((weight, index) => <div key={document.records[index]?.id ?? index} className={classes("grid h-28 place-items-center", ui.workbench.item)} style={{ background: `rgba(222, 109, 85, ${weight})` }}>{weight.toFixed(2)}</div>)}
        </div>
      ) : affordance === "Compact panel" ? (
        <div className="flex flex-wrap gap-2">
          {keyFamily.targets(selection, context).map((key) => <Badge key={key}>{key}</Badge>)}
          <Badge>{state.scoped.scope}</Badge><Badge>{state.editing.kind}</Badge>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          <JsonOutput label="Structural selection" testId="protocol-structural" value={selection} />
          <JsonOutput label="Nested owner" testId="protocol-owner" value={{ scoped: state.scoped, editing: state.editing }} />
          <JsonOutput label="Host mask" testId="protocol-mask" value={{ kind: "mask", representation: state.mask }} />
        </div>
      )}
    </Workbench>
  );
}

function historyActions(
  session: WorkspaceSession,
  family: "key" | "range",
  before: unknown,
  record: (trace: ContractTrace, label: string) => void,
) {
  return {
    undo() {
      const result = session.undo();
      if (result === null) return;
      record(trace(family, "Undo", "undo", { type: "history.undo", origin: result.origin }, before, result.state.selections, result.state.document.records.map((item) => item.id), "reconcile", "undo"), `Undo ${result.origin}`);
    },
    redo() {
      const result = session.redo();
      if (result === null) return;
      record(trace(family, "Redo", "redo", { type: "history.redo", origin: result.origin }, before, result.state.selections, result.state.document.records.map((item) => item.id), "reconcile", "redo"), `Redo ${result.origin}`);
    },
  };
}

function HistoryActions(props: {
  readonly session: WorkspaceSession;
  readonly actions: { readonly undo: () => void; readonly redo: () => void };
}) {
  return (
    <>
      <Action label="Undo" disabled={!props.session.canUndo} onClick={props.actions.undo} />
      <Action label="Redo" disabled={!props.session.canRedo} onClick={props.actions.redo} />
    </>
  );
}

function rangeCommand<Point>(operation: SelectionOperation, point: Point) {
  if (operation === "extend") return { type: "extend-primary" as const, point };
  if (operation === "toggle" || operation === "add" || operation === "subtract") {
    return { type: "toggle-point" as const, point };
  }
  return { type: "collapse" as const, point };
}

function trace(
  family: ContractTrace["family"]["name"],
  physical: string,
  operation: ContractTrace["adapter"]["operation"],
  command: unknown,
  before: unknown,
  after: unknown,
  targets: unknown,
  stage: ContractTrace["lifecycle"]["stage"],
  classification: HistoryClass,
): ContractTrace {
  return {
    input: { source: "DOM host adapter", physical },
    adapter: { operation },
    family: { name: family, command },
    lifecycle: { stage, before, after, targets },
    history: { classification, createsEntry: classification === "document-mutation" },
  };
}

function JsonOutput(props: {
  readonly label: string;
  readonly testId: string;
  readonly value: unknown;
  readonly compact?: boolean;
}) {
  return <JsonInspector className={props.compact ? "mt-2" : undefined} label={props.label} testId={props.testId} value={props.value} size={props.compact ? "compact" : "standard"} />;
}

function Badge({ children }: { readonly children: ReactNode }) {
  return <span className={classes("px-2 py-1", ui.surface.inset, ui.text.meta)}>{children}</span>;
}

function Action(props: { readonly label: string; readonly onClick: () => unknown; readonly disabled?: boolean }) {
  return (
    <Button disabled={props.disabled} onClick={props.onClick} className="px-2 py-1">{props.label}</Button>
  );
}

function operationFromMouse(event: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey" | "altKey">): SelectionOperation {
  return pointerOperation(event, "extend");
}

function pointerOperation(
  event: Pick<PointerEvent | MouseEvent, "shiftKey" | "metaKey" | "ctrlKey" | "altKey">,
  shiftOperation: SelectionOperation,
): SelectionOperation {
  if (event.altKey) return "subtract";
  if (event.shiftKey) return shiftOperation;
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
}

function objectStyle(record: WorkspaceRecord): CSSProperties {
  return {
    left: record.x,
    top: record.y,
    width: record.width,
    height: record.height,
    backgroundColor: record.color,
  };
}

function normalizedBox(start: CanvasPoint, current: CanvasPoint): DragBox {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(start.x - current.x),
    height: Math.abs(start.y - current.y),
  };
}

function marqueeContext(records: ReadonlyArray<WorkspaceRecord>, hitMode: "intersects" | "contains") {
  return {
    regions: { fromPoints: normalizedBox },
    spatialIndex: {
      hitPoint(point: CanvasPoint, mode: "topmost" | "deepest") {
        const hits = records.filter((record) => (
          point.x >= record.x && point.x <= record.x + record.width
          && point.y >= record.y && point.y <= record.y + record.height
        ));
        return (mode === "topmost" ? hits.at(-1) : hits[0])?.id ?? null;
      },
      hitRegion(rectangle: DragBox, mode: "intersects" | "contains") {
        if (mode === "contains") {
          return records.filter((record) => (
            record.x >= rectangle.x
            && record.y >= rectangle.y
            && record.x + record.width <= rectangle.x + rectangle.width
            && record.y + record.height <= rectangle.y + rectangle.height
          )).map((record) => record.id);
        }
        const right = rectangle.x + rectangle.width;
        const bottom = rectangle.y + rectangle.height;
        return records.filter((record) => (
          record.x < right
          && record.x + record.width > rectangle.x
          && record.y < bottom
          && record.y + record.height > rectangle.y
        )).map((record) => record.id);
      },
    },
    hitMode,
  };
}

function treeDepth(record: WorkspaceRecord, records: ReadonlyArray<WorkspaceRecord>): number {
  const byId = new Map(records.map((candidate) => [candidate.id, candidate]));
  let depth = 0;
  let parentId = record.parentId;
  while (parentId !== null) {
    depth += 1;
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return depth;
}
