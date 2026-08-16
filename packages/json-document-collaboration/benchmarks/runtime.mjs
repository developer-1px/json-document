import { benchmarkConfig, measure, reportScaling } from "../../../benchmarks/measure.mjs";
import { createCollaborationRuntime } from "../dist/index.js";

const config = benchmarkConfig("PERF_COLLABORATION_ITEMS");
const runtimeOptions = {
  epochId: "benchmark/v1",
  ruleset: { id: "benchmark/json-tree", digest: "benchmark/json-tree/v1" },
};

console.log("json-document collaboration benchmark");
console.log(`items=${config.sizes.join(",")} rounds=${config.rounds} warmups=${config.warmups}`);

const ingestRows = [];
for (const size of config.sizes) {
  const initial = { items: Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, done: false })) };
  const author = createCollaborationRuntime(initial, { ...runtimeOptions, actorId: "author" });
  const middle = Math.floor(size / 2);
  const committed = author.document.commit([{ op: "replace", path: `/items/${middle}/done`, value: true }]);
  if (!committed.ok) throw new Error("author commit failed");
  const bundle = author.replica.exportBundle();

  console.log(`\nitems=${size}`);
  const ingest = measure(config, "remote leaf ingest", () => {
    const receiver = createCollaborationRuntime(initial, { ...runtimeOptions, actorId: "receiver" });
    return () => {
      const result = receiver.replica.ingest(bundle);
      return result.ok && receiver.document.value.items[middle].done === true;
    };
  });
  ingestRows.push({ size, ...ingest });

  measure(config, "export one-change bundle", () => () => (
    author.replica.exportBundle().changes.length === 1
  ));
}

console.log("\nremote leaf ingest");
reportScaling(ingestRows);

const ledgerSizes = (process.env.PERF_COLLABORATION_CHANGES ?? "100,1000,10000")
  .split(",")
  .map((value) => Number(value));
const seed = createCollaborationRuntime({ value: 0 }, { ...runtimeOptions, actorId: "ledger-author" });
seed.document.commit([{ op: "replace", path: "/value", value: 1 }]);
const first = seed.replica.exportBundle().changes[0];
if (first === undefined || first.ops[0]?.kind !== "set") throw new Error("ledger seed failed");
const ledgerRows = [];
console.log("\nledger replay");
for (const size of ledgerSizes) {
  const changes = Array.from({ length: size }, (_, index) => ({
    changeId: { actorId: "ledger-author", counter: index + 1 },
    deps: index === 0 ? [] : [{ actorId: "ledger-author", counter: index }],
    ops: [{ kind: "set", target: first.ops[0].target, value: (index + 1) % 2 }],
  }));
  const bundle = { epoch: seed.replica.epoch, changes };
  const result = measure(config, `${size} change ingest`, () => {
    const receiver = createCollaborationRuntime({ value: 0 }, { ...runtimeOptions, actorId: "ledger-receiver" });
    return () => receiver.replica.ingest(bundle).ok;
  });
  ledgerRows.push({ size, ...result });
}
reportScaling(ledgerRows);
