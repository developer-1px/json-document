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
  type TreeTopology,
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

const initialOrder: OrderDocument = {
  items: [
    { id: "order-a", label: "Alpha" },
    { id: "order-b", label: "Beta" },
    { id: "order-c", label: "Gamma" },
    { id: "order-d", label: "Delta" },
  ],
};

const initialGrid: SheetDocument = {
  columns: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ],
  rows: [
    { id: "r1", cells: { a: "A1", b: "B1", c: "C1" } },
    { id: "r2", cells: { a: "A2", b: "B2", c: "C2" } },
    { id: "r3", cells: { a: "A3", b: "B3", c: "C3" } },
  ],
};

const initialObjects: ObjectDocument = {
  objects: [
    { id: "object-a", label: "Alpha", x: 24, y: 24, width: 92, height: 64, color: "#f59e0b" },
    { id: "object-b", label: "Beta", x: 154, y: 42, width: 104, height: 72, color: "#3b82f6" },
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

export function SelectionLabRoute() {
  return (
    <main className="min-h-full bg-stone-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-400">Structural selection families</p>
          <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">Selection Lab</h1>
          <p className="m-0 max-w-3xl text-sm leading-6 text-stone-600">
            Compare the same editing lifecycle across ordered ranges, grid rectangles, object sets, and a host-projected tree. Text caret selection is intentionally outside this lab.
          </p>
        </header>

        <div className="grid gap-5 xl:grid-cols-2">
          <OrderVariant />
          <GridVariant />
          <ObjectVariant />
          <TreeVariant />
          <ProtocolVariant />
        </div>
      </div>
    </main>
  );
}

function OrderVariant() {
  const [editor] = useState<OrderEditor>(() => createOrderEditor(initialOrder));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as OrderDocument;
  const selected = new Set(editor.selectedItemIds);

  function select(event: MouseEvent, itemId: string) {
    editor.dispatch({
      type: "selection.set",
      itemId,
      mode: event.shiftKey ? "extend" : event.metaKey || event.ctrlKey ? "toggle" : "replace",
    });
  }

  return (
    <Variant title="Order" family="Range · one ordered axis" selection={snapshot.selection} value={snapshot.value} testId="order">
      <div className="grid gap-2">
        {document.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Order ${item.label}`}
            aria-pressed={selected.has(item.id)}
            onClick={(event) => select(event, item.id)}
            className="flex items-center gap-3 rounded border border-stone-200 bg-white px-3 py-2 text-left text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-50"
          >
            <span className="text-xs text-stone-400">{index + 1}</span>{item.label}
          </button>
        ))}
      </div>
      <Toolbar>
        <Action label="Delete order selection" onClick={() => editor.dispatch({ type: "selection.remove" })} />
        <History editor={editor} canUndo={snapshot.canUndo} canRedo={snapshot.canRedo} />
      </Toolbar>
    </Variant>
  );
}

function GridVariant() {
  const [editor] = useState<SheetEditor>(() => createSheetEditor(initialGrid));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as SheetDocument;
  const selected = new Set(editor.selectedCells.map((cell) => `${cell.rowId}:${cell.columnId}`));
  const [current, setCurrent] = useState<{ readonly rowId: string; readonly columnId: string } | null>(null);
  const [editing, setEditing] = useState<EditingMode>({ kind: "navigate" });

  function select(event: MouseEvent, rowId: string, columnId: string) {
    setCurrent({ rowId, columnId });
    editor.dispatch({
      type: "selection.set",
      rowId,
      columnId,
      mode: event.shiftKey ? "extend" : event.metaKey || event.ctrlKey ? "toggle" : "replace",
    });
  }

  return (
    <Variant title="Grid" family="Range · row axis × column axis" selection={snapshot.selection} value={snapshot.value} testId="grid">
      <div className="grid grid-cols-3 gap-1">
        {document.rows.flatMap((row) => document.columns.map((column) => {
          const key = `${row.id}:${column.id}`;
          return (
            <button
              key={key}
              type="button"
              aria-label={`Grid ${String(row.cells[column.id])}`}
              aria-pressed={selected.has(key)}
              onClick={(event) => select(event, row.id, column.id)}
              onDoubleClick={() => {
                setCurrent({ rowId: row.id, columnId: column.id });
                setEditing({ kind: "edit", lease: `cell:${row.id}:${column.id}` });
              }}
              className="rounded border border-stone-200 bg-white px-2 py-3 text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-50 aria-pressed:ring-1 aria-pressed:ring-stone-950"
            >
              {String(row.cells[column.id])}
            </button>
          );
        }))}
      </div>
      <Toolbar>
        <Action label="Fill grid selection" onClick={() => editor.dispatch({ type: "selection.fill", value: "Selected" })} />
        <Action label="Edit current cell" disabled={current === null} onClick={() => {
          if (current !== null) setEditing({ kind: "edit", lease: `cell:${current.rowId}:${current.columnId}` });
        }} />
        <Action label="Exit cell edit" disabled={editing.kind === "navigate"} onClick={() => setEditing({ kind: "navigate" })} />
        <History editor={editor} canUndo={snapshot.canUndo} canRedo={snapshot.canRedo} />
      </Toolbar>
      <JsonOutput label="Navigation + edit lease" testId="grid-session-json" value={{ current, editing }} />
    </Variant>
  );
}

type CanvasPoint = { readonly x: number; readonly y: number };
type DragBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

function ObjectVariant() {
  const [editor] = useState<ObjectEditor>(() => createObjectEditor(initialObjects));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as ObjectDocument;
  const selected = new Set(snapshot.selection.keys);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PointerInteractionState<CanvasPoint>>(idlePointerInteraction());
  const [drag, setDrag] = useState<DragBox | null>(null);

  function localPoint(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function startMarquee(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const point = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    const result = reduceMarqueeInteraction(dragRef.current, {
      phase: "start",
      pointerId: String(event.pointerId),
      point,
      operation: pointerOperation(event, "add"),
    }, marqueeContext(document.objects));
    dragRef.current = result.state;
    setDrag(result.preview?.region ?? null);
  }

  function moveMarquee(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current.kind === "idle") return;
    const point = localPoint(event);
    const result = reduceMarqueeInteraction(dragRef.current, {
      phase: "move", pointerId: String(event.pointerId), point,
    }, marqueeContext(document.objects));
    dragRef.current = result.state;
    setDrag(result.preview?.region ?? null);
  }

  function finishMarquee(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current.kind === "idle") return;
    const point = localPoint(event);
    const result = reduceMarqueeInteraction(dragRef.current, {
      phase: "end", pointerId: String(event.pointerId), point,
    }, marqueeContext(document.objects));
    if (result.commit !== null) editor.dispatch({
      type: "selection.set",
      objectIds: result.commit.keys,
      mode: result.commit.operation === "extend" ? "add" : result.commit.operation,
    });
    dragRef.current = result.state;
    setDrag(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function cancelMarquee(event: PointerEvent<HTMLDivElement>) {
    const result = reduceMarqueeInteraction(dragRef.current, {
      phase: "cancel", pointerId: String(event.pointerId),
    }, marqueeContext(document.objects));
    dragRef.current = result.state;
    setDrag(null);
  }

  function selectObject(event: MouseEvent, objectId: string) {
    editor.dispatch({
      type: "selection.set",
      objectIds: [objectId],
      mode: event.metaKey || event.ctrlKey ? "toggle" : "replace",
    });
  }

  const marquee = drag;

  return (
    <Variant title="Objects" family="Key · host geometry query" selection={snapshot.selection} value={snapshot.value} testId="object">
      <div
        ref={stageRef}
        data-testid="object-stage"
        onPointerDown={startMarquee}
        onPointerMove={moveMarquee}
        onPointerUp={finishMarquee}
        onPointerCancel={cancelMarquee}
        className="relative h-60 touch-none select-none overflow-hidden rounded border border-stone-300 bg-[linear-gradient(#f5f5f4_1px,transparent_1px),linear-gradient(90deg,#f5f5f4_1px,transparent_1px)] bg-[size:16px_16px]"
      >
        {document.objects.map((object) => (
          <button
            key={object.id}
            type="button"
            aria-label={`Object ${object.label}`}
            aria-pressed={selected.has(object.id)}
            data-object-id={object.id}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => selectObject(event, object.id)}
            className="absolute rounded border-2 border-white text-xs font-semibold text-white shadow-sm outline-none aria-pressed:ring-2 aria-pressed:ring-stone-950 aria-pressed:ring-offset-2"
            style={objectStyle(object)}
          >
            {object.label}
          </button>
        ))}
        {marquee && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border border-blue-600 bg-blue-400/15"
            style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
          />
        )}
      </div>
      <p className="m-0 text-xs leading-5 text-stone-500">Drag empty canvas for marquee. Hold Shift while dragging to add its hit-test result.</p>
      <Toolbar>
        <Action label="Color object selection" onClick={() => editor.dispatch({ type: "selection.fill", color: "#8b5cf6" })} />
        <Action label="Delete object selection" onClick={() => editor.dispatch({ type: "selection.remove" })} />
        <History editor={editor} canUndo={snapshot.canUndo} canRedo={snapshot.canRedo} />
      </Toolbar>
    </Variant>
  );
}

function TreeVariant() {
  const [editor] = useState<TreeEditor>(() => createTreeEditor(initialTree));
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as TreeDocument;
  const [expanded, setExpanded] = useState(() => new Set(["workspace", "alpha", "beta"]));
  const topology = useMemo(() => ({
    visibleIds: visibleTreeIds(document.nodes, expanded),
  }), [document.nodes, expanded]);
  const selected = new Set(editor.selectedNodeIdsIn(topology));
  const children = childCounts(document.nodes);

  function select(event: MouseEvent, nodeId: string) {
    editor.dispatch({
      type: "selection.set",
      nodeId,
      topology,
      mode: event.shiftKey ? "extend" : event.metaKey || event.ctrlKey ? "toggle" : "replace",
    });
  }

  function toggle(nodeId: string) {
    const next = new Set(expanded);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    const nextTopology = { visibleIds: visibleTreeIds(document.nodes, next) };
    setExpanded(next);
    editor.reconcile(nextTopology);
  }

  return (
    <Variant title="Tree" family="Range · host visible order + hierarchy" selection={snapshot.selection} value={snapshot.value} testId="tree">
      <div className="grid gap-1">
        {document.nodes.filter((node) => topology.visibleIds.includes(node.id)).map((node) => {
          const hasChildren = (children.get(node.id) ?? 0) > 0;
          const depth = treeDepth(node, document.nodes);
          return (
            <div key={node.id} className="flex" style={{ paddingLeft: depth * 18 }}>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${expanded.has(node.id) ? "Collapse" : "Expand"} ${node.label}`}
                  onClick={() => toggle(node.id)}
                  className="w-8 shrink-0 rounded text-xs text-stone-500 hover:bg-stone-100"
                >
                  {expanded.has(node.id) ? "−" : "+"}
                </button>
              ) : <span className="w-8" />}
              <button
                type="button"
                aria-label={`Tree ${node.label}`}
                aria-pressed={selected.has(node.id)}
                onClick={(event) => select(event, node.id)}
                className="min-w-0 flex-1 rounded border border-transparent px-2 py-1.5 text-left text-sm aria-pressed:border-stone-950 aria-pressed:bg-amber-50"
              >
                {node.label}
              </button>
            </div>
          );
        })}
      </div>
      <output data-testid="tree-visible-order" className="text-xs text-stone-500">visible: {topology.visibleIds.join(" → ")}</output>
      <Toolbar>
        <Action label="Delete tree selection" onClick={() => editor.dispatch({ type: "selection.remove", topology })} />
        <History editor={editor} canUndo={snapshot.canUndo} canRedo={snapshot.canRedo} />
      </Toolbar>
    </Variant>
  );
}

type ProtocolScope = "canvas" | "vector" | "text";

function ProtocolVariant() {
  const family = useMemo(() => createKeySelectionFamily<string>(), []);
  const context = {
    keys: ["alpha", "beta", "gamma"],
    universe: "filtered:demo:v1",
    universeMismatch: "clear" as const,
  };
  const [selection, setSelection] = useState<KeySelection<string>>({
    kind: "explicit",
    keys: ["alpha"],
    primaryKey: "alpha",
  });
  const [scoped, setScoped] = useState<ScopedSelection<ProtocolScope, KeySelection<string>>>({
    scope: "canvas",
    selection: { kind: "explicit", keys: ["alpha"], primaryKey: "alpha" },
  });
  const [editing, setEditing] = useState<EditingMode>({ kind: "navigate" });
  const [mask, setMask] = useState<MaskSelection<readonly number[]>>({
    kind: "mask",
    representation: [0, 0, 0],
  });

  function transition(command: Parameters<typeof family.transition>[1]) {
    setSelection((current) => family.transition(current, command, context).state);
  }

  return (
    <Variant
      title="Protocols"
      family="Key all · nested scope · mask extension"
      selection={selection}
      value={{ targets: family.targets(selection, context), scoped, editing, mask }}
      testId="protocol"
    >
      <p className="m-0 text-xs leading-5 text-stone-500">
        Symbolic all stays compact; nested editing changes tagged ownership; weighted mask data remains host-owned.
      </p>
      <Toolbar>
        <Action label="Select all" onClick={() => transition({ type: "select-all", universe: context.universe })} />
        <Action label="Exclude Beta" onClick={() => transition({ type: "subtract", keys: ["beta"] })} />
        <Action label="Enter vector scope" onClick={() => setScoped({
          scope: "vector",
          selection: { kind: "explicit", keys: ["point-1", "point-2"], primaryKey: "point-2" },
        })} />
        <Action label="Enter text edit" onClick={() => {
          setScoped({
            scope: "text",
            selection: { kind: "explicit", keys: ["label"], primaryKey: "label" },
          });
          setEditing({ kind: "edit", lease: "native-text:label" });
        }} />
        <Action label="Exit nested edit" onClick={() => {
          setScoped({
            scope: "canvas",
            selection: { kind: "explicit", keys: ["alpha"], primaryKey: "alpha" },
          });
          setEditing({ kind: "navigate" });
        }} />
        <Action label="Apply soft mask" onClick={() => setMask({
          kind: "mask",
          representation: [0, 0.5, 1],
        })} />
      </Toolbar>
    </Variant>
  );
}

function Variant(props: {
  readonly title: string;
  readonly family: string;
  readonly selection: unknown;
  readonly value: unknown;
  readonly testId: string;
  readonly children: ReactNode;
}) {
  return (
    <section aria-label={`${props.title} selection variant`} className="grid content-start gap-3 rounded border border-stone-200 bg-white p-4">
      <header className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold text-stone-950">{props.title}</h2>
        <span className="rounded bg-stone-100 px-2 py-1 text-[11px] text-stone-500">{props.family}</span>
      </header>
      {props.children}
      <div className="grid gap-2 md:grid-cols-2">
        <JsonOutput label="Selection JSON" testId={`${props.testId}-selection-json`} value={props.selection} />
        <JsonOutput label="Canonical JSON" testId={`${props.testId}-document-json`} value={props.value} />
      </div>
    </section>
  );
}

function JsonOutput(props: { readonly label: string; readonly testId: string; readonly value: unknown }) {
  return (
    <div className="min-w-0 rounded bg-stone-950 p-2 text-stone-100">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">{props.label}</div>
      <pre data-testid={props.testId} className="m-0 max-h-44 overflow-auto whitespace-pre-wrap text-[10px] leading-4"><code>{JSON.stringify(props.value, null, 2)}</code></pre>
    </div>
  );
}

function Toolbar(props: { readonly children: ReactNode }) {
  return <div className="flex flex-wrap gap-1 border-t border-stone-100 pt-3">{props.children}</div>;
}

function Action(props: { readonly label: string; readonly onClick: () => unknown; readonly disabled?: boolean }) {
  return (
    <button type="button" disabled={props.disabled} onClick={props.onClick} className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-35">
      {props.label}
    </button>
  );
}

function History(props: {
  readonly editor: { undo(): unknown; redo(): unknown };
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}) {
  return (
    <>
      <Action label="Undo" disabled={!props.canUndo} onClick={() => props.editor.undo()} />
      <Action label="Redo" disabled={!props.canRedo} onClick={() => props.editor.redo()} />
    </>
  );
}

function objectStyle(object: DocumentObject): CSSProperties {
  return {
    left: object.x,
    top: object.y,
    width: object.width,
    height: object.height,
    backgroundColor: object.color,
  };
}

function normalizedBox(start: CanvasPoint, current: CanvasPoint): DragBox {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  return {
    x,
    y,
    width: Math.abs(start.x - current.x),
    height: Math.abs(start.y - current.y),
  };
}

function pointerOperation(
  event: Pick<PointerEvent, "shiftKey" | "metaKey" | "ctrlKey" | "altKey">,
  shiftOperation: SelectionOperation,
): SelectionOperation {
  if (event.altKey) return "subtract";
  if (event.shiftKey) return shiftOperation;
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
}

function marqueeContext(objects: ReadonlyArray<DocumentObject>) {
  return {
    regions: { fromPoints: normalizedBox },
    spatialIndex: {
      hitPoint(point: CanvasPoint, mode: "topmost" | "deepest") {
        const hits = objects.filter((object) => (
          point.x >= object.x && point.x <= object.x + object.width
          && point.y >= object.y && point.y <= object.y + object.height
        ));
        const candidate = mode === "topmost" ? hits.at(-1) : hits[0];
        return candidate?.id ?? null;
      },
      hitRegion: (rectangle: DragBox, mode: "intersects" | "contains") => (
        mode === "intersects"
          ? hitTest(objects, rectangle)
          : objects.filter((object) => (
              object.x >= rectangle.x
              && object.y >= rectangle.y
              && object.x + object.width <= rectangle.x + rectangle.width
              && object.y + object.height <= rectangle.y + rectangle.height
            )).map((object) => object.id)
      ),
    },
    hitMode: "intersects" as const,
  };
}

function hitTest(
  objects: ReadonlyArray<DocumentObject>,
  rectangle: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): string[] {
  const right = rectangle.x + rectangle.width;
  const bottom = rectangle.y + rectangle.height;
  return objects.filter((object) => (
    object.x < right
    && object.x + object.width > rectangle.x
    && object.y < bottom
    && object.y + object.height > rectangle.y
  )).map((object) => object.id);
}

function visibleTreeIds(nodes: ReadonlyArray<TreeNode>, expanded: ReadonlySet<string>): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.filter((node) => {
    let parentId = node.parentId;
    while (parentId !== null) {
      if (!expanded.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  }).map((node) => node.id);
}

function childCounts(nodes: ReadonlyArray<TreeNode>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.parentId !== null) counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
  }
  return counts;
}

function treeDepth(node: TreeNode, nodes: ReadonlyArray<TreeNode>): number {
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  let depth = 0;
  let parentId = node.parentId;
  while (parentId !== null) {
    depth += 1;
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return depth;
}
