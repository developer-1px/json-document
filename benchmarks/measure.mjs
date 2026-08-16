import { performance } from "node:perf_hooks";

export function benchmarkConfig(sizeName, fallbackSizes = [1_000, 10_000]) {
  return {
    sizes: envList(sizeName, fallbackSizes),
    rounds: envPositiveInteger("PERF_ROUNDS", 7),
    warmups: envPositiveInteger("PERF_WARMUPS", 2),
  };
}

export function measure(config, label, prepare) {
  const samples = [];
  for (let index = 0; index < config.rounds + config.warmups; index += 1) {
    const run = prepare();
    const start = performance.now();
    const ok = run();
    const duration = performance.now() - start;
    if (ok !== true) throw new Error(`${label} returned an invalid result.`);
    if (index >= config.warmups) samples.push(duration);
  }
  return report(label, samples);
}

export async function measureAsync(config, label, prepare) {
  const samples = [];
  for (let index = 0; index < config.rounds + config.warmups; index += 1) {
    const run = await prepare();
    const start = performance.now();
    const ok = await run();
    const duration = performance.now() - start;
    if (ok !== true) throw new Error(`${label} returned an invalid result.`);
    if (index >= config.warmups) samples.push(duration);
  }
  return report(label, samples);
}

export function reportScaling(rows) {
  if (rows.length < 2) return;
  console.log("scaling");
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    console.log(
      `  ${previous.size}->${current.size}: size=${(current.size / previous.size).toFixed(1)}x `
      + `p50=${(current.p50 / previous.p50).toFixed(2)}x `
      + `p95=${(current.p95 / previous.p95).toFixed(2)}x`,
    );
  }
}

function report(label, samples) {
  samples.sort((left, right) => left - right);
  const result = {
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
  };
  console.log(`  ${label}: p50=${result.p50.toFixed(3)}ms p95=${result.p95.toFixed(3)}ms`);
  return result;
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) throw new Error("No benchmark samples.");
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

function envList(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = value.split(",").map((entry) => Number(entry.trim()));
  if (parsed.length === 0 || parsed.some((entry) => !Number.isSafeInteger(entry) || entry <= 0)) {
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
