import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const publicEntry = new URL(
  "../dist/application/document/index.js",
  import.meta.url,
);

if (!existsSync(publicEntry)) {
  console.error(
    "Missing package dist. Run `npm run build -w @interactive-os/json-document` first.",
  );
  process.exit(1);
}

const {
  applyPatch,
  createJSONDocument,
} = await import(publicEntry.href);

const sizes = envList("PERF_ITEMS", [1_000, 10_000, 50_000]);
const rounds = envPositiveInteger("PERF_ROUNDS", 5);
const warmups = envPositiveInteger("PERF_WARMUPS", 2);
const commitBudgetPerTenThousandMs = envPositiveNumber(
  "PERF_COMMIT_P50_BUDGET_PER_10000_MS",
  6,
);

console.log("json-document v3 public-root benchmark");
console.log(`items=${sizes.join(",")} rounds=${rounds} warmups=${warmups}`);

const leafCommits = [];

for (const size of sizes) {
  const initial = {
    title: "benchmark",
    items: Array.from({ length: size }, (_, index) => ({
      id: `item-${index}`,
      done: false,
    })),
  };
  const middle = Math.floor(size / 2);
  const operation = {
    op: "replace",
    path: `/items/${middle}/done`,
    value: true,
  };

  console.log(`\nitems=${size}`);

  measure("createJSONDocument", () => {
    const document = createJSONDocument(initial);
    return document.value.items.length === size;
  });

  measure("applyPatch single leaf replace", () => {
    const result = applyPatch(initial, [operation]);
    return result.ok && result.value.items[middle].done === true;
  });

  const commitDocument = createJSONDocument(initial);
  let nextDone = true;
  const commit = measure("commit single leaf replace", () => {
    const result = commitDocument.commit([{
      ...operation,
      value: nextDone,
    }]);
    nextDone = !nextDone;
    return result.ok;
  });
  leafCommits.push({ size, ...commit });
  assertBudget(
    "commit single leaf replace",
    commit.p50,
    commitBudgetPerTenThousandMs * (size / 10_000),
  );

  const queryDocument = createJSONDocument(initial);
  measure("query direct item", () => {
    const result = queryDocument.query(`$.items[${middle}].id`);
    return result.ok && result.pointers[0] === `/items/${middle}/id`;
  });
}

if (leafCommits.length > 1) {
  console.log("\nleaf commit scaling");
  for (let index = 1; index < leafCommits.length; index += 1) {
    const previous = leafCommits[index - 1];
    const current = leafCommits[index];
    console.log(
      `${previous.size}->${current.size}: size=${(current.size / previous.size).toFixed(1)}x `
      + `p50=${(current.p50 / previous.p50).toFixed(2)}x `
      + `p95=${(current.p95 / previous.p95).toFixed(2)}x`,
    );
  }
}

function measure(label, run) {
  const samples = [];
  for (let index = 0; index < rounds + warmups; index += 1) {
    const start = performance.now();
    const ok = run();
    const duration = performance.now() - start;
    if (!ok) throw new Error(`${label} returned an invalid result.`);
    if (index >= warmups) samples.push(duration);
  }
  samples.sort((left, right) => left - right);
  const result = {
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
  };
  console.log(
    `${label}: p50=${result.p50.toFixed(3)}ms p95=${result.p95.toFixed(3)}ms`,
  );
  return result;
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) throw new Error("No benchmark samples.");
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * quantile) - 1),
  );
  return sorted[index];
}

function assertBudget(label, actual, budget) {
  if (actual > budget) {
    throw new Error(
      `${label} p50 ${actual.toFixed(3)}ms exceeds ${budget.toFixed(3)}ms budget.`,
    );
  }
  console.log(`${label} budget: ${actual.toFixed(3)}ms <= ${budget.toFixed(3)}ms`);
}

function envList(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = value.split(",").map((entry) => Number(entry.trim()));
  if (
    parsed.length === 0
    || parsed.some((entry) => !Number.isSafeInteger(entry) || entry <= 0)
  ) {
    throw new RangeError(`${name} must be a comma-separated list of positive integers.`);
  }
  return parsed;
}

function envPositiveInteger(name, fallback) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
  return parsed;
}

function envPositiveNumber(name, fallback) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new RangeError(`${name} must be a positive number.`);
  }
  return parsed;
}
