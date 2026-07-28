import {
  parsePointer,
  type JSONPatchOperation,
} from "@interactive-os/json-document";

import { changeIdKey } from "./change.js";
import {
  applyAuthoredOperation,
  arrayMembers,
  arrayPositionId,
  cloneTree,
  objectMembersAt,
  projectMemberValue,
  resolveMember,
  resolveParent,
  resolveTextMemberSnapshot,
  type TreeContainer,
  type TreeFailure,
  type TreeState,
} from "./tree.js";
import { createMinimalTextSplice } from "./text-core.js";
import type {
  ChangeId,
  MemberId,
  MemberPlacement,
  SemanticOperation,
  TextSpliceOperation,
} from "./types.js";

export interface CompiledOperations {
  readonly ops: ReadonlyArray<SemanticOperation>;
  readonly tree: TreeState;
}

export interface CompilePatchOperationsOptions {
  readonly collaborativeText?: boolean;
}

type CompileResult =
  | { readonly ok: true; readonly value: CompiledOperations }
  | TreeFailure;

interface Destination {
  readonly parent: TreeContainer;
  readonly placement: MemberPlacement;
  readonly existing?: MemberId;
  readonly alternatives: ReadonlyArray<MemberId>;
}

export function compilePatchOperations(
  base: TreeState,
  operations: ReadonlyArray<JSONPatchOperation>,
  changeId: ChangeId,
  order: number,
  options: CompilePatchOperationsOptions = {},
): CompileResult {
  const tree = cloneTree(base);
  const semantic: SemanticOperation[] = [];

  const append = (operation: SemanticOperation): TreeFailure | null => {
    const opIndex = semantic.length;
    const applied = applyAuthoredOperation(
      tree,
      operation,
      changeId,
      opIndex,
      order,
    );
    if (!applied.ok) return applied;
    semantic.push(operation);
    return null;
  };
  const removeMembers = (
    memberIds: ReadonlyArray<MemberId>,
  ): TreeFailure | null => {
    for (const memberId of memberIds) {
      const failed = append({ kind: "remove", target: memberId });
      if (failed !== null) return failed;
    }
    return null;
  };
  const writeMember = (
    memberId: MemberId,
    value: Extract<JSONPatchOperation, { readonly op: "add" }>["value"],
    allowCollaborativeText: boolean,
  ): TreeFailure | null => {
    if (
      options.collaborativeText === true
      && allowCollaborativeText
      && typeof value === "string"
    ) {
      const snapshot = resolveTextMemberSnapshot(tree, memberId);
      if (snapshot.ok) {
        const planned = createMinimalTextSplice(snapshot.value, value);
        if (planned === null) return null;
        const operation: TextSpliceOperation = {
          kind: "text-splice",
          target: snapshot.value.target,
          textNode: snapshot.value.textNode,
          left: planned.left,
          right: planned.right,
          removed: planned.removed,
          inserted: planned.inserted,
        };
        return append(operation);
      }
      if (snapshot.code !== "text_target_not_string") return snapshot;
    }
    return append({
      kind: "set",
      target: memberId,
      value,
    });
  };
  const writeDestination = (
    destination: Destination,
    value: Extract<JSONPatchOperation, { readonly op: "add" }>["value"],
    allowCollaborativeText: boolean,
  ): TreeFailure | null => {
    const cleared = removeMembers(destination.alternatives);
    if (cleared !== null) return cleared;
    if (destination.existing !== undefined) {
      return writeMember(
        destination.existing,
        value,
        allowCollaborativeText,
      );
    }
    return append(insertOrSet(
      destination,
      value,
      changeId,
      semantic.length,
    ));
  };

  for (const operation of operations) {
    if (operation.op === "test") {
      const target = resolvePatchMember(tree, operation.path);
      if (!target.ok) return target;
      const failed = append({
        kind: "test",
        target: target.value,
        expected: operation.value,
      });
      if (failed !== null) return failed;
      continue;
    }

    if (operation.op === "add") {
      const destination = destinationAt(tree, operation.path);
      if (!destination.ok) {
        if (operation.path !== "") return destination;
        const failed = writeMember(tree.root, operation.value, true);
        if (failed !== null) return failed;
        continue;
      }
      const failed = writeDestination(
        destination.value,
        operation.value,
        true,
      );
      if (failed !== null) return failed;
      continue;
    }

    if (operation.op === "replace") {
      const target = resolvePatchMember(tree, operation.path);
      if (!target.ok) return target;
      const cleared = removeMembers(objectAlternatives(tree, target.value));
      if (cleared !== null) return cleared;
      const failed = writeMember(target.value, operation.value, true);
      if (failed !== null) return failed;
      continue;
    }

    if (operation.op === "remove") {
      const target = resolvePatchMember(tree, operation.path);
      if (!target.ok) return target;
      const failed = removeMembers([
        ...objectAlternatives(tree, target.value),
        target.value,
      ]);
      if (failed !== null) return failed;
      continue;
    }

    if (operation.op === "copy") {
      const source = resolvePatchMember(tree, operation.from);
      if (!source.ok) return source;
      const copied = projectMemberValue(tree, source.value);
      if (!copied.ok) return copied;

      if (operation.path === "") {
        const failed = append({
          kind: "set",
          target: tree.root,
          value: copied.value,
        });
        if (failed !== null) return failed;
        continue;
      }
      const destination = destinationAt(tree, operation.path);
      if (!destination.ok) return destination;
      const failed = writeDestination(
        destination.value,
        copied.value,
        false,
      );
      if (failed !== null) return failed;
      continue;
    }

    const source = resolvePatchMember(tree, operation.from);
    if (!source.ok) return source;
    if (source.value === tree.root) {
      return failure(
        "unsupported_root_move",
        "moving the root into one of its descendants is not supported",
      );
    }
    const clearedSource = removeMembers(objectAlternatives(tree, source.value));
    if (clearedSource !== null) return clearedSource;
    if (operation.path === "") {
      const failed = append({
        kind: "move-to-root",
        source: source.value,
        root: tree.root,
      });
      if (failed !== null) return failed;
      continue;
    }

    const withoutSource = cloneTree(tree);
    const removed = applyAuthoredOperation(
      withoutSource,
      { kind: "remove", target: source.value },
      changeId,
      semantic.length,
      order,
    );
    if (!removed.ok) return removed;
    const destination = destinationAt(withoutSource, operation.path);
    if (!destination.ok) return destination;
    const clearedDestination = removeMembers(destination.value.alternatives);
    if (clearedDestination !== null) return clearedDestination;
    const failed = append({
      kind: "move",
      target: source.value,
      parent: destination.value.parent.id,
      placement: destination.value.placement,
      ...(destination.value.existing === undefined
        ? {}
        : { replaced: destination.value.existing }),
    });
    if (failed !== null) return failed;
  }

  return {
    ok: true,
    value: {
      ops: Object.freeze(semantic),
      tree,
    },
  };
}

function insertOrSet(
  destination: Destination,
  value: Extract<JSONPatchOperation, { readonly op: "add" }>["value"],
  changeId: ChangeId,
  opIndex: number,
): SemanticOperation {
  if (destination.existing !== undefined) {
    return {
      kind: "set",
      target: destination.existing,
      value,
    };
  }
  return {
    kind: "insert",
    parent: destination.parent.id,
    member: authoredMemberId(changeId, opIndex),
    placement: destination.placement,
    value,
  };
}

function destinationAt(
  tree: TreeState,
  pointer: string,
): { readonly ok: true; readonly value: Destination } | TreeFailure {
  let segments: string[];
  try {
    segments = parsePointer(pointer);
  } catch (error) {
    return failure(
      "invalid_pointer",
      error instanceof Error ? error.message : "invalid pointer",
    );
  }
  const parent = resolveParent(tree, segments);
  if (!parent.ok) return parent;

  if (parent.value.container.kind === "object") {
    const members = objectMembersAt(
      tree,
      parent.value.container,
      parent.value.segment,
    );
    const existing = members.at(-1);
    return {
      ok: true,
      value: {
        parent: parent.value.container,
        placement: {
          kind: "object",
          key: parent.value.segment,
        },
        ...(existing === undefined ? {} : { existing: existing.id }),
        alternatives: Object.freeze(
          members.slice(0, -1).map((member) => member.id),
        ),
      },
    };
  }

  const children = arrayMembers(tree, parent.value.container);
  const index = parent.value.segment === "-"
    ? children.length
    : parseArrayIndex(parent.value.segment);
  if (index === null || index < 0 || index > children.length) {
    return failure(
      "invalid_array_index",
      `array insertion index is invalid: ${parent.value.segment}`,
    );
  }
  return {
    ok: true,
    value: {
      parent: parent.value.container,
      placement: {
        kind: "array",
        after: index === 0
          ? null
          : arrayPositionId(children[index - 1] as (typeof children)[number]),
        before: index === children.length
          ? null
          : arrayPositionId(children[index] as (typeof children)[number]),
      },
      alternatives: Object.freeze([]),
    },
  };
}

function objectAlternatives(
  tree: TreeState,
  memberId: MemberId,
): ReadonlyArray<MemberId> {
  const member = tree.members.get(memberId);
  const placed = member?.placed;
  if (
    member === undefined
    || placed === undefined
    || placed.placement.kind !== "object"
  ) {
    return [];
  }
  const container = tree.containers.get(placed.parent);
  if (container === undefined || container.kind !== "object") return [];
  return objectMembersAt(
    tree,
    container,
    placed.placement.key,
  )
    .filter((candidate) => candidate.id !== memberId)
    .map((candidate) => candidate.id);
}

function resolvePatchMember(
  tree: TreeState,
  pointer: string,
): { readonly ok: true; readonly value: MemberId } | TreeFailure {
  let segments: string[];
  try {
    segments = parsePointer(pointer);
  } catch (error) {
    return failure(
      "invalid_pointer",
      error instanceof Error ? error.message : "invalid pointer",
    );
  }
  const resolved = resolveMember(tree, segments);
  return resolved.ok
    ? { ok: true, value: resolved.value.memberId }
    : resolved;
}

function authoredMemberId(
  changeId: ChangeId,
  opIndex: number,
): MemberId {
  return `member:${changeIdKey(changeId)}:${opIndex}`;
}

function parseArrayIndex(segment: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(segment)) return null;
  const index = Number(segment);
  return Number.isSafeInteger(index) ? index : null;
}

function failure(code: string, reason: string): TreeFailure {
  return { ok: false, code, reason };
}
