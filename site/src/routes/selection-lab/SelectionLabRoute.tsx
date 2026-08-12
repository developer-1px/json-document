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
  createObjectEditor,
  createOrderEditor,
  createSheetEditor,
  createTreeEditor,
  type DocumentObject,
  type ObjectDocument,
  type ObjectEditor,
  type OrderDocument,
  type OrderEditor,
  type SheetDocument,
  type SheetEditor,
  type TreeDocument,
  type TreeEditor,
  type TreeNode,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  createKeySelectionFamily,
  idlePointerInteraction,
  reduceMarqueeInteraction,
  type EditingMode,
  type KeySelection,
  type MaskSelection,
  type PointerInteractionState,
  type ScopedSelection,
  type SelectionOperation,
} from "@interactive-os/json-document-selection";

type FamilyId = "order" | "grid" | "objects" | "tree" | "protocols";
type HistoryClass = "selection-only" | "document-mutation" | "undo" | "redo" | "reconcile" | "cancel";

interface ContractTrace {
  readonly input: { readonly source: string; readonly physical: string };
  readonly adapter: { readonly operation: SelectionOperation | "undo" | "redo" | "reconcile" | "edit"; readonly point?: unknown };
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

const initialOrder: OrderDocument = {
  items: [
    { id: "order-a", label: "Alpha" }, { id: "order-b", label: "Beta" },
    { id: "order-c", label: "Gamma" }, { id: "order-d", label: "Delta" },
  ],
};

const initialGrid: SheetDocument = {
  columns: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
  rows: [
    { id: "r1", cells: { a: "A1", b: "B1", c: "C1" } },
    { id: "r2", cells: { a: "A2", b: "B2", c: "C2" } },
    { id: "r3", cells: { a: "A3", b: "B3", c: "C3" } },
  ],
};

const initialObjects: ObjectDocument = {
  objects: [
    { id: "object-a", label: "Alpha", x: 24, y: 24, width: 112, height: 76, color: "#f59e0b" },
    { id: "object-b", label: "Beta", x: 96, y: 54, width: 122, height: 78, color: "#3b82f6" },
    { id: "object-c", label: "Gamma", x: 72, y: 142, width: 116, height: 64, color: "#10b981" },
    { id: "object-d", label: "Delta", x: 248, y: 150, width: 86, height: 58, color: "#f43f5e" },
  ],
};

const initialTree: TreeDocument = {
  nodes: [
    { id: "workspace", parentId: null, label: "Workspace" },
    { id: "alpha", parentId: "workspace", label: "Alpha" },
    { id: "alpha-child", parentId: "alpha", label: "Alpha child" },
    { id: "beta", parentId: "workspace", label: "Beta" },
    { id: "beta-child", parentId: "beta", label: "Beta child" },
  ],
};

const families: ReadonlyArray<{ readonly id: FamilyId; readonly label: string; readonly detail: string }> = [
  { id: "order", label: "Order", detail: "1D range" },
  { id: "grid", label: "Grid", detail: "2D range" },
  { id: "objects", label: "Objects", detail: "key + geometry" },
  { id: "tree", label: "Tree", detail: "range + topology" },
  { id: "protocols", label: "Protocols", detail: "all + scope + mask" },
];

export function SelectionLabRoute() {
  const [family, setFamily] = useState<FamilyId>("objects");
  return (
    <main className="min-h-full bg-stone-100 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">DOM-free contract · host-owned affordance</p>
            <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">Selection Workbench</h1>
            <p className="m-0 max-w-3xl text-sm leading-6 text-stone-600">
              Switch affordances without replacing the active family session. Family changes start a new topology-specific session; text caret selection stays outside the structural model.
            </p>
          </div>
          <span className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-500">
            Same data → different UI
          </span>
        </header>

        <nav aria-label="Selection family" className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-stone-200 bg-white p-1 md:grid-cols-5">
          {families.map((item) => (
            <button key={item.id} type="button" aria-pressed={family === item.id} onClick={() => setFamily(item.id)} className="rounded-lg px-3 py-2 text-left text-sm aria-pressed:bg-stone-950 aria-pressed:text-white">
              <span className="block font-medium">{item.label}</span>
              <span className="block text-[10px] opacity-60">{item.detail}</span>
            </button>
          ))}
        </nav>

        {family === "order" && <OrderWorkbench />}
        {family === "grid" && <GridWorkbench />}
        {family === "objects" && <ObjectWorkbench />}
        {family === "tree" && <TreeWorkbench />}
        {family === "protocols" && <ProtocolWorkbench />}
      </div>
    </main>
  );
}

function useContractLog() {
  const [trace, setTrace] = useState<ContractTrace | null>(null);
  const [timeline, setTimeline] = useState<ReadonlyArray<TimelineEntry>>([]);
  function record(next: ContractTrace, label: string) {
    setTrace(next);
    setTimeline((current) => [...current.slice(-7), { id: (current.at(-1)?.id ?? 0) + 1, label, classification: next.history.classification }]);
  }
  return { trace, timeline, record };
}

function Workbench(props: {
  readonly title: string;
  readonly family: string;
  readonly affordances: ReadonlyArray<string>;
  readonly affordance: string;
  readonly onAffordance: (value: string) => void;
  readonly scenario: ReactNode;
  readonly selection: unknown;
  readonly session: unknown;
  readonly trace: ContractTrace | null;
  readonly timeline: ReadonlyArray<TimelineEntry>;
  readonly testId: string;
  readonly children: ReactNode;
}) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  return (
    <section aria-label={`${props.title} selection workbench`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="grid gap-4 border-b border-stone-200 p-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2"><h2 className="m-0 text-xl font-semibold">{props.title}</h2><Badge>{props.family}</Badge></div>
          <p className="mb-0 mt-1 text-xs text-stone-500">The editor below owns one session. These tabs only replace its affordance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Affordance">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Affordance</span>
          {props.affordances.map((item) => <button key={item} type="button" aria-pressed={props.affordance === item} onClick={() => props.onAffordance(item)} className="rounded border border-stone-200 px-2 py-1 text-xs aria-pressed:border-stone-950 aria-pressed:bg-stone-950 aria-pressed:text-white">{item}</button>)}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
            <span className="text-xs text-stone-500">Active view: <strong className="text-stone-900">{props.affordance}</strong></span>
            <div className="flex flex-wrap items-center gap-1"><span className="mr-1 text-[9px] font-semibold uppercase tracking-wide text-stone-400">Scenarios</span>{props.scenario}</div>
          </div>
          {props.children}
        </div>
        <aside className="border-t border-stone-200 bg-stone-50 p-3 lg:border-l lg:border-t-0">
          <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-500">Shared session</h3>
          <JsonOutput label="Selection" testId={`${props.testId}-selection-json`} value={props.selection} compact />
          <JsonOutput label="Document + host state" testId={`${props.testId}-document-json`} value={props.session} compact />
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">History timeline</h3>
          <ol data-testid={`${props.testId}-timeline`} className="m-0 grid list-none gap-1 p-0">
            {props.timeline.length === 0 && <li className="text-xs text-stone-400">No interaction yet</li>}
            {props.timeline.map((entry) => <li key={entry.id} className="flex items-center gap-2 text-[11px]"><span className="rounded bg-white px-1.5 py-0.5 text-stone-400">{entry.id}</span><span className="min-w-0 flex-1 truncate">{entry.label}</span><span className="text-[9px] text-stone-400">{entry.classification}</span></li>)}
          </ol>
        </aside>
      </div>

      <div className="border-t border-stone-200">
        <button type="button" aria-expanded={inspectorOpen} onClick={() => setInspectorOpen((open) => !open)} className="flex w-full items-center justify-between bg-stone-950 px-4 py-3 text-left text-xs font-semibold text-white">
          Contract inspector <span>{inspectorOpen ? "Hide ↑" : "Open ↓"}</span>
        </button>
        {inspectorOpen && <ContractInspector trace={props.trace} testId={props.testId} />}
      </div>
    </section>
  );
}

function ContractInspector({ trace, testId }: { readonly trace: ContractTrace | null; readonly testId: string }) {
  const cells = trace === null ? [] : [
    ["1 · physical input", trace.input], ["2 · platform adapter", trace.adapter],
    ["3 · family command", trace.family], ["4 · lifecycle result", trace.lifecycle],
    ["5 · history policy", trace.history],
  ] as const;
  return (
    <div data-testid={`${testId}-contract-inspector`} className="grid gap-px bg-stone-800 md:grid-cols-5">
      {trace === null ? <p className="col-span-full m-0 bg-stone-900 p-4 text-xs text-stone-400">Interact with the active view to trace the complete host → core → facade path.</p> : cells.map(([label, value]) => (
        <div key={label} className="min-w-0 bg-stone-900 p-3 text-stone-100"><div className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-amber-400">{label}</div><pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] leading-4"><code>{JSON.stringify(value, null, 2)}</code></pre></div>
      ))}
    </div>
  );
}

function OrderWorkbench() {
  const [editor] = useState<OrderEditor>(() => createOrderEditor(initialOrder));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as OrderDocument;
  const selected = new Set(editor.selectedItemIds);
  const [affordance, setAffordance] = useState("List");
  const log = useContractLog();
  function select(event: MouseEvent, itemId: string) {
    const before = snapshot.selection;
    const operation = operationFromMouse(event);
    const mode = operation === "add" || operation === "subtract" ? "toggle" : operation;
    const result = editor.dispatch({ type: "selection.set", itemId, mode });
    if (result.ok) log.record(trace("range", event.type, operation, { type: mode === "extend" ? "extend-primary" : mode, point: { itemId } }, before, result.snapshot.selection, editor.selectedItemIds, "transition", "selection-only"), `Select ${itemId}`);
  }
  function mutate(kind: "delete" | "undo" | "redo") {
    const before = editor.snapshot.selection;
    const result = kind === "delete" ? editor.dispatch({ type: "selection.remove" }) : editor[kind]();
    if (result.ok) log.record(trace("range", kind, kind === "delete" ? "edit" : kind, { type: kind === "delete" ? "selection.remove" : kind }, before, result.snapshot.selection, editor.selectedItemIds, kind === "delete" ? "map" : "transition", kind === "delete" ? "document-mutation" : kind), kind);
  }
  return (
    <Workbench title="Order" family="range · ordered topology" affordances={["List", "Timeline", "Compact"]} affordance={affordance} onAffordance={setAffordance} scenario={<><Action label="Delete selection" onClick={() => mutate("delete")} /><Action label="Undo" disabled={!snapshot.canUndo} onClick={() => mutate("undo")} /><Action label="Redo" disabled={!snapshot.canRedo} onClick={() => mutate("redo")} /></>} selection={snapshot.selection} session={snapshot.value} trace={log.trace} timeline={log.timeline} testId="order">
      <div className={affordance === "Timeline" ? "flex gap-2 overflow-auto py-5" : affordance === "Compact" ? "divide-y divide-stone-100 rounded border border-stone-200" : "grid gap-2"}>
        {document.items.map((item, index) => <button key={item.id} type="button" aria-label={`Order ${item.label}`} aria-pressed={selected.has(item.id)} onClick={(event) => select(event, item.id)} className={`${affordance === "Timeline" ? "min-w-28 rounded-full" : "w-full rounded-lg"} flex items-center gap-3 border border-stone-200 bg-white px-3 py-2 text-left text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-50`}><span className="text-xs text-stone-400">{index + 1}</span>{item.label}</button>)}
      </div>
    </Workbench>
  );
}

function GridWorkbench() {
  const [editor] = useState<SheetEditor>(() => createSheetEditor(initialGrid));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as SheetDocument;
  const selected = new Set(editor.selectedCells.map((cell) => `${cell.rowId}:${cell.columnId}`));
  const [current, setCurrent] = useState<{ readonly rowId: string; readonly columnId: string } | null>(null);
  const [editing, setEditing] = useState<EditingMode>({ kind: "navigate" });
  const [affordance, setAffordance] = useState("Spreadsheet");
  const log = useContractLog();
  function select(event: MouseEvent, rowId: string, columnId: string) {
    const before = snapshot.selection;
    const operation = operationFromMouse(event);
    const mode = operation === "add" || operation === "subtract" ? "toggle" : operation;
    setCurrent({ rowId, columnId });
    const result = editor.dispatch({ type: "selection.set", rowId, columnId, mode });
    if (result.ok) log.record(trace("range", event.type, operation, { type: mode === "extend" ? "extend-primary" : mode, point: { rowId, columnId } }, before, result.snapshot.selection, editor.selectedCells.map(({ rowId: r, columnId: c }) => `${r}:${c}`), "transition", "selection-only"), `Select ${rowId}:${columnId}`);
  }
  function fill() {
    const before = editor.snapshot.selection;
    const result = editor.dispatch({ type: "selection.fill", value: "Selected" });
    if (result.ok) log.record(trace("range", "toolbar click", "edit", { type: "selection.fill", value: "Selected" }, before, result.snapshot.selection, editor.selectedCells, "map", "document-mutation"), "Fill selection");
  }
  function history(kind: "undo" | "redo") {
    const before = editor.snapshot.selection; const result = editor[kind]();
    if (result.ok) log.record(trace("range", kind, kind, { type: kind }, before, result.snapshot.selection, editor.selectedCells, "reconcile", kind), kind);
  }
  function enterEdit() {
    if (current === null) return;
    setEditing({ kind: "edit", lease: `cell:${current.rowId}:${current.columnId}` });
    log.record(trace("range", "double click / Enter", "edit", { type: "acquire-native-text-lease", current }, snapshot.selection, snapshot.selection, editor.selectedCells, "transition", "selection-only"), "Native text lease");
  }
  return (
    <Workbench title="Grid" family="range · row × column topology" affordances={["Spreadsheet", "Heatmap", "Records"]} affordance={affordance} onAffordance={setAffordance} scenario={<><Action label="Fill selection" onClick={fill} /><Action label="Edit current" disabled={current === null} onClick={enterEdit} /><Action label="Exit edit" disabled={editing.kind === "navigate"} onClick={() => setEditing({ kind: "navigate" })} /><Action label="Undo" disabled={!snapshot.canUndo} onClick={() => history("undo")} /><Action label="Redo" disabled={!snapshot.canRedo} onClick={() => history("redo")} /></>} selection={snapshot.selection} session={{ document: snapshot.value, navigation: { current }, editing }} trace={log.trace} timeline={log.timeline} testId="grid">
      {affordance === "Records" ? <div className="grid gap-2">{document.rows.map((row) => <div key={row.id} className="grid grid-cols-3 gap-1 rounded border border-stone-200 p-2">{document.columns.map((column) => <CellButton key={column.id} rowId={row.id} columnId={column.id} value={row.cells[column.id]} selected={selected.has(`${row.id}:${column.id}`)} onSelect={select} onEdit={enterEdit} />)}</div>)}</div> : <div className="grid grid-cols-3 gap-1">{document.rows.flatMap((row) => document.columns.map((column) => <CellButton key={`${row.id}:${column.id}`} rowId={row.id} columnId={column.id} value={row.cells[column.id]} selected={selected.has(`${row.id}:${column.id}`)} onSelect={select} onEdit={() => { setCurrent({ rowId: row.id, columnId: column.id }); setEditing({ kind: "edit", lease: `cell:${row.id}:${column.id}` }); }} heatmap={affordance === "Heatmap"} />))}</div>}
    </Workbench>
  );
}

function CellButton(props: { readonly rowId: string; readonly columnId: string; readonly value: unknown; readonly selected: boolean; readonly heatmap?: boolean; readonly onSelect: (event: MouseEvent, rowId: string, columnId: string) => void; readonly onEdit: () => void }) {
  return <button type="button" aria-label={`Grid ${String(props.value)}`} aria-pressed={props.selected} onClick={(event) => props.onSelect(event, props.rowId, props.columnId)} onDoubleClick={props.onEdit} className={`${props.heatmap ? "rounded-full" : "rounded"} border border-stone-200 bg-white px-2 py-3 text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-400 aria-pressed:ring-1 aria-pressed:ring-stone-950`}>{String(props.value)}</button>;
}

type CanvasPoint = { readonly x: number; readonly y: number };
type DragBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

function ObjectWorkbench() {
  const [editor] = useState<ObjectEditor>(() => createObjectEditor(initialObjects));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as ObjectDocument;
  const selected = new Set(snapshot.selection.keys);
  const [affordance, setAffordance] = useState("Canvas");
  const [regionMode, setRegionMode] = useState<"intersects" | "contains">("intersects");
  const [pointMode, setPointMode] = useState<"topmost" | "deepest">("topmost");
  const dragRef = useRef<PointerInteractionState<CanvasPoint>>(idlePointerInteraction());
  const [drag, setDrag] = useState<DragBox | null>(null);
  const log = useContractLog();
  function selectObject(event: MouseEvent, objectId: string) {
    const before = editor.snapshot.selection;
    const operation = operationFromMouse(event);
    const result = editor.dispatch({ type: "selection.set", objectIds: [objectId], mode: operation === "extend" ? "add" : operation });
    if (result.ok) log.record(trace("key", `${event.type} ${objectId}`, operation, { type: operation === "extend" ? "add" : operation, keys: [objectId] }, before, result.snapshot.selection, editor.selectedObjects.map((object) => object.id), "transition", "selection-only"), `Select ${objectId}`);
  }
  function localPoint(event: PointerEvent<HTMLDivElement>) { const bounds = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; }
  function marquee(event: PointerEvent<HTMLDivElement>, phase: "start" | "move" | "end" | "cancel") {
    if (phase === "start" && event.target !== event.currentTarget) return;
    const before = editor.snapshot.selection;
    const point = localPoint(event);
    const sample = phase === "cancel" ? { phase, pointerId: String(event.pointerId) } as const : { phase, pointerId: String(event.pointerId), point, ...(phase === "start" ? { operation: pointerOperation(event, "add") } : {}) } as Parameters<typeof reduceMarqueeInteraction<CanvasPoint, DragBox, string>>[1];
    if (phase === "start") event.currentTarget.setPointerCapture(event.pointerId);
    const result = reduceMarqueeInteraction(dragRef.current, sample, marqueeContext(document.objects, regionMode));
    dragRef.current = result.state; setDrag(result.preview?.region ?? null);
    if (result.commit !== null) {
      const mode = result.commit.operation === "extend" ? "add" : result.commit.operation;
      const applied = editor.dispatch({ type: "selection.set", objectIds: result.commit.keys, mode });
      if (applied.ok) log.record(trace("key", `pointer ${phase}`, result.commit.operation, { type: mode, keys: result.commit.keys, hitMode: regionMode }, before, applied.snapshot.selection, editor.selectedObjects.map((object) => object.id), "transition", "selection-only"), `${regionMode} marquee`);
    } else if (phase === "cancel") log.record(trace("key", "pointercancel", "replace", { type: "clear-preview" }, before, before, [], "cancel", "cancel"), "Cancel pointer preview");
    if (phase === "end" || phase === "cancel") setDrag(null);
  }
  function selectOverlap() {
    const point = { x: 110, y: 70 };
    const id = marqueeContext(document.objects, regionMode).spatialIndex.hitPoint(point, pointMode);
    if (id === null) return;
    const before = editor.snapshot.selection; const result = editor.dispatch({ type: "selection.set", objectIds: [id], mode: "replace" });
    if (result.ok) log.record(trace("key", "host hit test @ 110,70", "replace", { type: "replace", keys: [id], pointMode }, before, result.snapshot.selection, [id], "transition", "selection-only"), `${pointMode} overlap hit`);
  }
  function mutate(kind: "fill" | "remove" | "undo" | "redo") {
    const before = editor.snapshot.selection;
    const result = kind === "fill" ? editor.dispatch({ type: "selection.fill", color: "#8b5cf6" }) : kind === "remove" ? editor.dispatch({ type: "selection.remove" }) : editor[kind]();
    if (result.ok) log.record(trace("key", kind, kind === "undo" || kind === "redo" ? kind : "edit", { type: kind }, before, result.snapshot.selection, editor.selectedObjects.map((object) => object.id), kind === "remove" ? "map" : kind === "undo" || kind === "redo" ? "reconcile" : "transition", kind === "undo" || kind === "redo" ? kind : "document-mutation"), kind);
  }
  return (
    <Workbench title="Objects" family="key · host geometry port" affordances={["Canvas", "Layer list", "Cards"]} affordance={affordance} onAffordance={setAffordance} scenario={<><select aria-label="Region hit mode" value={regionMode} onChange={(event) => setRegionMode(event.target.value as typeof regionMode)} className="rounded border border-stone-300 bg-white px-2 py-1 text-xs"><option value="intersects">intersects</option><option value="contains">contains</option></select><select aria-label="Point hit mode" value={pointMode} onChange={(event) => setPointMode(event.target.value as typeof pointMode)} className="rounded border border-stone-300 bg-white px-2 py-1 text-xs"><option value="topmost">topmost</option><option value="deepest">deepest</option></select><Action label="Hit overlap" onClick={selectOverlap} /><Action label="Color" onClick={() => mutate("fill")} /><Action label="Delete" onClick={() => mutate("remove")} /><Action label="Undo" disabled={!snapshot.canUndo} onClick={() => mutate("undo")} /><Action label="Redo" disabled={!snapshot.canRedo} onClick={() => mutate("redo")} /></>} selection={snapshot.selection} session={snapshot.value} trace={log.trace} timeline={log.timeline} testId="object">
      {affordance === "Canvas" ? <div data-testid="object-stage" onPointerDown={(event) => marquee(event, "start")} onPointerMove={(event) => dragRef.current.kind !== "idle" && marquee(event, "move")} onPointerUp={(event) => marquee(event, "end")} onPointerCancel={(event) => marquee(event, "cancel")} className="relative h-64 touch-none select-none overflow-hidden rounded-xl border border-stone-300 bg-[linear-gradient(#f5f5f4_1px,transparent_1px),linear-gradient(90deg,#f5f5f4_1px,transparent_1px)] bg-[size:16px_16px]">{document.objects.map((object) => <button key={object.id} type="button" aria-label={`Object ${object.label}`} aria-pressed={selected.has(object.id)} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => selectObject(event, object.id)} className="absolute rounded border-2 border-white text-xs font-semibold text-white shadow-sm outline-none aria-pressed:ring-2 aria-pressed:ring-stone-950 aria-pressed:ring-offset-2" style={objectStyle(object)}>{object.label}</button>)}{drag && <div className="pointer-events-none absolute border border-blue-600 bg-blue-400/15" style={{ left: drag.x, top: drag.y, width: drag.width, height: drag.height }} />}</div> : <div className={affordance === "Cards" ? "grid grid-cols-2 gap-2" : "grid gap-1"}>{document.objects.map((object, index) => <button key={object.id} type="button" aria-label={`Object ${object.label}`} aria-pressed={selected.has(object.id)} onClick={(event) => selectObject(event, object.id)} className={`${affordance === "Cards" ? "h-24 rounded-xl" : "rounded"} flex items-center gap-3 border border-stone-200 bg-white p-3 text-left text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-50`}><span className="h-4 w-4 rounded" style={{ background: object.color }} /><span className="flex-1">{object.label}</span><span className="text-xs text-stone-400">{index + 1}</span></button>)}</div>}
    </Workbench>
  );
}

function TreeWorkbench() {
  const [editor] = useState<TreeEditor>(() => createTreeEditor(initialTree));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as TreeDocument;
  const [expanded, setExpanded] = useState(() => new Set(["workspace", "alpha", "beta"]));
  const [affordance, setAffordance] = useState("Outline");
  const topology = useMemo(() => ({ visibleIds: visibleTreeIds(document.nodes, expanded) }), [document.nodes, expanded]);
  const selected = new Set(editor.selectedNodeIdsIn(topology));
  const children = childCounts(document.nodes);
  const log = useContractLog();
  function select(event: MouseEvent, nodeId: string) {
    const before = editor.snapshot.selection; const operation = operationFromMouse(event); const mode = operation === "add" || operation === "subtract" ? "toggle" : operation;
    const result = editor.dispatch({ type: "selection.set", nodeId, topology, mode });
    if (result.ok) log.record(trace("range", `${event.type} ${nodeId}`, operation, { type: mode, point: { nodeId } }, before, result.snapshot.selection, editor.selectedNodeIdsIn(topology), "transition", "selection-only"), `Select ${nodeId}`);
  }
  function toggle(nodeId: string) {
    const before = editor.snapshot.selection; const next = new Set(expanded); if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
    const nextTopology = { visibleIds: visibleTreeIds(document.nodes, next) }; setExpanded(next); const after = editor.reconcile(nextTopology);
    log.record(trace("range", `toggle visibility ${nodeId}`, "reconcile", { type: "topology.changed", visibleIds: nextTopology.visibleIds }, before, after.selection, editor.selectedNodeIdsIn(nextTopology), "reconcile", "reconcile"), `Reconcile ${nodeId}`);
  }
  function mutate(kind: "remove" | "undo" | "redo") {
    const before = editor.snapshot.selection; const result = kind === "remove" ? editor.dispatch({ type: "selection.remove", topology }) : editor[kind]();
    if (result.ok) log.record(trace("range", kind, kind === "remove" ? "edit" : kind, { type: kind }, before, result.snapshot.selection, editor.selectedNodeIdsIn({ visibleIds: visibleTreeIds((result.snapshot.value as TreeDocument).nodes, expanded) }), kind === "remove" ? "map" : "reconcile", kind === "remove" ? "document-mutation" : kind), kind);
  }
  return (
    <Workbench title="Tree" family="range · host-projected visible topology" affordances={["Outline", "Visible order", "Cards"]} affordance={affordance} onAffordance={setAffordance} scenario={<><Action label="Collapse Alpha" onClick={() => toggle("alpha")} /><Action label="Delete selection" onClick={() => mutate("remove")} /><Action label="Undo" disabled={!snapshot.canUndo} onClick={() => mutate("undo")} /><Action label="Redo" disabled={!snapshot.canRedo} onClick={() => mutate("redo")} /></>} selection={snapshot.selection} session={{ document: snapshot.value, topology }} trace={log.trace} timeline={log.timeline} testId="tree">
      <output data-testid="tree-visible-order" className="mb-3 block rounded bg-stone-50 px-2 py-1 text-xs text-stone-500">visible: {topology.visibleIds.join(" → ")}</output>
      <div className={affordance === "Visible order" ? "flex gap-2 overflow-auto py-3" : affordance === "Cards" ? "grid grid-cols-2 gap-2" : "grid gap-1"}>{document.nodes.filter((node) => topology.visibleIds.includes(node.id)).map((node) => { const hasChildren = (children.get(node.id) ?? 0) > 0; const depth = treeDepth(node, document.nodes); return <div key={node.id} className={`${affordance === "Visible order" ? "min-w-32" : "flex"}`} style={affordance === "Outline" ? { paddingLeft: depth * 18 } : undefined}>{affordance === "Outline" && hasChildren ? <button type="button" aria-label={`${expanded.has(node.id) ? "Collapse" : "Expand"} ${node.label}`} onClick={() => toggle(node.id)} className="w-8 shrink-0 rounded text-xs text-stone-500 hover:bg-stone-100">{expanded.has(node.id) ? "−" : "+"}</button> : affordance === "Outline" ? <span className="w-8" /> : null}<button type="button" aria-label={`Tree ${node.label}`} aria-pressed={selected.has(node.id)} onClick={(event) => select(event, node.id)} className={`${affordance === "Cards" ? "h-20" : ""} min-w-0 flex-1 rounded border border-stone-200 px-2 py-2 text-left text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-50`}>{node.label}</button></div>; })}</div>
    </Workbench>
  );
}

type ProtocolScope = "canvas" | "vector" | "text";

function ProtocolWorkbench() {
  const family = useMemo(() => createKeySelectionFamily<string>(), []);
  const [universe, setUniverse] = useState("filtered:demo:v1");
  const context = { keys: ["alpha", "beta", "gamma"], universe, universeMismatch: "clear" as const };
  const [selection, setSelection] = useState<KeySelection<string>>({ kind: "explicit", keys: ["alpha"], primaryKey: "alpha" });
  const [scoped, setScoped] = useState<ScopedSelection<ProtocolScope, KeySelection<string>>>({ scope: "canvas", selection: { kind: "explicit", keys: ["alpha"], primaryKey: "alpha" } });
  const [editing, setEditing] = useState<EditingMode>({ kind: "navigate" });
  const [mask, setMask] = useState<MaskSelection<readonly number[]>>({ kind: "mask", representation: [0, 0, 0] });
  const [affordance, setAffordance] = useState("Ownership stack");
  const log = useContractLog();
  function transition(command: Parameters<typeof family.transition>[1], label: string) {
    const before = selection; const after = family.transition(before, command, context).state; setSelection(after);
    log.record(trace("key", label, command.type === "subtract" ? "subtract" : "replace", command, before, after, family.targets(after, context), "transition", "selection-only"), label);
  }
  function switchUniverse() {
    const before = selection; const nextContext = { ...context, universe: universe === "filtered:demo:v1" ? "filtered:demo:v2" : "filtered:demo:v1" }; const result = family.reconcile(before, nextContext); setUniverse(nextContext.universe); setSelection(result.state);
    log.record(trace("key", "host query changed", "reconcile", { type: "universe.changed", to: nextContext.universe, policy: "clear" }, before, result.state, family.targets(result.state, nextContext), "reconcile", "reconcile"), "Universe mismatch → clear");
  }
  function enterText() { const before = selection; setScoped({ scope: "text", selection: { kind: "explicit", keys: ["label"], primaryKey: "label" } }); setEditing({ kind: "edit", lease: "native-text:label" }); log.record(trace("key", "double click label", "edit", { type: "scope.enter", scope: "text", lease: "native-text:label" }, before, before, family.targets(before, context), "transition", "selection-only"), "Enter native text lease"); }
  function softMask() { const before = mask; const after = { kind: "mask", representation: [0, 0.5, 1] } as const; setMask(after); log.record(trace("mask", "brush stroke", "add", { type: "union", region: [0, 0.5, 1] }, before, after, [1, 2], "transition", "selection-only"), "Union soft mask"); }
  return (
    <Workbench title="Protocols" family="key all · nested ownership · mask extension" affordances={["Ownership stack", "Compact panel", "Raster strip"]} affordance={affordance} onAffordance={setAffordance} scenario={<><Action label="Select all" onClick={() => transition({ type: "select-all", universe }, "Select symbolic all")} /><Action label="Exclude Beta" onClick={() => transition({ type: "subtract", keys: ["beta"] }, "Exclude beta")} /><Action label="Switch universe" onClick={switchUniverse} /><Action label="Enter text edit" onClick={enterText} /><Action label="Soft mask" onClick={softMask} /></>} selection={selection} session={{ targets: family.targets(selection, context), universe, scoped, editing, mask }} trace={log.trace} timeline={log.timeline} testId="protocol">
      {affordance === "Raster strip" ? <div className="grid grid-cols-3 gap-1">{mask.representation.map((weight, index) => <div key={index} className="grid h-28 place-items-center rounded border border-stone-200 text-xs" style={{ background: `rgba(245, 158, 11, ${weight})` }}>{weight}</div>)}</div> : affordance === "Compact panel" ? <div className="flex flex-wrap gap-2">{family.targets(selection, context).map((key) => <Badge key={key}>{key}</Badge>)}<Badge>{scoped.scope}</Badge><Badge>{editing.kind}</Badge></div> : <div className="grid gap-2 md:grid-cols-3">{[["Structural selection", selection], ["Nested owner", { scoped, editing }], ["Host mask", mask]].map(([label, value]) => <JsonOutput key={String(label)} label={String(label)} testId={`protocol-${String(label)}`} value={value} />)}</div>}
    </Workbench>
  );
}

function trace(family: ContractTrace["family"]["name"], physical: string, operation: ContractTrace["adapter"]["operation"], command: unknown, before: unknown, after: unknown, targets: unknown, stage: ContractTrace["lifecycle"]["stage"], classification: HistoryClass): ContractTrace {
  return { input: { source: "DOM host adapter", physical }, adapter: { operation }, family: { name: family, command }, lifecycle: { stage, before, after, targets }, history: { classification, createsEntry: classification === "document-mutation" } };
}

function JsonOutput(props: { readonly label: string; readonly testId: string; readonly value: unknown; readonly compact?: boolean }) {
  return <div className={`${props.compact ? "mt-2" : ""} min-w-0 rounded bg-stone-950 p-2 text-stone-100`}><div className="mb-1 text-[9px] uppercase tracking-wide text-stone-500">{props.label}</div><pre data-testid={props.testId} className={`${props.compact ? "max-h-32" : "max-h-44"} m-0 overflow-auto whitespace-pre-wrap text-[10px] leading-4`}><code>{JSON.stringify(props.value, null, 2)}</code></pre></div>;
}

function Badge({ children }: { readonly children: ReactNode }) { return <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] text-stone-500">{children}</span>; }
function Action(props: { readonly label: string; readonly onClick: () => unknown; readonly disabled?: boolean }) { return <button type="button" disabled={props.disabled} onClick={props.onClick} className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-35">{props.label}</button>; }
function operationFromMouse(event: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey" | "altKey">): SelectionOperation { return pointerOperation(event, "extend"); }
function pointerOperation(event: Pick<PointerEvent | MouseEvent, "shiftKey" | "metaKey" | "ctrlKey" | "altKey">, shiftOperation: SelectionOperation): SelectionOperation { if (event.altKey) return "subtract"; if (event.shiftKey) return shiftOperation; if (event.metaKey || event.ctrlKey) return "toggle"; return "replace"; }
function objectStyle(object: DocumentObject): CSSProperties { return { left: object.x, top: object.y, width: object.width, height: object.height, backgroundColor: object.color }; }
function normalizedBox(start: CanvasPoint, current: CanvasPoint): DragBox { const x = Math.min(start.x, current.x); const y = Math.min(start.y, current.y); return { x, y, width: Math.abs(start.x - current.x), height: Math.abs(start.y - current.y) }; }
function marqueeContext(objects: ReadonlyArray<DocumentObject>, hitMode: "intersects" | "contains") { return { regions: { fromPoints: normalizedBox }, spatialIndex: { hitPoint(point: CanvasPoint, mode: "topmost" | "deepest") { const hits = objects.filter((object) => point.x >= object.x && point.x <= object.x + object.width && point.y >= object.y && point.y <= object.y + object.height); return (mode === "topmost" ? hits.at(-1) : hits[0])?.id ?? null; }, hitRegion: (rectangle: DragBox, mode: "intersects" | "contains") => mode === "intersects" ? hitTest(objects, rectangle) : objects.filter((object) => object.x >= rectangle.x && object.y >= rectangle.y && object.x + object.width <= rectangle.x + rectangle.width && object.y + object.height <= rectangle.y + rectangle.height).map((object) => object.id) }, hitMode }; }
function hitTest(objects: ReadonlyArray<DocumentObject>, rectangle: DragBox): string[] { const right = rectangle.x + rectangle.width; const bottom = rectangle.y + rectangle.height; return objects.filter((object) => object.x < right && object.x + object.width > rectangle.x && object.y < bottom && object.y + object.height > rectangle.y).map((object) => object.id); }
function visibleTreeIds(nodes: ReadonlyArray<TreeNode>, expanded: ReadonlySet<string>): string[] { const byId = new Map(nodes.map((node) => [node.id, node])); return nodes.filter((node) => { let parentId = node.parentId; while (parentId !== null) { if (!expanded.has(parentId)) return false; parentId = byId.get(parentId)?.parentId ?? null; } return true; }).map((node) => node.id); }
function childCounts(nodes: ReadonlyArray<TreeNode>): Map<string, number> { const counts = new Map<string, number>(); for (const node of nodes) if (node.parentId !== null) counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1); return counts; }
function treeDepth(node: TreeNode, nodes: ReadonlyArray<TreeNode>): number { const byId = new Map(nodes.map((candidate) => [candidate.id, candidate])); let depth = 0; let parentId = node.parentId; while (parentId !== null) { depth += 1; parentId = byId.get(parentId)?.parentId ?? null; } return depth; }
