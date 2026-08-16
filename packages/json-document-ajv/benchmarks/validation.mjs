import { Ajv } from "ajv";
import { benchmarkConfig, measure, reportScaling } from "../../../benchmarks/measure.mjs";
import { createAjvValidator } from "../dist/index.js";

const config = benchmarkConfig("PERF_AJV_ITEMS");
const ajv = new Ajv();
const validate = createAjvValidator(ajv.compile({
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, done: { type: "boolean" } },
        required: ["id", "done"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
}));

console.log("json-document AJV connector benchmark");
console.log(`items=${config.sizes.join(",")} rounds=${config.rounds} warmups=${config.warmups}`);
const rows = [];
for (const size of config.sizes) {
  const candidate = { items: Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, done: false })) };
  console.log(`\nitems=${size}`);
  const result = measure(config, "isolated whole validation", () => () => validate(candidate).ok);
  rows.push({ size, ...result });
}
console.log("\nisolated whole validation");
reportScaling(rows);
