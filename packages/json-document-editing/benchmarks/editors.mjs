import { benchmarkConfig, measure, reportScaling } from "../../../benchmarks/measure.mjs";
import { createDatabaseEditor, createSheetEditor, createTreeEditor } from "../dist/index.js";

const config = benchmarkConfig("PERF_EDITING_ITEMS");
console.log("json-document editing benchmark");
console.log(`items=${config.sizes.join(",")} rounds=${config.rounds} warmups=${config.warmups}`);

const workloads = new Map();
for (const size of config.sizes) {
  console.log(`\nitems=${size}`);
  const treeDocument = { nodes: Array.from({ length: size }, (_, index) => ({
    id: `node-${index}`,
    parentId: index === 0 ? null : "node-0",
    label: `Node ${index}`,
  })) };
  const treeTopology = { visibleIds: treeDocument.nodes.map((node) => node.id) };
  record("tree selection resolve", size, measure(config, "tree selection resolve", () => {
    const editor = createTreeEditor(treeDocument);
    editor.dispatch({ type: "selection.set", nodeId: `node-${size - 1}`, topology: treeTopology });
    return () => editor.selectedNodeIdsIn(treeTopology).at(-1) === `node-${size - 1}`;
  }));

  const columns = ["name", "status", "score"].map((id) => ({ id, label: id }));
  const rows = Array.from({ length: size }, (_, index) => ({
    id: `row-${index}`,
    cells: { name: `Row ${index}`, status: "Draft", score: index },
  }));
  record("sheet leaf commit", size, measure(config, "sheet leaf commit", () => {
    const editor = createSheetEditor({ columns, rows });
    return () => editor.dispatch({
      type: "cell.commit",
      rowId: `row-${Math.floor(size / 2)}`,
      columnId: "status",
      value: "Ready",
    }).ok;
  }));

  const database = {
    schema: { properties: columns.map((column) => ({ id: column.id, name: column.label, type: column.id === "score" ? "number" : column.id === "name" ? "title" : "text", options: [] })) },
    records: rows.map((row) => ({ id: row.id, values: row.cells })),
    views: [{ id: "table", name: "Table", type: "table", propertyOrder: columns.map((column) => column.id), propertyVisibility: {}, sort: { propertyId: "score", direction: "descending" }, filter: null }],
  };
  record("database sorted topology", size, measure(config, "database sorted topology", () => {
    const editor = createDatabaseEditor(database);
    return () => editor.tableTopology("table").recordIds.length === size;
  }));
}

for (const [label, rows] of workloads) {
  console.log(`\n${label}`);
  reportScaling(rows);
}

function record(label, size, result) {
  const rows = workloads.get(label) ?? [];
  rows.push({ size, ...result });
  workloads.set(label, rows);
}
