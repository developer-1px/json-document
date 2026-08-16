import {
  applyPatch,
  type JSONValue,
} from "@interactive-os/json-document";

import type {
  ChangeId,
  CollaborationBundle,
  CollaborationChange,
  CollaborationEpoch,
  CollaborationEpochParent,
  PendingChange,
  SemanticOperation,
} from "./types.js";

import { canonicalStringify } from "./digest.js";
export { canonicalStringify, fingerprintJSON } from "./digest.js";
export {
  canonicalMembership,
  checkEpoch,
  createEpoch,
  membershipAllows,
  unauthorizedChange,
  validateOptions,
} from "./epoch.js";

export interface PreparedGraph {
  readonly ordered: ReadonlyArray<CollaborationChange>;
  readonly readyKeys: ReadonlySet<string>;
  readonly pending: ReadonlyArray<PendingChange>;
  readonly heads: ReadonlyArray<ChangeId>;
}

type PreparedBundle =
  | { readonly ok: true; readonly bundle: CollaborationBundle }
  | { readonly ok: false; readonly reason: string };

export function prepareBundle(input: unknown): PreparedBundle {
  if (!isRecord(input)) return invalid("bundle must be an object");
  const epoch = prepareEpoch(input.epoch);
  if (!epoch.ok) return epoch;
  if (!Array.isArray(input.changes)) {
    return invalid("bundle changes must be an array");
  }

  const changes: CollaborationChange[] = [];
  for (const candidate of input.changes) {
    const prepared = prepareChange(candidate);
    if (!prepared.ok) return prepared;
    changes.push(prepared.change);
  }

  return {
    ok: true,
    bundle: Object.freeze({
      epoch: epoch.epoch,
      changes: Object.freeze(changes),
    }),
  };
}

export function freezeLocalChange(
  changeId: ChangeId,
  deps: ReadonlyArray<ChangeId>,
  ops: ReadonlyArray<SemanticOperation>,
): CollaborationChange {
  return Object.freeze({
    changeId: freezeChangeId(changeId),
    deps: Object.freeze(deps.map(freezeChangeId)),
    ops: Object.freeze(ops.map(freezeSemanticOperation)),
  });
}

export function changeIdKey(changeId: ChangeId): string {
  return `${changeId.actorId.length}:${changeId.actorId}:${changeId.counter}`;
}

export function compareChangeIds(left: ChangeId, right: ChangeId): number {
  const byCounter = left.counter - right.counter;
  return byCounter !== 0
    ? byCounter
    : left.actorId < right.actorId
      ? -1
      : left.actorId > right.actorId
        ? 1
        : 0;
}

export function compareChanges(
  left: CollaborationChange,
  right: CollaborationChange,
): number {
  return compareChangeIds(left.changeId, right.changeId);
}

export function changesEqual(
  left: CollaborationChange,
  right: CollaborationChange,
): boolean {
  return canonicalStringify(left as unknown as JSONValue)
    === canonicalStringify(right as unknown as JSONValue);
}

export function graphCycle(
  changes: ReadonlyMap<string, CollaborationChange>,
): ChangeId | null {
  const state = new Map<string, 1 | 2>();
  for (const key of [...changes.keys()].sort()) {
    if (state.has(key)) continue;
    const stack: Array<{ readonly key: string; next: number }> = [{ key, next: 0 }];
    state.set(key, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as { key: string; next: number };
      const change = changes.get(frame.key);
      if (change === undefined || frame.next >= change.deps.length) {
        state.set(frame.key, 2);
        stack.pop();
        continue;
      }
      const dependency = change.deps[frame.next++]!;
      const dependencyKey = changeIdKey(dependency);
      if (!changes.has(dependencyKey)) continue;
      const dependencyState = state.get(dependencyKey);
      if (dependencyState === 1) return changes.get(dependencyKey)?.changeId ?? null;
      if (dependencyState === 2) continue;
      state.set(dependencyKey, 1);
      stack.push({ key: dependencyKey, next: 0 });
    }
  }
  return null;
}

export function prepareGraph(
  changes: ReadonlyMap<string, CollaborationChange>,
): PreparedGraph {
  const unresolved = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  const available = new ChangeMinHeap();
  const readyKeys = new Set<string>();
  const ordered: CollaborationChange[] = [];

  for (const [key, change] of changes) {
    unresolved.set(key, change.deps.length);
    for (const dependency of change.deps) {
      const dependencyKey = changeIdKey(dependency);
      if (!changes.has(dependencyKey)) continue;
      const rows = dependents.get(dependencyKey);
      if (rows === undefined) dependents.set(dependencyKey, [key]);
      else rows.push(key);
    }
  }
  for (const [key, count] of unresolved) {
    if (count === 0) available.push(changes.get(key) as CollaborationChange);
  }

  while (available.size > 0) {
    const next = available.pop() as CollaborationChange;
    const key = changeIdKey(next.changeId);
    readyKeys.add(key);
    ordered.push(next);
    for (const dependentKey of dependents.get(key) ?? []) {
      const count = (unresolved.get(dependentKey) as number) - 1;
      unresolved.set(dependentKey, count);
      if (count === 0) {
        available.push(changes.get(dependentKey) as CollaborationChange);
      }
    }
  }

  const pending = [...changes.entries()]
    .filter(([key]) => !readyKeys.has(key))
    .map(([, change]) => change)
    .sort(compareChanges)
    .map((change) => Object.freeze({
      changeId: freezeChangeId(change.changeId),
      missing: Object.freeze(
        change.deps
          .filter((dependency) => !readyKeys.has(changeIdKey(dependency)))
          .sort(compareChangeIds)
          .map(freezeChangeId),
      ),
    }));

  const nonHeads = new Set<string>();
  for (const change of ordered) {
    for (const dependency of change.deps) {
      const key = changeIdKey(dependency);
      if (readyKeys.has(key)) nonHeads.add(key);
    }
  }
  const heads = ordered
    .filter((change) => !nonHeads.has(changeIdKey(change.changeId)))
    .map((change) => freezeChangeId(change.changeId))
    .sort(compareChangeIds);

  return {
    ordered: Object.freeze(ordered),
    readyKeys,
    pending: Object.freeze(pending),
    heads: Object.freeze(heads),
  };
}

class ChangeMinHeap {
  readonly #items: CollaborationChange[] = [];

  get size(): number {
    return this.#items.length;
  }

  push(change: CollaborationChange): void {
    let index = this.#items.push(change) - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareChanges(this.#items[parent]!, change) <= 0) break;
      this.#items[index] = this.#items[parent]!;
      index = parent;
    }
    this.#items[index] = change;
  }

  pop(): CollaborationChange | undefined {
    const first = this.#items[0];
    const last = this.#items.pop();
    if (first === undefined || last === undefined || this.#items.length === 0) {
      return first;
    }
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= this.#items.length) break;
      const right = left + 1;
      const child = right < this.#items.length
        && compareChanges(this.#items[right]!, this.#items[left]!) < 0
        ? right
        : left;
      if (compareChanges(this.#items[child]!, last) >= 0) break;
      this.#items[index] = this.#items[child]!;
      index = child;
    }
    this.#items[index] = last;
    return first;
  }
}

export function authorDependencies(
  graph: PreparedGraph,
  actorId: string,
  previousCounter: number,
): ReadonlyArray<ChangeId> {
  if (previousCounter === 0) return graph.heads;
  const previous = { actorId, counter: previousCounter };
  const dependencies = [...graph.heads];
  if (!dependencies.some((dependency) => (
    changeIdKey(dependency) === changeIdKey(previous)
  ))) {
    dependencies.push(previous);
  }
  return Object.freeze(dependencies.sort(compareChangeIds));
}

export function findActorFork(
  ordered: ReadonlyArray<CollaborationChange>,
): ChangeId | null {
  const changes = new Map(
    ordered.map((change) => [changeIdKey(change.changeId), change]),
  );
  const byActor = new Map<string, CollaborationChange[]>();
  for (const change of ordered) {
    const actorChanges = byActor.get(change.changeId.actorId);
    if (actorChanges === undefined) {
      byActor.set(change.changeId.actorId, [change]);
    } else {
      actorChanges.push(change);
    }
  }

  for (const actorChanges of byActor.values()) {
    actorChanges.sort(compareChanges);
    const first = actorChanges[0];
    if (first !== undefined && first.changeId.counter !== 1) {
      return first.changeId;
    }
    for (let index = 1; index < actorChanges.length; index += 1) {
      const previous = actorChanges[index - 1] as CollaborationChange;
      const current = actorChanges[index] as CollaborationChange;
      if (
        current.changeId.counter !== previous.changeId.counter + 1
        || !dependsTransitively(
          current,
          changeIdKey(previous.changeId),
          changes,
          new Set(),
        )
      ) {
        return current.changeId;
      }
    }
  }
  return null;
}

export function findActorDependencyFork(
  changes: ReadonlyMap<string, CollaborationChange>,
): ChangeId | null {
  for (const change of [...changes.values()].sort(compareChanges)) {
    const sameActorDependencies = change.deps.filter((dependency) => (
      dependency.actorId === change.changeId.actorId
    ));
    if (change.changeId.counter === 1) {
      if (sameActorDependencies.length > 0) return change.changeId;
      continue;
    }
    if (
      sameActorDependencies.length !== 1
      || sameActorDependencies[0]?.counter !== change.changeId.counter - 1
    ) {
      return change.changeId;
    }
  }
  return null;
}

export function freezeChangeId(changeId: ChangeId): ChangeId {
  return Object.freeze({
    actorId: changeId.actorId,
    counter: changeId.counter,
  });
}

function prepareEpoch(
  input: unknown,
):
  | { readonly ok: true; readonly epoch: CollaborationEpoch }
  | { readonly ok: false; readonly reason: string } {
  if (!isRecord(input)) return invalid("bundle epoch must be an object");
  if (input.protocolVersion !== 3) {
    return invalid("bundle protocolVersion must be 3");
  }
  if (!isNonEmptyString(input.epochId)) {
    return invalid("bundle epochId must be a non-empty string");
  }
  if (!isRecord(input.ruleset)) {
    return invalid("bundle ruleset must be an object");
  }
  if (!isNonEmptyString(input.ruleset.id)) {
    return invalid("bundle ruleset id must be a non-empty string");
  }
  if (!isNonEmptyString(input.ruleset.digest)) {
    return invalid("bundle ruleset digest must be a non-empty string");
  }
  if (input.acceptance !== "none" && input.acceptance !== "custom") {
    return invalid("bundle acceptance must be none or custom");
  }
  if (!isSha256Digest(input.baseDigest)) {
    return invalid("bundle baseDigest must be a sha256 digest");
  }
  if (!isSha256Digest(input.membershipDigest)) {
    return invalid("bundle membershipDigest must be a sha256 digest");
  }
  const parent = prepareEpochParent(input.parent);
  if (!parent.ok) return parent;

  return {
    ok: true,
    epoch: Object.freeze({
      protocolVersion: 3,
      epochId: input.epochId,
      ruleset: Object.freeze({
        id: input.ruleset.id,
        digest: input.ruleset.digest,
      }),
      acceptance: input.acceptance,
      baseDigest: input.baseDigest,
      membershipDigest: input.membershipDigest,
      parent: parent.parent,
    }),
  };
}

function prepareEpochParent(
  input: unknown,
):
  | { readonly ok: true; readonly parent: CollaborationEpochParent | null }
  | { readonly ok: false; readonly reason: string } {
  if (input === null) return { ok: true, parent: null };
  if (
    !isRecord(input)
    || !isNonEmptyString(input.epochId)
    || !isSha256Digest(input.checkpointDigest)
  ) {
    return invalid(
      "bundle epoch parent must be null or contain epochId and checkpointDigest",
    );
  }
  return {
    ok: true,
    parent: Object.freeze({
      epochId: input.epochId,
      checkpointDigest: input.checkpointDigest,
    }),
  };
}

function prepareChange(
  input: unknown,
):
  | { readonly ok: true; readonly change: CollaborationChange }
  | { readonly ok: false; readonly reason: string } {
  if (!isRecord(input)) return invalid("change must be an object");
  const changeId = prepareChangeId(input.changeId);
  if (!changeId.ok) return changeId;
  if (!Array.isArray(input.deps)) {
    return invalid("change deps must be an array");
  }

  const deps: ChangeId[] = [];
  const dependencyKeys = new Set<string>();
  for (const inputDependency of input.deps) {
    const dependency = prepareChangeId(inputDependency);
    if (!dependency.ok) return dependency;
    const key = changeIdKey(dependency.changeId);
    if (key === changeIdKey(changeId.changeId)) {
      return invalid("change cannot depend on itself");
    }
    if (dependencyKeys.has(key)) {
      return invalid("change deps cannot contain duplicates");
    }
    dependencyKeys.add(key);
    deps.push(dependency.changeId);
  }

  if (!Array.isArray(input.ops)) {
    return invalid("change ops must be an array");
  }
  const ops: SemanticOperation[] = [];
  for (const inputOperation of input.ops) {
    const operation = prepareSemanticOperation(inputOperation);
    if (!operation.ok) return operation;
    ops.push(operation.operation);
  }

  return {
    ok: true,
    change: Object.freeze({
      changeId: changeId.changeId,
      deps: Object.freeze(deps.sort(compareChangeIds)),
      ops: Object.freeze(ops),
    }),
  };
}

function prepareChangeId(
  input: unknown,
):
  | { readonly ok: true; readonly changeId: ChangeId }
  | { readonly ok: false; readonly reason: string } {
  if (!isRecord(input)) return invalid("changeId must be an object");
  if (!isNonEmptyString(input.actorId)) {
    return invalid("changeId actorId must be a non-empty string");
  }
  if (
    typeof input.counter !== "number"
    || !Number.isSafeInteger(input.counter)
    || input.counter < 1
  ) {
    return invalid("changeId counter must be a positive safe integer");
  }
  return {
    ok: true,
    changeId: Object.freeze({
      actorId: input.actorId,
      counter: input.counter,
    }),
  };
}

function prepareSemanticOperation(
  input: unknown,
):
  | { readonly ok: true; readonly operation: SemanticOperation }
  | { readonly ok: false; readonly reason: string } {
  if (!isRecord(input) || !isNonEmptyString(input.kind)) {
    return invalid("semantic operation must have a kind");
  }

  if (input.kind === "test") {
    if (!isNonEmptyString(input.target)) {
      return invalid("test target must be a non-empty string");
    }
    const expected = ownJSON(input.expected);
    if (!expected.ok) return expected;
    return {
      ok: true,
      operation: Object.freeze({
        kind: "test",
        target: input.target,
        expected: expected.value,
      }),
    };
  }

  if (input.kind === "set") {
    if (!isNonEmptyString(input.target)) {
      return invalid("set target must be a non-empty string");
    }
    const value = ownJSON(input.value);
    if (!value.ok) return value;
    return {
      ok: true,
      operation: Object.freeze({
        kind: "set",
        target: input.target,
        value: value.value,
      }),
    };
  }

  if (input.kind === "insert") {
    if (!isNonEmptyString(input.parent) || !isNonEmptyString(input.member)) {
      return invalid("insert parent and member must be non-empty strings");
    }
    const placement = preparePlacement(input.placement);
    if (!placement.ok) return placement;
    const value = ownJSON(input.value);
    if (!value.ok) return value;
    return {
      ok: true,
      operation: Object.freeze({
        kind: "insert",
        parent: input.parent,
        member: input.member,
        placement: placement.placement,
        value: value.value,
      }),
    };
  }

  if (input.kind === "remove") {
    if (!isNonEmptyString(input.target)) {
      return invalid("remove target must be a non-empty string");
    }
    return {
      ok: true,
      operation: Object.freeze({
        kind: "remove",
        target: input.target,
      }),
    };
  }

  if (input.kind === "move") {
    if (
      !isNonEmptyString(input.target)
      || !isNonEmptyString(input.parent)
    ) {
      return invalid("move target and parent must be non-empty strings");
    }
    const placement = preparePlacement(input.placement);
    if (!placement.ok) return placement;
    if (
      input.replaced !== undefined
      && !isNonEmptyString(input.replaced)
    ) {
      return invalid("move replaced must be a non-empty string");
    }
    return {
      ok: true,
      operation: Object.freeze({
        kind: "move",
        target: input.target,
        parent: input.parent,
        placement: placement.placement,
        ...(input.replaced === undefined
          ? {}
          : { replaced: input.replaced }),
      }),
    };
  }

  if (input.kind === "move-to-root") {
    if (!isNonEmptyString(input.source) || !isNonEmptyString(input.root)) {
      return invalid("move-to-root source and root must be non-empty strings");
    }
    return {
      ok: true,
      operation: Object.freeze({
        kind: "move-to-root",
        source: input.source,
        root: input.root,
      }),
    };
  }

  if (input.kind === "text-splice") {
    if (
      !isNonEmptyString(input.target)
      || !isNonEmptyString(input.textNode)
    ) {
      return invalid(
        "text-splice target and textNode must be non-empty strings",
      );
    }
    if (
      !(input.left === null || isNonEmptyString(input.left))
      || !(input.right === null || isNonEmptyString(input.right))
    ) {
      return invalid("text-splice anchors must be null or non-empty strings");
    }
    if (
      input.left !== null
      && input.right !== null
      && input.left === input.right
    ) {
      return invalid("text-splice anchors must identify different atoms");
    }
    if (!Array.isArray(input.removed)) {
      return invalid("text-splice removed must be an array");
    }
    const removed: string[] = [];
    const removedIds = new Set<string>();
    for (const atomId of input.removed) {
      if (!isNonEmptyString(atomId)) {
        return invalid(
          "text-splice removed atoms must be non-empty strings",
        );
      }
      if (removedIds.has(atomId)) {
        return invalid("text-splice removed atoms must be unique");
      }
      removedIds.add(atomId);
      removed.push(atomId);
    }
    if (
      (input.left !== null && removedIds.has(input.left))
      || (input.right !== null && removedIds.has(input.right))
    ) {
      return invalid("text-splice cannot remove either boundary atom");
    }
    if (typeof input.inserted !== "string") {
      return invalid("text-splice inserted must be a string");
    }
    if (removed.length === 0 && input.inserted.length === 0) {
      return invalid("text-splice must insert or remove text");
    }
    return {
      ok: true,
      operation: Object.freeze({
        kind: "text-splice",
        target: input.target,
        textNode: input.textNode,
        left: input.left,
        right: input.right,
        removed: Object.freeze(removed),
        inserted: input.inserted,
      }),
    };
  }

  if (input.kind === "undo-change") {
    const target = prepareChangeId(input.target);
    if (!target.ok) return target;
    return {
      ok: true,
      operation: Object.freeze({
        kind: "undo-change",
        target: target.changeId,
      }),
    };
  }

  if (input.kind === "redo-change") {
    const undo = prepareChangeId(input.undo);
    if (!undo.ok) return undo;
    return {
      ok: true,
      operation: Object.freeze({
        kind: "redo-change",
        undo: undo.changeId,
      }),
    };
  }

  return invalid(`unknown semantic operation kind: ${input.kind}`);
}

function preparePlacement(
  input: unknown,
):
  | {
      readonly ok: true;
      readonly placement:
        | { readonly kind: "object"; readonly key: string }
        | {
            readonly kind: "array";
            readonly after: string | null;
            readonly before: string | null;
          };
    }
  | { readonly ok: false; readonly reason: string } {
  if (!isRecord(input)) return invalid("placement must be an object");
  if (input.kind === "object" && typeof input.key === "string") {
    return {
      ok: true,
      placement: Object.freeze({ kind: "object", key: input.key }),
    };
  }
  if (
    input.kind === "array"
    && (input.after === null || isNonEmptyString(input.after))
    && (input.before === null || isNonEmptyString(input.before))
  ) {
    return {
      ok: true,
      placement: Object.freeze({
        kind: "array",
        after: input.after,
        before: input.before,
      }),
    };
  }
  return invalid("placement must be an object key or array anchor");
}

function freezeSemanticOperation(
  operation: SemanticOperation,
): SemanticOperation {
  const prepared = prepareSemanticOperation(operation);
  if (!prepared.ok) {
    throw new TypeError(prepared.reason);
  }
  return prepared.operation;
}

function ownJSON(
  input: unknown,
):
  | { readonly ok: true; readonly value: JSONValue }
  | { readonly ok: false; readonly reason: string } {
  const result = applyPatch(input, []);
  return result.ok
    ? { ok: true, value: result.value }
    : invalid(result.reason ?? result.code);
}

function invalid(reason: string): { readonly ok: false; readonly reason: string } {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSha256Digest(value: unknown): value is string {
  return (
    typeof value === "string"
    && /^sha256:[0-9a-f]{64}$/.test(value)
  );
}

function dependsTransitively(
  change: CollaborationChange,
  targetKey: string,
  changes: ReadonlyMap<string, CollaborationChange>,
  seen: Set<string>,
): boolean {
  for (const dependency of change.deps) {
    const key = changeIdKey(dependency);
    if (key === targetKey) return true;
    if (seen.has(key)) continue;
    seen.add(key);
    const dependencyChange = changes.get(key);
    if (
      dependencyChange !== undefined
      && dependsTransitively(
        dependencyChange,
        targetKey,
        changes,
        seen,
      )
    ) {
      return true;
    }
  }
  return false;
}
