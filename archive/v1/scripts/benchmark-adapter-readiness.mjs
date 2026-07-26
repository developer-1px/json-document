import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import * as z from "zod";

const distSessionEntry = new URL(
  "../packages/json-document/dist/application/session/index.js",
  import.meta.url,
);

if (!existsSync(distSessionEntry)) {
  console.error(
    "Missing package dist. Run `npm run build -w @interactive-os/json-document` first.",
  );
  process.exit(1);
}

const { createJSONDocument } = await import(distSessionEntry.href);

const warmups = envPositiveInteger("PERF_ADAPTER_WARMUPS", 20);
const samples = envPositiveInteger("PERF_ADAPTER_SAMPLES", 300);
const canvasNodes = envPositiveInteger("PERF_ADAPTER_CANVAS_NODES", 5_000);
const canvasBatchSize = envPositiveInteger("PERF_ADAPTER_CANVAS_BATCH_SIZE", 100);
const editableBlocks = envPositiveInteger("PERF_ADAPTER_EDITABLE_BLOCKS", 5_000);
const canvasNodeCpuP95BudgetMs = envPositiveNumber(
  "PERF_ADAPTER_CANVAS_NODE_CPU_P95_BUDGET_MS",
  4,
);
const canvasBatchCpuP95BudgetMs = envPositiveNumber(
  "PERF_ADAPTER_CANVAS_BATCH_CPU_P95_BUDGET_MS",
  8,
);
const editableCommitCpuP95BudgetMs = envPositiveNumber(
  "PERF_ADAPTER_EDITABLE_COMMIT_CPU_P95_BUDGET_MS",
  14,
);

if (canvasBatchSize > canvasNodes) {
  throw new RangeError("PERF_ADAPTER_CANVAS_BATCH_SIZE must not exceed the node count");
}

const DesignJSONValueSchema = z.lazy(() =>
  z.union([
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.null(),
    z.array(DesignJSONValueSchema),
    z.record(z.string(), DesignJSONValueSchema),
  ]),
);
const DesignJSONObjectSchema = z.record(z.string(), DesignJSONValueSchema);
const StableIdSchema = z.string().trim().min(1);
const DesignNodeSchema = z.object({
  id: StableIdSchema,
  label: StableIdSchema,
  definition: z.object({
    kind: z.enum(["component", "intrinsic", "widget"]),
    id: StableIdSchema,
  }).strict(),
  children: z.array(StableIdSchema),
  props: DesignJSONObjectSchema,
  text: z.string().nullable(),
  layout: DesignJSONObjectSchema,
  style: DesignJSONObjectSchema,
  frame: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().nonnegative(),
    height: z.number().finite().nonnegative(),
    rotation: z.number().finite(),
    widthMode: z.enum(["content", "fixed"]),
    heightMode: z.enum(["content", "fixed"]),
    overflow: z.enum(["clip", "scroll", "visible"]),
  }).strict().nullable(),
  component: z.object({
    definitionId: StableIdSchema,
    instanceId: StableIdSchema,
    slotId: StableIdSchema,
  }).strict().nullable(),
}).strict();
const DesignDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  roots: z.array(StableIdSchema),
  nodes: z.array(DesignNodeSchema),
}).strict();

const EditableInlineMarkSchema = z.object({
  type: z.enum(["bold", "italic", "underline", "strike", "code"]),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
const EditableBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["paragraph", "heading", "quote", "code"]),
  text: z.string(),
  marks: z.record(z.string().min(1), EditableInlineMarkSchema),
}).superRefine((block, context) => {
  for (const [id, mark] of Object.entries(block.marks)) {
    if (mark.start >= mark.end || mark.end > block.text.length) {
      context.addIssue({
        code: "custom",
        message: "Inline marks must be non-empty and stay inside block text.",
        path: ["marks", id],
      });
    }
  }
});
const EditableDocumentSchema = z.object({
  schema: z.literal("interactive-os.editable-document@3"),
  id: z.string().min(1),
  blocks: z.array(EditableBlockSchema),
}).refine(
  (value) => new Set(value.blocks.map((block) => block.id)).size === value.blocks.length,
  { message: "Block ids must be unique.", path: ["blocks"] },
);

const isolatedScenario = process.env.JSON_DOCUMENT_ADAPTER_READINESS_SCENARIO;
if (isolatedScenario !== undefined) {
  const result = runNamedScenario(isolatedScenario);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} else {
  const results = ["editable", "canvas-node", "canvas-batch"]
    .map(runIsolatedScenario);

  console.log("json-document adapter readiness benchmark");
  console.log(`node=${process.version} platform=${process.platform} arch=${process.arch}`);
  console.log(`warmups=${warmups} samples=${samples}`);
  for (const result of results) {
    console.log(
      `${result.name}: cpu p50=${result.stats.cpu.p50.toFixed(3)}ms `
      + `p95=${result.stats.cpu.p95.toFixed(3)}ms max=${result.stats.cpu.max.toFixed(3)}ms `
      + `budget=${result.cpuBudgetMs.toFixed(3)}ms pass=${result.pass}; `
      + `wall p50=${result.stats.wall.p50.toFixed(3)}ms `
      + `p95=${result.stats.wall.p95.toFixed(3)}ms max=${result.stats.wall.max.toFixed(3)}ms`,
    );
  }

  if (results.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
}

function runNamedScenario(name) {
  if (name === "canvas-node") return measureCanvasNodeReplace();
  if (name === "canvas-batch") return measureCanvasBatchReplace();
  if (name === "editable") return measureEditableCommit();
  throw new RangeError(`Unknown adapter readiness scenario: ${name}`);
}

function runIsolatedScenario(name) {
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url)],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        JSON_DOCUMENT_ADAPTER_READINESS_SCENARIO: name,
      },
      maxBuffer: 1024 * 1024,
    },
  );
  if (child.status !== 0) {
    throw new Error(
      `Adapter readiness scenario ${name} failed:\n${child.stderr || child.stdout}`,
    );
  }
  const output = child.stdout.trim();
  if (output.length === 0) {
    throw new Error(`Adapter readiness scenario ${name} produced no result`);
  }
  return JSON.parse(output);
}

function measureCanvasNodeReplace() {
  const targetIndex = canvasNodes - 1;
  const state = createCanvasState(canvasNodes);
  const doc = createJSONDocument(DesignDocumentSchema, state, {
    history: 100,
    trustedInitial: true,
  });
  const iterations = Array.from({ length: warmups + samples }, (_, iteration) => {
    const label = `node-${targetIndex}-update-${iteration}`;
    return {
      expectedLabel: label,
      operations: [{
        op: "replace",
        path: `/nodes/${targetIndex}`,
        value: createCanvasNode(targetIndex, [], label),
      }],
    };
  });
  let expectedLabel = "";
  let publications = 0;
  doc.subscribe((operations) => {
    publications += 1;
    if (operations.length !== 1 || operations[0]?.op !== "replace") {
      throw new Error("Canvas node readiness publication was not one replacement");
    }
    if (doc.value.nodes[targetIndex]?.label !== expectedLabel) {
      throw new Error("Canvas node readiness subscriber observed stale state");
    }
  });

  const stats = measureIterations({
    iterations,
    resetPublications: () => { publications = 0; },
    readPublications: () => publications,
    run: (iteration) => {
      expectedLabel = iteration.expectedLabel;
      assertCommit(doc.commit(iteration.operations, {
        label: "Canvas adapter node update",
      }), "Canvas node");
    },
  });
  return readinessResult(
    `canvas node replace ${canvasNodes}`,
    stats,
    canvasNodeCpuP95BudgetMs,
  );
}

function measureCanvasBatchReplace() {
  const firstTarget = canvasNodes - canvasBatchSize;
  const state = createCanvasState(canvasNodes);
  const doc = createJSONDocument(DesignDocumentSchema, state, {
    history: 100,
    trustedInitial: true,
  });
  const iterations = Array.from({ length: warmups + samples }, (_, iteration) => {
    const operations = Array.from({ length: canvasBatchSize }, (_, offset) => {
      const nodeIndex = firstTarget + offset;
      return {
        op: "replace",
        path: `/nodes/${nodeIndex}`,
        value: createCanvasNode(
          nodeIndex,
          [],
          `node-${nodeIndex}-batch-${iteration}`,
        ),
      };
    });
    return {
      expectedLabel: operations.at(-1)?.value.label ?? "",
      operations,
    };
  });
  let expectedLabel = "";
  let publications = 0;
  doc.subscribe((operations) => {
    publications += 1;
    if (operations.length !== canvasBatchSize) {
      throw new Error(
        `Canvas batch readiness expected ${canvasBatchSize} operations, received ${operations.length}`,
      );
    }
    if (doc.value.nodes[canvasNodes - 1]?.label !== expectedLabel) {
      throw new Error("Canvas batch readiness subscriber observed stale state");
    }
  });

  const stats = measureIterations({
    iterations,
    resetPublications: () => { publications = 0; },
    readPublications: () => publications,
    run: (iteration) => {
      expectedLabel = iteration.expectedLabel;
      assertCommit(doc.commit(iteration.operations, {
        label: "Canvas adapter frame batch",
      }), "Canvas batch");
    },
  });
  return readinessResult(
    `canvas batch ${canvasNodes}/${canvasBatchSize}`,
    stats,
    canvasBatchCpuP95BudgetMs,
  );
}

function measureEditableCommit() {
  const targetIndex = editableBlocks - 1;
  const textPath = `/blocks/${targetIndex}/text`;
  const doc = createJSONDocument(
    EditableDocumentSchema,
    {
      schema: "interactive-os.editable-document@3",
      id: "readiness-document",
      blocks: Array.from({ length: editableBlocks }, (_, index) => ({
        id: `block-${index}`,
        type: "paragraph",
        text: `block ${index}`,
        marks: {},
      })),
    },
    {
      history: 100,
      selection: {
        mode: "extended",
        initial: [{
          anchor: { path: textPath, offset: 0 },
          focus: { path: textPath, offset: 0 },
        }],
      },
    },
  );
  if (!doc.selection) throw new Error("Editable readiness selection was not enabled");

  const iterations = Array.from({ length: warmups + samples }, (_, iteration) => {
    const text = `edited block ${iteration}`;
    const offset = (iteration + 1) % 2;
    const point = { path: textPath, offset };
    return {
      expectedOffset: offset,
      expectedText: text,
      operations: [{ op: "replace", path: textPath, value: text }],
      selectionAfter: { anchor: point, focus: point },
    };
  });
  let expectedOffset = 0;
  let expectedText = "";
  let documentPublications = 0;
  let selectionPublications = 0;
  doc.subscribe((operations, metadata) => {
    documentPublications += 1;
    if (operations.length !== 1 || operations[0]?.op !== "replace") {
      throw new Error("Editable readiness publication was not one replacement");
    }
    if (doc.value.blocks[targetIndex]?.text !== expectedText) {
      throw new Error("Editable readiness subscriber observed stale text");
    }
    if (metadata?.selectionAfter?.focus?.offset !== expectedOffset) {
      throw new Error("Editable readiness metadata observed stale selection");
    }
  });
  doc.selection.subscribe((selection) => {
    selectionPublications += 1;
    if (selection.focus?.path !== textPath || selection.focus.offset !== expectedOffset) {
      throw new Error("Editable readiness selection subscriber observed stale state");
    }
  });

  const stats = measureIterations({
    iterations,
    resetPublications: () => {
      documentPublications = 0;
      selectionPublications = 0;
    },
    readPublications: () => {
      if (documentPublications !== selectionPublications) {
        throw new Error(
          `Editable readiness publication mismatch: document=${documentPublications} selection=${selectionPublications}`,
        );
      }
      return documentPublications;
    },
    run: (iteration) => {
      expectedOffset = iteration.expectedOffset;
      expectedText = iteration.expectedText;
      assertCommit(doc.commit(iteration.operations, {
        label: "Editable adapter text input",
        origin: "keyboard",
        mergeKey: "typing",
        selectionAfter: iteration.selectionAfter,
      }), "Editable commit");
    },
  });
  return readinessResult(
    `editable commit ${editableBlocks}`,
    stats,
    editableCommitCpuP95BudgetMs,
  );
}

function measureIterations({
  iterations,
  readPublications,
  resetPublications,
  run,
}) {
  for (let index = 0; index < warmups; index += 1) {
    run(iterations[index]);
  }
  resetPublications();

  const cpuDurations = new Array(samples);
  const wallDurations = new Array(samples);
  for (let index = 0; index < samples; index += 1) {
    const iteration = iterations[warmups + index];
    const startedCpu = process.cpuUsage();
    const startedWall = performance.now();
    run(iteration);
    wallDurations[index] = performance.now() - startedWall;
    const cpuUsage = process.cpuUsage(startedCpu);
    cpuDurations[index] = (cpuUsage.user + cpuUsage.system) / 1_000;
    const publications = readPublications();
    if (publications !== index + 1) {
      throw new Error(
        `Readiness iteration ${index} expected ${index + 1} cumulative publications, received ${publications}`,
      );
    }
  }
  return {
    cpu: sampleStats(cpuDurations),
    wall: sampleStats(wallDurations),
  };
}

function createCanvasState(nodeCount) {
  return deepFreeze({
    schemaVersion: 1,
    roots: ["node-0"],
    nodes: Array.from({ length: nodeCount }, (_, index) =>
      createCanvasNode(
        index,
        index === 0
          ? Array.from({ length: nodeCount - 1 }, (__, child) => `node-${child + 1}`)
          : [],
      )),
  });
}

function createCanvasNode(index, children, label = `node-${index}`) {
  return {
    id: `node-${index}`,
    label,
    definition: { kind: "intrinsic", id: "div" },
    children,
    props: { index, nested: { visible: true } },
    text: null,
    layout: {},
    style: {},
    frame: null,
    component: null,
  };
}

function assertCommit(result, scenario) {
  if (!result.ok) {
    throw new Error(`${scenario} readiness commit failed: ${JSON.stringify(result)}`);
  }
}

function readinessResult(name, stats, cpuBudgetMs) {
  return { name, stats, cpuBudgetMs, pass: stats.cpu.p95 <= cpuBudgetMs };
}

function envPositiveInteger(name, fallback) {
  const value = envPositiveNumber(name, fallback);
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function envPositiveNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive finite number`);
  }
  return value;
}

function sampleStats(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) ?? 0,
  };
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index] ?? 0;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || Object.isFrozen(current)) continue;
    Object.freeze(current);
    for (const child of Object.values(current)) {
      if (child !== null && typeof child === "object" && !Object.isFrozen(child)) {
        pending.push(child);
      }
    }
  }
  return value;
}
