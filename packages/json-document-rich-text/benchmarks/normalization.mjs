import { performance } from "node:perf_hooks";
import {
  createRichTextBlockFixture,
  normalizeRichText,
  validateRichText,
} from "../dist/index.js";

const sizes = (process.env.PERF_RICH_TEXT_NORMALIZE_BLOCKS ?? "1000,10000")
  .split(",")
  .map(Number);
const rounds = Number(process.env.PERF_ROUNDS ?? 7);
const warmups = Number(process.env.PERF_WARMUPS ?? 2);

console.log("json-document rich-text normalization benchmark");
console.log(`blocks=${sizes.join(",")} rounds=${rounds} warmups=${warmups}`);

for (const size of sizes) {
  const canonical = createRichTextBlockFixture(size, { text: "x".repeat(48) });
  const invalid = structuredClone(canonical);
  invalid.content.at(-1).content.push({
    id: `empty-${size}`,
    type: "text",
    text: "",
    marks: [],
  });
  console.log(`\nblocks=${size} bytes=${JSON.stringify(canonical).length}`);
  measure("detached canonical normalization", () => normalizeRichText(canonical).ok);
  measure("borrowed canonical normalization", () => (
    normalizeRichText(canonical, { inputOwnership: "borrowed" }).ok
  ));
  measure("borrowed deep-invalid normalization", () => (
    normalizeRichText(invalid, { inputOwnership: "borrowed" }).ok
  ));
  measure("full validation only", () => validateRichText(canonical).ok);
  measure("detachment clone only", () => JSON.parse(JSON.stringify(canonical)).content.length === size);
}

function measure(label, run) {
  const samples = [];
  for (let index = 0; index < rounds + warmups; index += 1) {
    const started = performance.now();
    if (!run()) throw new Error(`${label} failed`);
    const elapsed = performance.now() - started;
    if (index >= warmups) samples.push(elapsed);
  }
  samples.sort((left, right) => left - right);
  const p50 = percentile(samples, 0.5);
  const p95 = percentile(samples, 0.95);
  console.log(`  ${label}: p50=${p50.toFixed(3)}ms p95=${p95.toFixed(3)}ms`);
}

function percentile(samples, rank) {
  return samples[Math.min(samples.length - 1, Math.ceil(rank * samples.length) - 1)];
}
