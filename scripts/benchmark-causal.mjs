import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";
import * as z from "zod";

const coreEntry = new URL(
  "../packages/json-document/dist/application/document/index.js",
  import.meta.url,
);
const causalEntry = new URL(
  "../labs/extensions/causal-patch-inbox/dist/index.js",
  import.meta.url,
);

if (!existsSync(coreEntry) || !existsSync(causalEntry)) {
  console.error("Missing package dist. Run `npm run perf:causal` from the repository root.");
  process.exit(1);
}

const { createJSONDocument } = await import(coreEntry.href);
const { createCausalPatchInbox } = await import(causalEntry.href);

const rounds = envNumber("PERF_CAUSAL_ROUNDS", 10);
const warmups = envNumber("PERF_CAUSAL_WARMUPS", 1);
const journalSizes = envList("PERF_CAUSAL_JOURNAL", [1_000, 10_000]);
const suffixSize = envNumber("PERF_CAUSAL_SUFFIX", 10);
const noteCount = (rounds + warmups) * 3 + 8;
const Schema = z.object({
  title: z.string(),
  notes: z.record(z.string(), z.string()),
});

console.log("json-document causal journal benchmark");
console.log(
  `journal=${journalSizes.join(",")} suffix=${suffixSize} rounds=${rounds} warmups=${warmups}`,
);

for (const journalSize of journalSizes) {
  const initial = {
    title: "title-initial",
    notes: Object.fromEntries(
      Array.from({ length: noteCount }, (_, index) => [
        `note-${index}`,
        "initial",
      ]),
    ),
  };
  const doc = createJSONDocument(Schema, initial);
  let hostSequence = 0;
  const inbox = createCausalPatchInbox(doc, {
    positionalSchema: Schema,
    host: {
      ownsPublication: ({ metadata }) => {
        const match = metadata?.origin === "benchmark-host"
          ? /^benchmark-host:(\d+)$/.exec(metadata.mergeKey ?? "")
          : null;
        return match === null ? false : { sequence: Number(match[1]) };
      },
      runReady: ({ apply }) => {
        apply();
        return { ok: true };
      },
    },
  });

  for (let index = 0; index < journalSize; index += 1) {
    hostReplaceTitle(doc, `title-${index}`, hostSequence += 1);
  }

  let nextId = 0;
  let nextNote = 0;
  const suffixZero = measure(rounds, () => {
    const base = doc.value;
    const baseRevision = inbox.current().journalRevision;
    const note = `note-${nextNote++}`;
    return () => inbox.ingest({
      id: `revision-zero-${nextId++}`,
      dependsOn: [],
      intent: {
        kind: "positional",
        base,
        baseRevision,
        operations: [{ op: "replace", path: `/notes/${note}`, value: "zero" }],
      },
    });
  });

  const suffix = measure(rounds, () => {
    const base = doc.value;
    const baseRevision = inbox.current().journalRevision;
    for (let index = 0; index < suffixSize; index += 1) {
      hostReplaceTitle(
        doc,
        `suffix-${nextId}-${index}`,
        hostSequence += 1,
      );
    }
    const note = `note-${nextNote++}`;
    return () => inbox.ingest({
      id: `revision-suffix-${nextId++}`,
      dependsOn: [],
      intent: {
        kind: "positional",
        base,
        baseRevision,
        operations: [{ op: "replace", path: `/notes/${note}`, value: "suffix" }],
      },
    });
  });

  const legacy = measure(rounds, () => {
    const note = `note-${nextNote++}`;
    return () => inbox.ingest({
      id: `legacy-${nextId++}`,
      dependsOn: [],
      intent: {
        kind: "positional",
        base: initial,
        operations: [{ op: "replace", path: `/notes/${note}`, value: "legacy" }],
      },
    });
  });

  console.log(`\njournal=${journalSize}`);
  printSamples("baseRevision suffix=0", suffixZero);
  printSamples(`baseRevision suffix=${suffixSize}`, suffix);
  printSamples("legacy full journal", legacy);
}

function hostReplaceTitle(doc, value, sequence) {
  const result = doc.commit(
    [{ op: "replace", path: "/title", value }],
    { origin: "benchmark-host", mergeKey: `benchmark-host:${sequence}` },
  );
  if (!result.ok) throw new Error(result.reason ?? "host commit failed");
}

function measure(count, prepare) {
  const samples = [];
  for (let index = 0; index < count + warmups; index += 1) {
    const run = prepare(index);
    const started = performance.now();
    const result = run();
    const elapsed = performance.now() - started;
    if (!result.ok) {
      throw new Error(`${result.code}: ${result.reason}`);
    }
    if (index >= warmups) samples.push(elapsed);
  }
  return samples.sort((left, right) => left - right);
}

function printSamples(label, samples) {
  const p50 = percentile(samples, 0.5);
  const p90 = percentile(samples, 0.9);
  console.log(`${label.padEnd(28)} p50=${p50.toFixed(3)}ms p90=${p90.toFixed(3)}ms`);
}

function percentile(samples, ratio) {
  const index = Math.min(
    samples.length - 1,
    Math.max(0, Math.ceil(samples.length * ratio) - 1),
  );
  return samples[index];
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function envList(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const values = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map(Math.floor);
  return values.length === 0 ? fallback : values;
}
