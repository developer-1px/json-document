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
  const deepTreeDocument = { nodes: Array.from({ length: size }, (_, index) => ({
    id: `deep-${index}`,
    parentId: index === 0 ? null : `deep-${index - 1}`,
    label: `Deep ${index}`,
  })) };
  record("tree deep snapshot setup", size, measure(config, "tree deep snapshot setup", () => (
    () => createTreeEditor(deepTreeDocument).snapshot.value.nodes.length === size
  )));

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
  record("sheet full-column copy", size, measure(config, "sheet full-column copy", () => {
    const editor = createSheetEditor({ columns, rows });
    editor.dispatch({ type: "selection.set", rowId: `row-${size - 1}`, columnId: "name", mode: "extend" });
    const topology = { rowIds: rows.map((row) => row.id), columnIds: columns.map((column) => column.id) };
    return () => editor.copy(topology)?.cells.length === size;
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
  record("database cached topology", size, measure(config, "database cached topology", () => {
    const editor = createDatabaseEditor(database);
    editor.tableTopology("table");
    return () => editor.tableTopology("table").recordIds.length === size;
  }));
  record("database full-column selection", size, measure(config, "database full-column selection", () => {
    const editor = createDatabaseEditor(database);
    const topology = editor.tableTopology("table");
    editor.dispatch({ type: "selection.set", recordId: `row-${size - 1}`, propertyId: "name", mode: "extend" });
    return () => editor.selectedCellsIn(topology).length === size;
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
