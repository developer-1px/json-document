import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const distEntry = new URL("../dist/index.js", import.meta.url);
if (!existsSync(distEntry)) {
  console.error("Missing Rich Text dist. Run `npm run build -w @interactive-os/json-document-rich-text` first.");
  process.exit(1);
}

const documentEntry = new URL("../../json-document/dist/application/document/index.js", import.meta.url);
const [
  { createJSONDocument },
  { createRichTextBlockFixture, createRichTextEditor, createRichTextInstrument, runWithRichTextInstrument },
] = await Promise.all([
  import(documentEntry.href),
  import(distEntry.href),
]);

const sizes = envList("PERF_RICH_TEXT_BLOCKS", [100, 1_000, 10_000]);
const rounds = envPositiveInteger("PERF_ROUNDS", 7);
const warmups = envPositiveInteger("PERF_WARMUPS", 2);
const reportPath = process.env.PERF_RICH_TEXT_REPORT;
const budgetMs = envPositiveInteger("PERF_RICH_TEXT_INSERT_P95_MS", 16);

console.log("json-document official rich-text benchmark");
console.log(`blocks=${sizes.join(",")} rounds=${rounds} warmups=${warmups}`);

const report = {
  generatedAt: new Date().toISOString(),
  runtime: `node ${process.version}`,
  rounds,
  warmups,
  results: [],
};

for (const size of sizes) {
  const fixture = createRichTextBlockFixture(size);
  const middle = Math.floor(size / 2);
  const textId = `block-text-${middle}`;
  const row = { fixtureSize: size, workloads: {} };

  row.workloads["initial-render"] = measure("initial-render", () => {
    const editor = createRichTextEditor({ document: createJSONDocument(fixture) });
    return editor.snapshot.value.content.length === size;
  });

  const insertDocument = createJSONDocument(createRichTextBlockFixture(size));
  const insertEditor = createRichTextEditor({
    document: insertDocument,
    selection: collapsed(textId, 1),
  });
  let next = "a";
  row.workloads["text-insert-middle"] = measure("text-insert-middle", () => {
    const result = insertEditor.dispatch({ type: "text.insert", text: next });
    next = next === "a" ? "b" : "a";
    return result.ok && !result.change?.applied.some((operation) => operation.path === "");
  });

  const startEditor = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size)),
    selection: collapsed("block-text-0", 1),
  });
  row.workloads["text-insert-start"] = measure("text-insert-start", () => startEditor.dispatch({ type: "text.insert", text: "z" }).ok);

  const endEditor = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size)),
    selection: collapsed(`block-text-${size - 1}`, 1),
  });
  row.workloads["text-insert-end"] = measure("text-insert-end", () => endEditor.dispatch({ type: "text.insert", text: "z" }).ok);

  const deleteEditor = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size, { text: "xy" })),
    selection: collapsed(textId, 2),
  });
  row.workloads["text-delete"] = measure("text-delete", () => {
    const result = deleteEditor.dispatch({ type: "text.delete", direction: "backward", unit: "character" });
    if (result.ok) deleteEditor.undo();
    return result.ok;
  });

  const splitEditor = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size)),
    selection: collapsed(textId, 1),
  });
  row.workloads["block-split"] = measure("block-split", () => {
    const result = splitEditor.dispatch({ type: "block.split" });
    if (result.ok) splitEditor.undo();
    return result.ok;
  });

  const joinDocument = createRichTextBlockFixture(size);
  const joinEditor = createRichTextEditor({
    document: createJSONDocument(joinDocument),
    selection: collapsed("block-text-1", 0),
  });
  row.workloads["block-join"] = measure("block-join", () => {
    const result = joinEditor.dispatch({ type: "block.join", direction: "backward" });
    if (result.ok) joinEditor.undo();
    return result.ok;
  });

  const mapped = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size)),
    selection: collapsed("block-text-0", 0),
  });
  row.workloads["selection-mapping"] = measure("selection-mapping", () => {
    mapped.dispatch({ type: "selection.set", selection: collapsed(textId, 1) });
    return mapped.topology.locate(textId) !== null;
  });

  const undoEditor = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size)),
    selection: collapsed(textId, 1),
  });
  undoEditor.dispatch({ type: "text.insert", text: "Q" });
  row.workloads["undo"] = measure("undo", () => {
    const undone = undoEditor.undo();
    const redone = undoEditor.redo();
    return undone.ok && redone.ok;
  });
  row.workloads["redo"] = row.workloads["undo"];

  const wholeDocument = createJSONDocument(createRichTextBlockFixture(size));
  row.workloads["whole-document-replace"] = measure("whole-document-replace", () => {
    const current = wholeDocument.value;
    const cloned = JSON.parse(JSON.stringify(current));
    const target = cloned.content[middle].content[0];
    target.text = target.text === "x" ? "xy" : "x";
    return wholeDocument.commit([{ op: "replace", path: "", value: cloned }]).ok;
  });

  const instrument = createRichTextInstrument();
  const probe = createRichTextEditor({
    document: createJSONDocument(createRichTextBlockFixture(size)),
    selection: collapsed(textId, 1),
  });
  runWithRichTextInstrument(instrument, () => probe.dispatch({ type: "text.insert", text: "k" }));
  row.instrumentation = instrument.snapshot();

  console.log(`\nblocks=${size}`);
  for (const [name, stats] of Object.entries(row.workloads)) {
    console.log(`  ${name}: p50=${stats.p50.toFixed(3)}ms p95=${stats.p95.toFixed(3)}ms`);
  }
  console.log(`  visitedNodes=${row.instrumentation.visitedNodes} fullValidations=${row.instrumentation.fullValidations}`);
  if (size === 10_000) {
    assertBudget("text-insert-middle", row.workloads["text-insert-middle"].p95, budgetMs);
  }
  report.results.push(row);
}

if (reportPath) {
  const resolved = path.resolve(reportPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nwrote ${resolved}`);
}

function measure(name, run) {
  for (let index = 0; index < warmups; index += 1) {
    if (!run()) throw new Error(`${name} warmup failed`);
  }
  const samples = [];
  for (let index = 0; index < rounds; index += 1) {
    const started = performance.now();
    if (!run()) throw new Error(`${name} round failed`);
    samples.push(performance.now() - started);
  }
  samples.sort((left, right) => left - right);
  return {
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    samples,
  };
}

function percentile(samples, rank) {
  if (samples.length === 1) return samples[0];
  const index = Math.min(samples.length - 1, Math.ceil(rank * samples.length) - 1);
  return samples[index];
}

function collapsed(nodeId, offset) {
  const point = { kind: "text", nodeId, offset, affinity: "forward" };
  return { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

function assertBudget(name, actual, budget) {
  if (actual > budget) {
    console.log(`  budget: ${name} p95 ${actual.toFixed(3)}ms exceeded ${budget}ms`);
    process.exitCode = 0;
  } else {
    console.log(`  budget: ${name} p95 ${actual.toFixed(3)}ms <= ${budget}ms`);
  }
}

function envList(name, fallback) {
  return process.env[name] ? process.env[name].split(",").map((value) => Number(value)) : fallback;
}

function envPositiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
