import type {
  JSONCapabilityResult,
  JSONValue,
} from "@interactive-os/json-document";

import {
  changeIdKey,
  freezeChangeId,
} from "./change.js";
import {
  applySemanticChange,
  cloneTree,
  projectTree,
  type TreeState,
} from "./tree.js";
import type {
  ChangeId,
  CollaborationChange,
  CollaborationConflict,
  SemanticOperation,
  SuppressedChange,
} from "./types.js";

type HistoryOperation = Extract<
  SemanticOperation,
  { readonly kind: "undo-change" | "redo-change" }
>;

export interface MaterializedHistoryState {
  readonly disabledByTarget: ReadonlyMap<string, ChangeId>;
  readonly appliedKeys: ReadonlySet<string>;
  readonly appliedUndoTargets: ReadonlyMap<string, ChangeId>;
  readonly appliedControlKeys: ReadonlySet<string>;
}

export interface MaterializedDocument {
  readonly tree: TreeState;
  readonly value: JSONValue;
  readonly conflicts: ReadonlyArray<CollaborationConflict>;
  readonly suppressed: ReadonlyArray<SuppressedChange>;
  readonly history: MaterializedHistoryState;
}

export function materializeChanges(
  initialTree: TreeState,
  ordered: ReadonlyArray<CollaborationChange>,
  accepts: ((candidate: JSONValue) => JSONCapabilityResult) | undefined,
): MaterializedDocument {
  const isAncestor = createAncestry(ordered);
  const changes = new Map(
    ordered.map((change) => [changeIdKey(change.changeId), change]),
  );
  const disabledByTarget = new Map<string, ChangeId>();
  const appliedUndoTargets = new Map<string, ChangeId>();
  const appliedControlKeys = new Set<string>();
  const controlSuppressed: SuppressedChange[] = [];
  let replay = replayDataChanges(
    initialTree,
    ordered,
    disabledByTarget,
    accepts,
    isAncestor,
  );

  for (const change of ordered) {
    const control = classifyHistoryChange(change);
    if (control.kind === "none") continue;
    if (control.kind === "invalid") {
      controlSuppressed.push(freezeSuppressed(
        change.changeId,
        "invalid_history_change",
        control.reason,
      ));
      continue;
    }

    const changeKey = changeIdKey(change.changeId);
    if (control.operation.kind === "undo-change") {
      const targetKey = changeIdKey(control.operation.target);
      const target = changes.get(targetKey);
      const invalidReason = validateUndoTarget(
        change,
        target,
        control.operation.target,
        replay,
        disabledByTarget,
        isAncestor,
      );
      if (invalidReason !== null) {
        controlSuppressed.push(freezeSuppressed(
          change.changeId,
          invalidReason.code,
          invalidReason.reason,
        ));
        continue;
      }

      const candidateDisabled = new Map(disabledByTarget);
      candidateDisabled.set(targetKey, freezeChangeId(change.changeId));
      const candidate = replayDataChanges(
        initialTree,
        ordered,
        candidateDisabled,
        accepts,
        isAncestor,
      );
      const dependency = newlySuppressedAppliedChange(
        replay,
        candidate,
        change.changeId,
        changes,
        isAncestor,
        targetKey,
      );
      if (dependency !== null) {
        controlSuppressed.push(freezeSuppressed(
          change.changeId,
          "undo_dependency_conflict",
          `undo would suppress another accepted Change: ${dependency}`,
        ));
        continue;
      }

      disabledByTarget.clear();
      for (const [key, value] of candidateDisabled) {
        disabledByTarget.set(key, value);
      }
      replay = candidate;
      appliedUndoTargets.set(changeKey, freezeChangeId(control.operation.target));
      appliedControlKeys.add(changeKey);
      continue;
    }

    const undoKey = changeIdKey(control.operation.undo);
    const target = appliedUndoTargets.get(undoKey);
    const targetKey = target === undefined ? null : changeIdKey(target);
    const currentUndo = targetKey === null
      ? undefined
      : disabledByTarget.get(targetKey);
    const latestActorUndo = latestEffectiveUndo(
      disabledByTarget,
      change.changeId.actorId,
    );
    const validRedo = (
      target !== undefined
      && currentUndo !== undefined
      && changeIdKey(currentUndo) === undoKey
      && latestActorUndo !== null
      && changeIdKey(latestActorUndo) === undoKey
      && change.changeId.actorId === control.operation.undo.actorId
      && isAncestor(control.operation.undo, change.changeId)
      && !hasInterveningActorData(
        ordered,
        control.operation.undo,
        change.changeId,
      )
    );
    if (!validRedo || targetKey === null) {
      controlSuppressed.push(freezeSuppressed(
        change.changeId,
        "redo_target_invalid",
        "redo must reference the currently effective causal undo from the same actor",
      ));
      continue;
    }

    const candidateDisabled = new Map(disabledByTarget);
    candidateDisabled.delete(targetKey);
    const candidate = replayDataChanges(
      initialTree,
      ordered,
      candidateDisabled,
      accepts,
      isAncestor,
    );
    const dependency = newlySuppressedAppliedChange(
      replay,
      candidate,
      change.changeId,
      changes,
      isAncestor,
    );
    if (
      dependency !== null
      || !candidate.appliedKeys.has(targetKey)
    ) {
      controlSuppressed.push(freezeSuppressed(
        change.changeId,
        "redo_dependency_conflict",
        dependency === null
          ? "redo target would remain suppressed"
          : `redo would suppress another accepted Change: ${dependency}`,
      ));
      continue;
    }

    disabledByTarget.clear();
    for (const [key, value] of candidateDisabled) {
      disabledByTarget.set(key, value);
    }
    replay = candidate;
    appliedControlKeys.add(changeKey);
  }

  const orderByKey = new Map(
    ordered.map((change, order) => [changeIdKey(change.changeId), order]),
  );
  const suppressed = [...replay.suppressed, ...controlSuppressed]
    .sort((left, right) => (
      (orderByKey.get(changeIdKey(left.changeId)) ?? Number.MAX_SAFE_INTEGER)
      - (orderByKey.get(changeIdKey(right.changeId)) ?? Number.MAX_SAFE_INTEGER)
    ));
  return {
    tree: replay.tree,
    value: replay.value,
    conflicts: replay.conflicts,
    suppressed: Object.freeze(suppressed),
    history: {
      disabledByTarget,
      appliedKeys: replay.appliedKeys,
      appliedUndoTargets,
      appliedControlKeys,
    },
  };
}

export function projectAcceptedTree(
  tree: TreeState,
  ordered: ReadonlyArray<CollaborationChange>,
  suppressed: ReadonlyArray<SuppressedChange>,
): MaterializedDocument {
  const projected = projectTree(tree, createAncestry(ordered));
  if (!projected.ok) {
    throw new Error(`materialized tree is invalid: ${projected.reason}`);
  }
  return {
    tree,
    value: projected.value,
    conflicts: Object.freeze(projected.conflicts.map(freezeConflict)),
    suppressed,
    history: {
      disabledByTarget: new Map(),
      appliedKeys: new Set(),
      appliedUndoTargets: new Map(),
      appliedControlKeys: new Set(),
    },
  };
}

export function historyOperationFor(
  change: CollaborationChange,
): HistoryOperation | null {
  const classified = classifyHistoryChange(change);
  return classified.kind === "valid" ? classified.operation : null;
}

export function isUndoableChange(change: CollaborationChange): boolean {
  return (
    change.ops.length > 0
    && change.ops.every((operation) => !isHistoryOperation(operation))
  );
}

export function acceptCandidate(
  accepts: ((candidate: JSONValue) => JSONCapabilityResult) | undefined,
  candidate: JSONValue,
): JSONCapabilityResult {
  if (accepts === undefined) return OK;
  try {
    const result = accepts(freezeJSON(candidate));
    if (result?.ok === true) return OK;
    if (result?.ok === false && typeof result.code === "string") {
      return Object.freeze({
        ok: false,
        code: result.code,
        ...(result.reason === undefined ? {} : { reason: result.reason }),
        ...(result.pointer === undefined ? {} : { pointer: result.pointer }),
      });
    }
    return failure(
      "schema_violation",
      "acceptance callback must return a result with an ok discriminant",
    );
  } catch (error) {
    return failure(
      "schema_violation",
      error instanceof Error ? error.message : "acceptance callback failed",
    );
  }
}

function createAncestry(
  ordered: ReadonlyArray<CollaborationChange>,
): (left: ChangeId, right: ChangeId) => boolean {
  const changes = new Map(
    ordered.map((change) => [changeIdKey(change.changeId), change]),
  );
  const cache = new Map<string, boolean>();

  return (left: ChangeId, right: ChangeId): boolean => {
    const leftKey = changeIdKey(left);
    const rightKey = changeIdKey(right);
    if (leftKey === rightKey) return false;
    const pair = `${leftKey.length}:${leftKey}${rightKey}`;
    const cached = cache.get(pair);
    if (cached !== undefined) return cached;

    const seen = new Set<string>();
    const visit = (currentKey: string): boolean => {
      if (currentKey === leftKey) return true;
      if (seen.has(currentKey)) return false;
      seen.add(currentKey);
      const current = changes.get(currentKey);
      if (current === undefined) return false;
      return current.deps.some((dependency) => visit(changeIdKey(dependency)));
    };
    const result = visit(rightKey);
    cache.set(pair, result);
    return result;
  };
}

function freezeConflict(
  conflict: CollaborationConflict,
): CollaborationConflict {
  if (conflict.kind === "object-key") {
    return Object.freeze({
      ...conflict,
      alternatives: Object.freeze([...conflict.alternatives]),
    });
  }
  return Object.freeze({
    ...conflict,
    winner: freezeChangeId(conflict.winner),
    alternatives: Object.freeze(
      conflict.alternatives.map(freezeChangeId),
    ),
  });
}

function freezeSuppressed(
  changeId: ChangeId,
  code: string,
  reason?: string,
  pointer?: string,
): SuppressedChange {
  return Object.freeze({
    changeId: freezeChangeId(changeId),
    code,
    ...(reason === undefined ? {} : { reason }),
    ...(pointer === undefined ? {} : { pointer }),
  });
}

function failure(
  code: string,
  reason?: string,
): Extract<JSONCapabilityResult, { readonly ok: false }> {
  return Object.freeze({
    ok: false,
    code,
    ...(reason === undefined ? {} : { reason }),
  });
}

const OK: JSONCapabilityResult = Object.freeze({ ok: true });

interface DataReplay {
  readonly tree: TreeState;
  readonly value: JSONValue;
  readonly conflicts: ReadonlyArray<CollaborationConflict>;
  readonly suppressed: ReadonlyArray<SuppressedChange>;
  readonly appliedKeys: ReadonlySet<string>;
}

function replayDataChanges(
  initialTree: TreeState,
  ordered: ReadonlyArray<CollaborationChange>,
  disabledByTarget: ReadonlyMap<string, ChangeId>,
  accepts: ((candidate: JSONValue) => JSONCapabilityResult) | undefined,
  isAncestor: (left: ChangeId, right: ChangeId) => boolean,
): DataReplay {
  let tree = cloneTree(initialTree);
  const suppressed: SuppressedChange[] = [];
  const appliedKeys = new Set<string>();

  for (const [order, change] of ordered.entries()) {
    const classified = classifyHistoryChange(change);
    if (classified.kind !== "none") continue;
    const key = changeIdKey(change.changeId);
    if (disabledByTarget.has(key)) continue;

    const candidate = cloneTree(tree);
    const applied = applySemanticChange(candidate, change, order);
    if (!applied.ok) {
      suppressed.push(freezeSuppressed(
        change.changeId,
        applied.code,
        applied.reason,
      ));
      continue;
    }

    const projected = projectTree(candidate, isAncestor);
    if (!projected.ok) {
      suppressed.push(freezeSuppressed(
        change.changeId,
        projected.code,
        projected.reason,
      ));
      continue;
    }

    const accepted = acceptCandidate(accepts, projected.value);
    if (!accepted.ok) {
      suppressed.push(freezeSuppressed(
        change.changeId,
        accepted.code,
        accepted.reason,
        accepted.pointer,
      ));
      continue;
    }
    tree = candidate;
    appliedKeys.add(key);
  }

  const projected = projectTree(tree, isAncestor);
  if (!projected.ok) {
    throw new Error(`materialized tree is invalid: ${projected.reason}`);
  }
  return {
    tree,
    value: projected.value,
    conflicts: Object.freeze(projected.conflicts.map(freezeConflict)),
    suppressed: Object.freeze(suppressed),
    appliedKeys,
  };
}

function classifyHistoryChange(
  change: CollaborationChange,
):
  | { readonly kind: "none" }
  | { readonly kind: "valid"; readonly operation: HistoryOperation }
  | { readonly kind: "invalid"; readonly reason: string } {
  const controls = change.ops.filter(isHistoryOperation);
  if (controls.length === 0) return { kind: "none" };
  if (controls.length !== 1 || change.ops.length !== 1) {
    return {
      kind: "invalid",
      reason: "a history Change must contain exactly one history operation",
    };
  }
  return { kind: "valid", operation: controls[0] as HistoryOperation };
}

function isHistoryOperation(
  operation: SemanticOperation,
): operation is HistoryOperation {
  return (
    operation.kind === "undo-change"
    || operation.kind === "redo-change"
  );
}

function validateUndoTarget(
  undo: CollaborationChange,
  target: CollaborationChange | undefined,
  targetId: ChangeId,
  replay: DataReplay,
  disabledByTarget: ReadonlyMap<string, ChangeId>,
  isAncestor: (left: ChangeId, right: ChangeId) => boolean,
): { readonly code: string; readonly reason: string } | null {
  const targetKey = changeIdKey(targetId);
  if (
    target === undefined
    || !isUndoableChange(target)
    || undo.changeId.actorId !== targetId.actorId
    || !isAncestor(targetId, undo.changeId)
  ) {
    return {
      code: "undo_target_invalid",
      reason: "undo must target an earlier causal data Change from the same actor",
    };
  }
  if (
    disabledByTarget.has(targetKey)
    || !replay.appliedKeys.has(targetKey)
  ) {
    return {
      code: "undo_target_inactive",
      reason: "undo target is already inactive or suppressed",
    };
  }
  return null;
}

function newlySuppressedAppliedChange(
  previous: DataReplay,
  candidate: DataReplay,
  control: ChangeId,
  changes: ReadonlyMap<string, CollaborationChange>,
  isAncestor: (left: ChangeId, right: ChangeId) => boolean,
  ignoredKey?: string,
): string | null {
  for (const key of previous.appliedKeys) {
    if (key === ignoredKey) continue;
    const disappeared = changes.get(key);
    if (
      !candidate.appliedKeys.has(key)
      && disappeared !== undefined
      && isAncestor(disappeared.changeId, control)
    ) {
      return key;
    }
  }
  return null;
}

function hasInterveningActorData(
  ordered: ReadonlyArray<CollaborationChange>,
  start: ChangeId,
  end: ChangeId,
): boolean {
  const startKey = changeIdKey(start);
  const endKey = changeIdKey(end);
  let between = false;
  for (const change of ordered) {
    const key = changeIdKey(change.changeId);
    if (key === startKey) {
      between = true;
      continue;
    }
    if (key === endKey) return false;
    if (
      between
      && change.changeId.actorId === end.actorId
      && isUndoableChange(change)
    ) {
      return true;
    }
  }
  return true;
}

function latestEffectiveUndo(
  disabledByTarget: ReadonlyMap<string, ChangeId>,
  actorId: string,
): ChangeId | null {
  let latest: ChangeId | null = null;
  for (const undo of disabledByTarget.values()) {
    if (
      undo.actorId === actorId
      && (latest === null || undo.counter > latest.counter)
    ) {
      latest = undo;
    }
  }
  return latest;
}

function freezeJSON<T extends JSONValue>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeJSON(child);
  Object.freeze(value);
  return value;
}
