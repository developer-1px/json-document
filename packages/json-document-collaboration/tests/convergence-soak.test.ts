import { describe, expect, test } from "vitest";

import {
  compactCollaborationCheckpoint,
  createHistoryRuntime,
  restoreHistoryRuntime,
  type CollaborationBundle,
  type CollaborationChange,
  type HistoryRuntime,
  type CollaborationRulesetIdentity,
} from "../src/history-index.js";
import {
  createTaskBoardHost,
  taskBoardInitialValue,
  type TaskBoardHost,
} from "./support/task-board-host.js";

const caseCount = positiveInteger(
  process.env.JSON_DOCUMENT_COLLABORATION_SOAK_CASES,
  8,
);
const stepCount = positiveInteger(
  process.env.JSON_DOCUMENT_COLLABORATION_SOAK_STEPS,
  48,
);
const firstSeed = nonNegativeInteger(
  process.env.JSON_DOCUMENT_COLLABORATION_SOAK_SEED,
  0x6d2b79f5,
);

describe("deterministic collaboration convergence soak", () => {
  test("converges randomized task-board histories across delivery schedules", () => {
    for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
      runCase((firstSeed + caseIndex) >>> 0);
    }
  }, Math.max(120_000, caseCount * stepCount * 100));
});

function runCase(seed: number): void {
  const random = pseudoRandom(seed);
  const actorIds = ["actor-a", "actor-b", "actor-c"] as const;
  const ruleset: CollaborationRulesetIdentity = {
    id: "test/task-board-soak",
    digest: "test/task-board-soak/v1",
  };
  const epochId = `task-board-soak/${seed}/v1`;
  const runtimes: HistoryRuntime[] = actorIds.map((actorId) => (
    createHistoryRuntime(taskBoardInitialValue(), {
      actorId,
      epochId,
      ruleset,
    })
  ));
  const hosts: TaskBoardHost[] = runtimes.map(
    (runtime) => createTaskBoardHost(runtime.document),
  );

  for (let step = 0; step < stepCount; step += 1) {
    const actorIndex = integer(random, runtimes.length);
    authorRandomCommand(
      runtimes[actorIndex] as HistoryRuntime,
      hosts[actorIndex] as TaskBoardHost,
      actorIds[actorIndex] as string,
      step,
      random,
      seed,
    );
    if (random() < 0.55) {
      deliverRandomSubset(runtimes, random, seed, step);
    }
  }

  converge(runtimes, random, seed, "before-restore");
  assertConverged(runtimes, seed, "before-restore");

  const crashCheckpoint = runtimes[0]?.replica.exportCheckpoint();
  if (crashCheckpoint === undefined) {
    throw new Error(`seed ${seed}: missing crash checkpoint`);
  }
  const restored = restoreHistoryRuntime(crashCheckpoint, {
    actorId: actorIds[0],
    ruleset,
  });
  if (!restored.ok) {
    throw new Error(
      `seed ${seed}: restore failed: ${restored.code}: ${restored.reason}`,
    );
  }
  runtimes[0] = restored.runtime;
  hosts[0] = createTaskBoardHost(restored.runtime.document);
  requireSuccess(
    hosts[0]?.renameBoard(`Restored board ${seed}`),
    seed,
    "resume-authoring",
  );

  converge(runtimes, random, seed, "after-restore");
  assertConverged(runtimes, seed, "after-restore");

  const checkpoints = runtimes.map(
    (runtime) => runtime.replica.exportCheckpoint(),
  );
  for (const checkpoint of checkpoints.slice(1)) {
    expect(
      checkpoint,
      `seed ${seed}: converged replicas must export one canonical checkpoint`,
    ).toEqual(checkpoints[0]);
  }

  for (let index = 0; index < runtimes.length; index += 1) {
    const checkpoint = checkpoints[index];
    if (checkpoint === undefined) {
      throw new Error(`seed ${seed}: checkpoint ${index} is missing`);
    }
    const roundTrip = restoreHistoryRuntime(checkpoint, {
      actorId: actorIds[index] as string,
      ruleset,
    });
    if (!roundTrip.ok) {
      throw new Error(
        `seed ${seed}: round-trip ${index} failed: `
        + `${roundTrip.code}: ${roundTrip.reason}`,
      );
    }
    expect(
      roundTrip.runtime.document.value,
      `seed ${seed}: checkpoint document ${index}`,
    ).toEqual(runtimes[0]?.document.value);
    expect(
      roundTrip.runtime.replica.status(),
      `seed ${seed}: checkpoint causal snapshot ${index}`,
    ).toEqual(runtimes[0]?.replica.status());
    expect(
      stableHistory(roundTrip.runtime),
      `seed ${seed}: checkpoint history ${index}`,
    ).toEqual(stableHistory(runtimes[index] as HistoryRuntime));
  }

  const checkpoint = checkpoints[0];
  if (checkpoint === undefined) {
    throw new Error(`seed ${seed}: canonical checkpoint is missing`);
  }
  const nextRuleset: CollaborationRulesetIdentity = {
    id: ruleset.id,
    digest: `${ruleset.digest}/compacted`,
  };
  const compacted = compactCollaborationCheckpoint(checkpoint, {
    mode: "new-epoch",
    nextEpochId: `task-board-soak/${seed}/v3`,
    nextRuleset,
  });
  if (!compacted.ok) {
    throw new Error(
      `seed ${seed}: compaction failed: `
      + `${compacted.code}: ${compacted.reason}`,
    );
  }
  expect(compacted.report.discardedChanges).toBeGreaterThan(0);
  expect(compacted.checkpoint.payload.changes).toEqual([]);

  const compactedRestore = restoreHistoryRuntime(
    compacted.checkpoint,
    {
      actorId: "post-compaction",
      ruleset: nextRuleset,
    },
  );
  if (!compactedRestore.ok) {
    throw new Error(
      `seed ${seed}: compacted restore failed: `
      + `${compactedRestore.code}: ${compactedRestore.reason}`,
    );
  }
  expect(
    compactedRestore.runtime.document.value,
    `seed ${seed}: compacted document`,
  ).toEqual(runtimes[0]?.document.value);
  expect(compactedRestore.runtime.replica.status().pending).toEqual([]);
}

function authorRandomCommand(
  runtime: HistoryRuntime,
  host: TaskBoardHost,
  actorId: string,
  step: number,
  random: () => number,
  seed: number,
): void {
  const laneIds = host.laneIds();
  const cardIds = host.cardIds();
  const command = integer(random, 8);

  if (command === 0) {
    requireSuccess(
      host.renameBoard(`${actorId} board ${step}`),
      seed,
      `${actorId}:${step}:rename`,
    );
    return;
  }

  if (command === 1 || cardIds.length === 0) {
    const laneId = choose(laneIds, random);
    requireSuccess(
      host.addCard(laneId, {
        id: `${actorId}-${step}`,
        text: `Card ${seed}:${step}`,
        done: false,
      }),
      seed,
      `${actorId}:${step}:add`,
    );
    return;
  }

  const cardId = choose(cardIds, random);
  if (command === 2) {
    requireSuccess(
      host.updateCardText(cardId, `${actorId} text ${step}`),
      seed,
      `${actorId}:${step}:text`,
    );
    return;
  }
  if (command === 3) {
    requireSuccess(
      host.toggleCard(cardId),
      seed,
      `${actorId}:${step}:toggle`,
    );
    return;
  }
  if (command === 4) {
    requireSuccess(
      host.moveCard(cardId, choose(laneIds, random)),
      seed,
      `${actorId}:${step}:move`,
    );
    return;
  }
  if (command === 5) {
    requireSuccess(
      host.removeCard(cardId),
      seed,
      `${actorId}:${step}:remove`,
    );
    return;
  }
  if (command === 6) {
    const result = runtime.history.undo();
    if (!result.ok && result.code !== "nothing_to_undo") {
      throw new Error(
        `seed ${seed}: ${actorId}:${step}:undo failed: ${result.code}`,
      );
    }
    return;
  }

  const result = runtime.history.redo();
  if (!result.ok && result.code !== "nothing_to_redo") {
    throw new Error(
      `seed ${seed}: ${actorId}:${step}:redo failed: ${result.code}`,
    );
  }
}

function deliverRandomSubset(
  runtimes: ReadonlyArray<HistoryRuntime>,
  random: () => number,
  seed: number,
  step: number,
): void {
  const sourceIndex = integer(random, runtimes.length);
  const targetIndex = (
    sourceIndex + 1 + integer(random, runtimes.length - 1)
  ) % runtimes.length;
  const source = runtimes[sourceIndex] as HistoryRuntime;
  const target = runtimes[targetIndex] as HistoryRuntime;
  const exported = source.replica.exportBundle();
  if (exported.changes.length === 0) return;

  let selected = exported.changes.filter(() => random() < 0.45);
  if (selected.length === 0) {
    selected = [
      exported.changes[
        integer(random, exported.changes.length)
      ] as CollaborationChange,
    ];
  }
  const bundle: CollaborationBundle = {
    epoch: exported.epoch,
    changes: shuffle(selected, random),
  };
  requireIngest(
    target.replica.ingest(bundle),
    seed,
    `step ${step}: ${sourceIndex}->${targetIndex}`,
  );
  if (random() < 0.25) {
    requireIngest(
      target.replica.ingest(bundle),
      seed,
      `step ${step}: duplicate ${sourceIndex}->${targetIndex}`,
    );
  }
}

function converge(
  runtimes: ReadonlyArray<HistoryRuntime>,
  random: () => number,
  seed: number,
  phase: string,
): void {
  const union = unionChanges(runtimes, seed);
  for (let index = 0; index < runtimes.length; index += 1) {
    const runtime = runtimes[index] as HistoryRuntime;
    const result = runtime.replica.ingest({
      epoch: runtime.replica.epoch,
      changes: shuffle(union, random),
    });
    requireIngest(result, seed, `${phase}: converge replica ${index}`);
    if (result.ok && result.pending.length > 0) {
      throw new Error(
        `seed ${seed}: ${phase}: replica ${index} retained pending changes`,
      );
    }
  }
}

function unionChanges(
  runtimes: ReadonlyArray<HistoryRuntime>,
  seed: number,
): ReadonlyArray<CollaborationChange> {
  const changes = new Map<string, CollaborationChange>();
  for (const runtime of runtimes) {
    for (const change of runtime.replica.exportBundle().changes) {
      const key = `${change.changeId.actorId}:${change.changeId.counter}`;
      const existing = changes.get(key);
      if (
        existing !== undefined
        && JSON.stringify(existing) !== JSON.stringify(change)
      ) {
        throw new Error(`seed ${seed}: mismatched duplicate ${key}`);
      }
      changes.set(key, change);
    }
  }
  return [...changes.values()];
}

function assertConverged(
  runtimes: ReadonlyArray<HistoryRuntime>,
  seed: number,
  phase: string,
): void {
  const expected = runtimes[0];
  if (expected === undefined) {
    throw new Error(`seed ${seed}: no replicas`);
  }
  for (let index = 1; index < runtimes.length; index += 1) {
    const runtime = runtimes[index] as HistoryRuntime;
    expect(
      runtime.document.value,
      `seed ${seed}: ${phase}: document ${index}`,
    ).toEqual(expected.document.value);
    expect(
      runtime.replica.status(),
      `seed ${seed}: ${phase}: causal snapshot ${index}`,
    ).toEqual(expected.replica.status());
  }
}

function stableHistory(runtime: HistoryRuntime): {
  readonly undoTarget: unknown;
  readonly redoTarget: unknown;
  readonly undoDepth: number;
  readonly redoDepth: number;
} {
  const history = runtime.history.status();
  return {
    undoTarget: history.undoTarget,
    redoTarget: history.redoTarget,
    undoDepth: history.undoDepth,
    redoDepth: history.redoDepth,
  };
}

function requireSuccess(
  result: { readonly ok: boolean; readonly code?: string } | undefined,
  seed: number,
  context: string,
): void {
  if (result?.ok === true) return;
  throw new Error(
    `seed ${seed}: ${context} failed: ${result?.code ?? "missing_result"}`,
  );
}

function requireIngest(
  result: {
    readonly ok: boolean;
    readonly code?: string;
    readonly reason?: string;
  },
  seed: number,
  context: string,
): void {
  if (result.ok) return;
  throw new Error(
    `seed ${seed}: ${context} ingest failed: `
    + `${result.code ?? "unknown"}: ${result.reason ?? ""}`,
  );
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError("soak configuration must be a positive integer");
  }
  return parsed;
}

function nonNegativeInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed)
    || parsed < 0
    || parsed > 0xffff_ffff
  ) {
    throw new TypeError("soak seed must be an unsigned 32-bit integer");
  }
  return parsed;
}

function integer(random: () => number, upperBound: number): number {
  if (upperBound <= 0) {
    throw new RangeError("random integer upper bound must be positive");
  }
  return Math.floor(random() * upperBound);
}

function choose<T>(
  values: ReadonlyArray<T>,
  random: () => number,
): T {
  const value = values[integer(random, values.length)];
  if (value === undefined) throw new RangeError("cannot choose an empty value");
  return value;
}

function shuffle<T>(
  values: ReadonlyArray<T>,
  random: () => number,
): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = integer(random, index + 1);
    const current = shuffled[index] as T;
    shuffled[index] = shuffled[other] as T;
    shuffled[other] = current;
  }
  return shuffled;
}

function pseudoRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
