import { benchmarkConfig, measure, reportScaling } from "../../../benchmarks/measure.mjs";
import { resolveComposerSuggestions } from "../dist/index.js";

const config = benchmarkConfig("PERF_COMPOSER_SUGGESTIONS", [1_000, 10_000]);
const trigger = { kind: "mention", query: "target", range: { nodeId: "text", from: 0, to: 7 } };
const rows = [];

console.log("json-document Composer suggestion benchmark");
console.log(`suggestions=${config.sizes.join(",")} rounds=${config.rounds} warmups=${config.warmups}`);

for (const size of config.sizes) {
  const suggestions = Array.from({ length: size }, (_, index) => ({
    id: `suggestion-${index}`,
    kind: index % 2 === 0 ? "mention" : "skill",
    label: index % 100 === 0 ? `Target ${index}` : `Suggestion ${index}`,
  }));
  const expected = Math.ceil(size / 100);
  const result = measure(config, `${size} suggestions resolve`, () => () =>
    resolveComposerSuggestions(trigger, suggestions).length === expected,
  );
  rows.push({ size, ...result });
}

reportScaling(rows);
