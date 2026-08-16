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
