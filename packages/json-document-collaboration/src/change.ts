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
  CollaborationIngestResult,
  CollaborationMembership,
  CollaborationRuntimeOptions,
  PendingChange,
  SemanticOperation,
} from "./types.js";

export interface PreparedGraph {
  readonly ordered: ReadonlyArray<CollaborationChange>;
  readonly readyKeys: ReadonlySet<string>;
  readonly pending: ReadonlyArray<PendingChange>;
  readonly heads: ReadonlyArray<ChangeId>;
}

type PreparedBundle =
  | { readonly ok: true; readonly bundle: CollaborationBundle }
  | { readonly ok: false; readonly reason: string };

export function createEpoch(
  initial: JSONValue,
  options: CollaborationRuntimeOptions,
  parent: CollaborationEpochParent | null = null,
): CollaborationEpoch {
  const membership = canonicalMembership(options.membership);
  return Object.freeze({
    protocolVersion: 3,
    epochId: options.epochId,
    ruleset: Object.freeze({
      id: options.ruleset.id,
      digest: options.ruleset.digest,
    }),
    acceptance: options.validate === undefined
      ? "none"
      : "custom",
    baseDigest: fingerprintJSON(initial),
    membershipDigest: fingerprintJSON(
      membership as unknown as JSONValue,
    ),
    parent: parent === null
      ? null
      : Object.freeze({
          epochId: parent.epochId,
          checkpointDigest: parent.checkpointDigest,
        }),
  });
}

export function canonicalMembership(
  input: CollaborationMembership | undefined,
): CollaborationMembership | null {
  if (input === undefined) return null;
  if (input.version !== 1 || !Array.isArray(input.members)) {
    throw new TypeError("membership must be a version 1 member list");
  }
  const members = input.members.map((member) => {
    if (
      typeof member !== "object"
      || member === null
      || !isNonEmptyString(member.actorId)
      || (
        member.credentialId !== undefined
        && !isNonEmptyString(member.credentialId)
      )
    ) {
      throw new TypeError(
        "membership entries require actorId and an optional credentialId",
      );
    }
    return Object.freeze({
      actorId: member.actorId,
      ...(member.credentialId === undefined
        ? {}
        : { credentialId: member.credentialId }),
    });
  }).sort((left, right) => (
    left.actorId < right.actorId ? -1 : left.actorId > right.actorId ? 1 : 0
  ));
  if (members.length === 0) {
    throw new TypeError("membership must admit at least one actor");
  }
  for (let index = 1; index < members.length; index += 1) {
    if (members[index - 1]?.actorId === members[index]?.actorId) {
      throw new TypeError("membership actorId values must be unique");
    }
  }
  return Object.freeze({
    version: 1,
    members: Object.freeze(members),
  });
}

export function membershipAllows(
  membership: CollaborationMembership | null,
  actorId: string,
): boolean {
  return (
    membership === null
    || membership.members.some((member) => member.actorId === actorId)
  );
}

export function validateOptions(options: CollaborationRuntimeOptions): void {
  if (
    typeof options !== "object"
    || options === null
    || typeof options.actorId !== "string"
    || options.actorId.length === 0
  ) {
    throw new TypeError("actorId must be a non-empty string");
  }
  if (typeof options.epochId !== "string" || options.epochId.length === 0) {
    throw new TypeError("epochId must be a non-empty string");
  }
  if (
    typeof options.ruleset !== "object"
    || options.ruleset === null
    || typeof options.ruleset.id !== "string"
    || options.ruleset.id.length === 0
    || typeof options.ruleset.digest !== "string"
    || options.ruleset.digest.length === 0
  ) {
    throw new TypeError("ruleset id and digest must be non-empty strings");
  }
  canonicalMembership(options.membership);
}

export function checkEpoch(
  expected: CollaborationEpoch,
  actual: CollaborationEpoch,
): Extract<CollaborationIngestResult, { readonly ok: false }> | null {
  if (actual.epochId !== expected.epochId) {
    return {
      ok: false,
      code: "epoch_mismatch",
      reason: "bundle epochId does not match this document",
    };
  }
  if (
    actual.ruleset.id !== expected.ruleset.id
    || actual.ruleset.digest !== expected.ruleset.digest
  ) {
    return {
      ok: false,
      code: "ruleset_mismatch",
      reason: "bundle ruleset does not match this document epoch",
    };
  }
  if (actual.acceptance !== expected.acceptance) {
    return {
      ok: false,
      code: "ruleset_mismatch",
      reason: "bundle acceptance mode does not match this document epoch",
    };
  }
  if (actual.baseDigest !== expected.baseDigest) {
    return {
      ok: false,
      code: "checkpoint_mismatch",
      reason: "bundle checkpoint does not match this document epoch",
    };
  }
  if (actual.membershipDigest !== expected.membershipDigest) {
    return {
      ok: false,
      code: "membership_mismatch",
      reason: "bundle membership does not match this document epoch",
    };
  }
  if (
    canonicalStringify(actual.parent as unknown as JSONValue)
    !== canonicalStringify(expected.parent as unknown as JSONValue)
  ) {
    return {
      ok: false,
      code: "epoch_mismatch",
      reason: "bundle epoch parent does not match this document epoch",
    };
  }
  return null;
}

export function unauthorizedChange(
  changes: ReadonlyArray<CollaborationChange>,
  membership: CollaborationMembership | null,
): ChangeId | null {
  if (membership === null) return null;
  for (const change of changes) {
    if (!membershipAllows(membership, change.changeId.actorId)) {
      return change.changeId;
    }
    for (const dependency of change.deps) {
      if (!membershipAllows(membership, dependency.actorId)) {
        return change.changeId;
      }
    }
    for (const operation of change.ops) {
      const referenced = operation.kind === "undo-change"
        ? operation.target
        : operation.kind === "redo-change"
          ? operation.undo
          : null;
      if (
        referenced !== null
        && !membershipAllows(membership, referenced.actorId)
      ) {
        return change.changeId;
      }
    }
  }
  return null;
}

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
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string): ChangeId | null => {
    if (visiting.has(key)) return changes.get(key)?.changeId ?? null;
    if (visited.has(key)) return null;
    const change = changes.get(key);
    if (change === undefined) return null;

    visiting.add(key);
    for (const dependency of change.deps) {
      const dependencyKey = changeIdKey(dependency);
      if (!changes.has(dependencyKey)) continue;
      const found = visit(dependencyKey);
      if (found !== null) return found;
    }
    visiting.delete(key);
    visited.add(key);
    return null;
  };

  for (const key of [...changes.keys()].sort()) {
    const found = visit(key);
    if (found !== null) return found;
  }
  return null;
}

export function prepareGraph(
  changes: ReadonlyMap<string, CollaborationChange>,
): PreparedGraph {
  const remaining = new Map(changes);
  const readyKeys = new Set<string>();
  const ordered: CollaborationChange[] = [];

  while (remaining.size > 0) {
    const available = [...remaining.values()]
      .filter((change) => change.deps.every((dependency) => (
        readyKeys.has(changeIdKey(dependency))
      )))
      .sort(compareChanges);
    const next = available[0];
    if (next === undefined) break;
    const key = changeIdKey(next.changeId);
    remaining.delete(key);
    readyKeys.add(key);
    ordered.push(next);
  }

  const pending = [...remaining.values()]
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

export function fingerprintJSON(value: JSONValue): string {
  return `sha256:${sha256(canonicalStringify(value))}`;
}

export function canonicalStringify(value: JSONValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const entries = Object.entries(value)
    .sort(([left], [right]) => (
      left < right ? -1 : left > right ? 1 : 0
    ))
    .map(([key, child]) => (
      `${JSON.stringify(key)}:${canonicalStringify(child)}`
    ));
  return `{${entries.join(",")}}`;
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

function sha256(source: string): string {
  const input = new TextEncoder().encode(source);
  const zeroPadding = (64 - ((input.length + 1 + 8) % 64)) % 64;
  const bytes = new Uint8Array(input.length + 1 + zeroPadding + 8);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const bitLength = BigInt(input.length) * 8n;
  for (let index = 0; index < 8; index += 1) {
    bytes[bytes.length - 1 - index] = Number(
      (bitLength >> BigInt(index * 8)) & 0xffn,
    );
  }

  const hash = [
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const cursor = offset + index * 4;
      words[index] = (
        ((bytes[cursor] as number) << 24)
        | ((bytes[cursor + 1] as number) << 16)
        | ((bytes[cursor + 2] as number) << 8)
        | (bytes[cursor + 3] as number)
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15] as number;
      const right = words[index - 2] as number;
      const sigma0 = (
        rotateRight(left, 7)
        ^ rotateRight(left, 18)
        ^ (left >>> 3)
      ) >>> 0;
      const sigma1 = (
        rotateRight(right, 17)
        ^ rotateRight(right, 19)
        ^ (right >>> 10)
      ) >>> 0;
      words[index] = (
        (words[index - 16] as number)
        + sigma0
        + (words[index - 7] as number)
        + sigma1
      ) >>> 0;
    }

    let a = hash[0] as number;
    let b = hash[1] as number;
    let c = hash[2] as number;
    let d = hash[3] as number;
    let e = hash[4] as number;
    let f = hash[5] as number;
    let g = hash[6] as number;
    let h = hash[7] as number;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = (
        rotateRight(e, 6)
        ^ rotateRight(e, 11)
        ^ rotateRight(e, 25)
      ) >>> 0;
      const choice = ((e & f) ^ (~e & g)) >>> 0;
      const temporary1 = (
        h
        + sum1
        + choice
        + (SHA256_CONSTANTS[index] as number)
        + (words[index] as number)
      ) >>> 0;
      const sum0 = (
        rotateRight(a, 2)
        ^ rotateRight(a, 13)
        ^ rotateRight(a, 22)
      ) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temporary2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    hash[0] = ((hash[0] as number) + a) >>> 0;
    hash[1] = ((hash[1] as number) + b) >>> 0;
    hash[2] = ((hash[2] as number) + c) >>> 0;
    hash[3] = ((hash[3] as number) + d) >>> 0;
    hash[4] = ((hash[4] as number) + e) >>> 0;
    hash[5] = ((hash[5] as number) + f) >>> 0;
    hash[6] = ((hash[6] as number) + g) >>> 0;
    hash[7] = ((hash[7] as number) + h) >>> 0;
  }

  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

function rotateRight(value: number, count: number): number {
  return ((value >>> count) | (value << (32 - count))) >>> 0;
}

const SHA256_CONSTANTS = Object.freeze([
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
]);
