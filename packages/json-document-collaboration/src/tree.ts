import type { JSONValue } from "@interactive-os/json-document";

import {
  canonicalStringify,
  changeIdKey,
  compareChangeIds,
} from "./change.js";
import {
  applyTextSplice,
  cloneTextState,
  createTextNodeId,
  createTextState,
  projectText,
  snapshotText,
  type TextAtomSnapshot,
  type TextState,
} from "./text-core.js";
import type {
  ArrayPlacement,
  ChangeId,
  CollaborationChange,
  CollaborationConflict,
  ContainerNodeId,
  MemberId,
  MemberPlacement,
  PositionId,
  SemanticOperation,
  TextNodeId,
} from "./types.js";

type ScalarJSON = null | boolean | number;

type NodeReference =
  | { readonly kind: "scalar"; readonly value: ScalarJSON }
  | { readonly kind: "text"; readonly textNodeId: TextNodeId }
  | { readonly kind: "container"; readonly containerId: ContainerNodeId };

interface OperationStamp {
  readonly changeId?: ChangeId;
  readonly opIndex: number;
  readonly order: number;
}

interface ValueWrite {
  readonly node: NodeReference;
  readonly stamp: OperationStamp;
}

interface PlacementWrite {
  readonly placement: PlacedMember;
  readonly stamp: OperationStamp;
}

interface PlacedMember {
  readonly parent: ContainerNodeId;
  readonly placement: MemberPlacement;
  readonly positionId?: PositionId;
}

interface TreeMember {
  readonly id: MemberId;
  live: boolean;
  node: NodeReference;
  valueStamp: OperationStamp;
  readonly valueWrites: ValueWrite[];
  placed?: PlacedMember;
  placementStamp?: OperationStamp;
  readonly placementWrites: PlacementWrite[];
}

interface TreeContainer {
  readonly id: ContainerNodeId;
  readonly kind: "object" | "array";
  /**
   * Object containers retain MemberIds. Array containers retain immutable
   * PositionIds so a moved or removed member leaves an anchorable tombstone.
   */
  readonly order: MemberId[];
}

export interface TreeState {
  readonly root: MemberId;
  readonly members: Map<MemberId, TreeMember>;
  readonly containers: Map<ContainerNodeId, TreeContainer>;
  readonly arrayPositions: Map<PositionId, MemberId>;
  readonly texts: Map<TextNodeId, TextState>;
}

export interface TreeFailure {
  readonly ok: false;
  readonly code: string;
  readonly reason: string;
}

interface ProjectedTree {
  readonly ok: true;
  readonly value: JSONValue;
  readonly conflicts: ReadonlyArray<CollaborationConflict>;
}

interface ResolvedMember {
  readonly memberId: MemberId;
  readonly member: TreeMember;
}

interface ResolvedParent {
  readonly container: TreeContainer;
  readonly segment: string;
}

interface ResolvedTextSnapshot {
  readonly target: MemberId;
  readonly textNode: TextNodeId;
  readonly value: string;
  readonly atoms: ReadonlyArray<TextAtomSnapshot>;
}

type TreeResult<T> = { readonly ok: true; readonly value: T } | TreeFailure;

const INITIAL_STAMP: OperationStamp = Object.freeze({
  opIndex: -1,
  order: -1,
});

export function createInitialTree(
  initial: JSONValue,
  baseDigest: string,
): TreeState {
  const root = `root:${baseDigest}`;
  const tree: TreeState = {
    root,
    members: new Map(),
    containers: new Map(),
    arrayPositions: new Map(),
    texts: new Map(),
  };
  const built = buildNode(
    tree,
    initial,
    `initial:${baseDigest}`,
    "value",
    INITIAL_STAMP,
  );
  if (!built.ok) throw new TypeError(built.reason);
  tree.members.set(root, {
    id: root,
    live: true,
    node: built.value,
    valueStamp: INITIAL_STAMP,
    valueWrites: [{ node: built.value, stamp: INITIAL_STAMP }],
    placementWrites: [],
  });
  return tree;
}

export function cloneTree(tree: TreeState): TreeState {
  const members = new Map<MemberId, TreeMember>();
  for (const [id, member] of tree.members) {
    members.set(id, {
      id,
      live: member.live,
      node: member.node,
      valueStamp: member.valueStamp,
      valueWrites: [...member.valueWrites],
      ...(member.placed === undefined ? {} : { placed: member.placed }),
      ...(member.placementStamp === undefined
        ? {}
        : { placementStamp: member.placementStamp }),
      placementWrites: [...member.placementWrites],
    });
  }
  const containers = new Map<ContainerNodeId, TreeContainer>();
  for (const [id, container] of tree.containers) {
    containers.set(id, {
      id,
      kind: container.kind,
      order: [...container.order],
    });
  }
  const texts = new Map<TextNodeId, TextState>();
  for (const [id, state] of tree.texts) {
    texts.set(id, cloneTextState(state));
  }
  return {
    root: tree.root,
    members,
    containers,
    arrayPositions: new Map(tree.arrayPositions),
    texts,
  };
}

export function applySemanticChange(
  tree: TreeState,
  change: CollaborationChange,
  order: number,
): TreeFailure | { readonly ok: true } {
  for (const [opIndex, operation] of change.ops.entries()) {
    const stamp: OperationStamp = {
      changeId: change.changeId,
      opIndex,
      order,
    };
    const result = applySemanticOperation(tree, operation, stamp);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function applyAuthoredOperation(
  tree: TreeState,
  operation: SemanticOperation,
  changeId: ChangeId,
  opIndex: number,
  order: number,
): TreeFailure | { readonly ok: true } {
  return applySemanticOperation(tree, operation, {
    changeId,
    opIndex,
    order,
  });
}

export function projectTree(
  tree: TreeState,
  isAncestor: (left: ChangeId, right: ChangeId) => boolean,
): ProjectedTree | TreeFailure {
  const conflicts: CollaborationConflict[] = [];
  const reachableMembers = new Set<MemberId>();
  const projected = projectMember(
    tree,
    tree.root,
    new Set(),
    reachableMembers,
    conflicts,
  );
  if (!projected.ok) return projected;

  for (const memberId of [...reachableMembers].sort()) {
    const member = tree.members.get(memberId);
    if (member === undefined) continue;
    const valueConflict = versionConflict(
      member.valueWrites,
      (write) => write.stamp,
      isAncestor,
    );
    if (valueConflict !== null) {
      conflicts.push({
        kind: "member-value",
        memberId,
        winner: valueConflict.winner,
        alternatives: valueConflict.alternatives,
      });
    }
    const placementConflict = versionConflict(
      member.placementWrites,
      (write) => write.stamp,
      isAncestor,
    );
    if (placementConflict !== null) {
      conflicts.push({
        kind: "member-placement",
        memberId,
        winner: placementConflict.winner,
        alternatives: placementConflict.alternatives,
      });
    }
  }

  return {
    ok: true,
    value: projected.value,
    conflicts,
  };
}

export function resolveMember(
  tree: TreeState,
  segments: ReadonlyArray<string>,
): TreeResult<ResolvedMember> {
  let member = tree.members.get(tree.root);
  if (member === undefined) return failure("missing_root", "root member is missing");

  for (const segment of segments) {
    if (!member.live) {
      return failure("path_not_found", "pointer traverses a removed member");
    }
    if (member.node.kind !== "container") {
      return failure("path_not_found", "pointer traverses a scalar value");
    }
    const container = tree.containers.get(member.node.containerId);
    if (container === undefined) {
      return failure("missing_container", "member container is missing");
    }

    const child = container.kind === "object"
      ? visibleObjectMember(tree, container, segment)
      : visibleArrayMember(tree, container, segment);
    if (child === null) {
      return failure("path_not_found", `path segment was not found: ${segment}`);
    }
    member = child;
  }

  return { ok: true, value: { memberId: member.id, member } };
}

export function resolveTextSnapshot(
  tree: TreeState,
  segments: ReadonlyArray<string>,
): TreeResult<ResolvedTextSnapshot> {
  const resolved = resolveMember(tree, segments);
  return resolved.ok
    ? resolveTextMemberSnapshot(tree, resolved.value.memberId)
    : resolved;
}

export function resolveTextMemberSnapshot(
  tree: TreeState,
  memberId: MemberId,
  expectedTextNode?: TextNodeId,
): TreeResult<ResolvedTextSnapshot> {
  const member = tree.members.get(memberId);
  if (member === undefined) {
    return failure(
      "text_target_not_found",
      `text target is missing: ${memberId}`,
    );
  }
  if (member.node.kind !== "text") {
    return failure(
      "text_target_not_string",
      `text target is not a string: ${memberId}`,
    );
  }
  if (
    !member.live
    && !containsReachableTextNode(tree, member.node.textNodeId)
  ) {
    return failure(
      "text_target_deleted",
      `text target is deleted: ${memberId}`,
    );
  }
  if (
    expectedTextNode !== undefined
    && member.node.textNodeId !== expectedTextNode
  ) {
    return failure(
      "text_generation_mismatch",
      `text target generation changed: ${memberId}`,
    );
  }
  const state = tree.texts.get(member.node.textNodeId);
  if (state === undefined) {
    return failure(
      "missing_text_node",
      `text node is missing: ${member.node.textNodeId}`,
    );
  }
  const snapshot = snapshotText(state);
  return {
    ok: true,
    value: Object.freeze({
      target: memberId,
      textNode: snapshot.textNode,
      value: snapshot.value,
      atoms: snapshot.atoms,
    }),
  };
}

export function resolveParent(
  tree: TreeState,
  segments: ReadonlyArray<string>,
): TreeResult<ResolvedParent> {
  if (segments.length === 0) {
    return failure("invalid_root_target", "root has no parent container");
  }
  const parent = resolveMember(tree, segments.slice(0, -1));
  if (!parent.ok) return parent;
  if (parent.value.member.node.kind !== "container") {
    return failure("path_not_found", "target parent is not a container");
  }
  const container = tree.containers.get(parent.value.member.node.containerId);
  if (container === undefined) {
    return failure("missing_container", "target parent container is missing");
  }
  return {
    ok: true,
    value: {
      container,
      segment: segments.at(-1) as string,
    },
  };
}

export function projectMemberValue(
  tree: TreeState,
  memberId: MemberId,
): TreeResult<JSONValue> {
  const conflicts: CollaborationConflict[] = [];
  const projected = projectMember(
    tree,
    memberId,
    new Set(),
    new Set(),
    conflicts,
  );
  return projected.ok
    ? { ok: true, value: projected.value }
    : projected;
}

export function objectMembersAt(
  tree: TreeState,
  container: TreeContainer,
  key: string,
): ReadonlyArray<TreeMember> {
  if (container.kind !== "object") return [];
  const members = objectGroups(tree, container).get(key);
  return members === undefined
    ? []
    : [...members].sort(compareMemberPlacements);
}

export function arrayMembers(
  tree: TreeState,
  container: TreeContainer,
): ReadonlyArray<TreeMember> {
  return container.kind === "array"
    ? visibleArrayMembers(tree, container)
    : [];
}

export function arrayPositionId(member: TreeMember): PositionId | null {
  return member.placed?.placement.kind === "array"
    ? member.placed.positionId ?? null
    : null;
}

function applySemanticOperation(
  tree: TreeState,
  operation: SemanticOperation,
  stamp: OperationStamp,
): TreeFailure | { readonly ok: true } {
  if (operation.kind === "test") {
    const target = tree.members.get(operation.target);
    if (target === undefined || !target.live) {
      return failure("test_target_not_found", `test target is not live: ${operation.target}`);
    }
    const actual = projectMemberValue(tree, target.id);
    if (!actual.ok) return actual;
    return canonicalStringify(actual.value)
      === canonicalStringify(operation.expected)
      ? { ok: true }
      : failure("test_failed", `semantic test failed: ${operation.target}`);
  }

  if (operation.kind === "set") {
    const target = tree.members.get(operation.target);
    if (target === undefined || !target.live) {
      return failure("target_not_found", `set target is not live: ${operation.target}`);
    }
    const built = buildNode(
      tree,
      operation.value,
      operationSeed(stamp),
      "value",
      stamp,
    );
    if (!built.ok) return built;
    target.node = built.value;
    target.valueStamp = stamp;
    target.valueWrites.push({ node: built.value, stamp });
    return { ok: true };
  }

  if (operation.kind === "text-splice") {
    const target = tree.members.get(operation.target);
    if (target === undefined) {
      return failure(
        "text_target_not_found",
        `text target is missing: ${operation.target}`,
      );
    }
    if (target.node.kind !== "text") {
      return failure(
        "text_target_not_string",
        `text target is not a string: ${operation.target}`,
      );
    }
    if (target.node.textNodeId !== operation.textNode) {
      return failure(
        "text_generation_mismatch",
        `text target generation changed: ${operation.target}`,
      );
    }
    if (
      !target.live
      && !containsReachableTextNode(tree, operation.textNode)
    ) {
      return failure(
        "text_target_deleted",
        `text target is deleted: ${operation.target}`,
      );
    }
    const text = tree.texts.get(operation.textNode);
    if (text === undefined) {
      return failure(
        "missing_text_node",
        `text node is missing: ${operation.textNode}`,
      );
    }
    const changeId = stamp.changeId;
    if (changeId === undefined) {
      return failure(
        "missing_change_id",
        "text operations require an authored Change identity",
      );
    }
    return applyTextSplice(
      text,
      operation,
      changeId,
      stamp.opIndex,
    );
  }

  if (operation.kind === "insert") {
    if (tree.members.has(operation.member)) {
      return failure(
        "identity_collision",
        `insert member already exists: ${operation.member}`,
      );
    }
    const parent = tree.containers.get(operation.parent);
    if (parent === undefined) {
      return failure("parent_not_found", `insert parent is missing: ${operation.parent}`);
    }
    const placementCheck = checkPlacement(parent, operation.placement);
    if (!placementCheck.ok) return placementCheck;
    const placed: PlacedMember = {
      parent: parent.id,
      placement: operation.placement,
      ...(operation.placement.kind === "array"
        ? { positionId: operationPositionId(operation.member, stamp) }
        : {}),
    };
    const built = buildNode(
      tree,
      operation.value,
      operationSeed(stamp),
      "value",
      stamp,
    );
    if (!built.ok) return built;
    const member: TreeMember = {
      id: operation.member,
      live: true,
      node: built.value,
      valueStamp: stamp,
      valueWrites: [{ node: built.value, stamp }],
      placed,
      placementStamp: stamp,
      placementWrites: [{ placement: placed, stamp }],
    };
    tree.members.set(member.id, member);
    const inserted = insertIntoContainer(
      tree,
      parent,
      member.id,
      operation.placement,
      placed.positionId,
    );
    if (!inserted.ok) {
      tree.members.delete(member.id);
      return inserted;
    }
    if (placed.positionId !== undefined) {
      tree.arrayPositions.set(placed.positionId, member.id);
    }
    return { ok: true };
  }

  if (operation.kind === "remove") {
    const target = tree.members.get(operation.target);
    if (
      target === undefined
      || target.id === tree.root
    ) {
      return failure("target_not_found", `remove target is invalid: ${operation.target}`);
    }
    if (target.live) target.live = false;
    return { ok: true };
  }

  if (operation.kind === "move") {
    const target = tree.members.get(operation.target);
    if (
      target === undefined
      || !target.live
      || target.id === tree.root
      || target.placed === undefined
    ) {
      return failure("target_not_found", `move target is not live: ${operation.target}`);
    }
    const parent = tree.containers.get(operation.parent);
    if (parent === undefined) {
      return failure("parent_not_found", `move parent is missing: ${operation.parent}`);
    }
    const placementCheck = checkPlacement(parent, operation.placement);
    if (!placementCheck.ok) return placementCheck;
    if (
      target.node.kind === "container"
      && containsContainer(tree, target.node.containerId, parent.id, new Set())
    ) {
      return failure("move_cycle", "move target cannot contain its destination");
    }

    if (operation.replaced !== undefined) {
      const replaced = tree.members.get(operation.replaced);
      if (
        replaced === undefined
        || replaced.id === tree.root
        || replaced.id === target.id
      ) {
        return failure(
          "replaced_target_not_found",
          `move replacement target is invalid: ${operation.replaced}`,
        );
      }
      if (replaced.live) replaced.live = false;
    }

    const previousParent = tree.containers.get(target.placed.parent);
    if (previousParent?.kind === "object") {
      removeFromOrder(previousParent, target.id);
    }
    if (parent.kind === "object") {
      removeFromOrder(parent, target.id);
    }
    const positionId = operation.placement.kind === "array"
      ? operationPositionId(target.id, stamp)
      : undefined;
    const inserted = insertIntoContainer(
      tree,
      parent,
      target.id,
      operation.placement,
      positionId,
    );
    if (!inserted.ok) return inserted;

    const placed: PlacedMember = {
      parent: parent.id,
      placement: operation.placement,
      ...(positionId === undefined ? {} : { positionId }),
    };
    if (positionId !== undefined) {
      tree.arrayPositions.set(positionId, target.id);
    }
    target.placed = placed;
    target.placementStamp = stamp;
    target.placementWrites.push({ placement: placed, stamp });
    return { ok: true };
  }

  if (
    operation.kind === "undo-change"
    || operation.kind === "redo-change"
  ) {
    return failure(
      "history_control_in_data_change",
      "history operations must be materialized by the history profile",
    );
  }

  const source = tree.members.get(operation.source);
  const root = tree.members.get(operation.root);
  if (
    source === undefined
    || !source.live
    || source.id === tree.root
    || root === undefined
    || root.id !== tree.root
  ) {
    return failure("target_not_found", "move-to-root target is not live");
  }
  root.node = source.node;
  root.valueStamp = stamp;
  root.valueWrites.push({ node: source.node, stamp });
  source.live = false;
  return { ok: true };
}

function buildNode(
  tree: TreeState,
  value: JSONValue,
  seed: string,
  path: string,
  stamp: OperationStamp,
): TreeResult<NodeReference> {
  if (typeof value === "string") {
    const textNodeId = createTextNodeId(seed, path);
    if (tree.texts.has(textNodeId)) {
      return failure(
        "identity_collision",
        `text identity already exists: ${textNodeId}`,
      );
    }
    tree.texts.set(textNodeId, createTextState(textNodeId, value));
    return {
      ok: true,
      value: { kind: "text", textNodeId },
    };
  }
  if (value === null || typeof value !== "object") {
    return {
      ok: true,
      value: { kind: "scalar", value },
    };
  }

  const containerId = `${seed}:container:${path}`;
  if (tree.containers.has(containerId)) {
    return failure(
      "identity_collision",
      `container identity already exists: ${containerId}`,
    );
  }
  const container: TreeContainer = {
    id: containerId,
    kind: Array.isArray(value) ? "array" : "object",
    order: [],
  };
  tree.containers.set(containerId, container);

  const entries: ReadonlyArray<readonly [string, JSONValue]> = Array.isArray(value)
    ? value.map((child, index) => [String(index), child] as const)
    : Object.entries(value)
      .sort(([left], [right]) => compareStrings(left, right));

  let previousArrayPosition: PositionId | null = null;
  for (const [segment, child] of entries) {
    const childPath = `${path}/${encodeSegment(segment)}`;
    const memberId = `${seed}:member:${childPath}`;
    if (tree.members.has(memberId)) {
      return failure(
        "identity_collision",
        `member identity already exists: ${memberId}`,
      );
    }
    const childNode = buildNode(tree, child, seed, childPath, stamp);
    if (!childNode.ok) return childNode;
    const placement: MemberPlacement = container.kind === "object"
      ? { kind: "object", key: segment }
      : {
          kind: "array",
          after: previousArrayPosition,
          before: null,
        };
    const positionId = container.kind === "array"
      ? initialPositionId(memberId)
      : null;
    const placed: PlacedMember = {
      parent: containerId,
      placement,
      ...(positionId === null ? {} : { positionId }),
    };
    tree.members.set(memberId, {
      id: memberId,
      live: true,
      node: childNode.value,
      valueStamp: stamp,
      valueWrites: [{ node: childNode.value, stamp }],
      placed,
      placementStamp: stamp,
      placementWrites: [{ placement: placed, stamp }],
    });
    if (positionId === null) {
      container.order.push(memberId);
    } else {
      tree.arrayPositions.set(positionId, memberId);
      container.order.push(positionId);
    }
    previousArrayPosition = positionId;
  }

  return {
    ok: true,
    value: { kind: "container", containerId },
  };
}

function projectMember(
  tree: TreeState,
  memberId: MemberId,
  visiting: Set<ContainerNodeId>,
  reachableMembers: Set<MemberId>,
  conflicts: CollaborationConflict[],
): TreeResult<JSONValue> {
  const member = tree.members.get(memberId);
  if (member === undefined || !member.live) {
    return failure("target_not_found", `member is not live: ${memberId}`);
  }
  reachableMembers.add(member.id);
  if (member.node.kind === "scalar") {
    return { ok: true, value: member.node.value };
  }
  if (member.node.kind === "text") {
    const text = tree.texts.get(member.node.textNodeId);
    return text === undefined
      ? failure(
          "missing_text_node",
          `text node is missing: ${member.node.textNodeId}`,
        )
      : { ok: true, value: projectText(text) };
  }

  const container = tree.containers.get(member.node.containerId);
  if (container === undefined) {
    return failure(
      "missing_container",
      `container is missing: ${member.node.containerId}`,
    );
  }
  if (visiting.has(container.id)) {
    return failure("projection_cycle", "container graph contains a cycle");
  }

  visiting.add(container.id);
  if (container.kind === "array") {
    const result: JSONValue[] = [];
    for (const child of visibleArrayMembers(tree, container)) {
      const projected = projectMember(
        tree,
        child.id,
        visiting,
        reachableMembers,
        conflicts,
      );
      if (!projected.ok) {
        visiting.delete(container.id);
        return projected;
      }
      result.push(projected.value);
    }
    visiting.delete(container.id);
    return { ok: true, value: result };
  }

  const groups = objectGroups(tree, container);
  const winners = new Map<string, TreeMember>();
  for (const [key, members] of groups) {
    const sorted = [...members].sort(compareMemberPlacements);
    const winner = sorted.at(-1);
    if (winner === undefined) continue;
    winners.set(key, winner);
    if (sorted.length > 1) {
      conflicts.push({
        kind: "object-key",
        containerId: container.id,
        key,
        winner: winner.id,
        alternatives: sorted
          .slice(0, -1)
          .map((alternative) => alternative.id)
          .sort(compareStrings),
      });
    }
  }

  const result: Record<string, JSONValue> = {};
  for (const memberIdInOrder of container.order) {
    const memberInOrder = tree.members.get(memberIdInOrder);
    const placement = memberInOrder?.placed;
    if (
      memberInOrder === undefined
      || !memberInOrder.live
      || placement === undefined
      || placement.parent !== container.id
      || placement.placement.kind !== "object"
      || winners.get(placement.placement.key)?.id !== memberInOrder.id
    ) {
      continue;
    }
    const projected = projectMember(
      tree,
      memberInOrder.id,
      visiting,
      reachableMembers,
      conflicts,
    );
    if (!projected.ok) {
      visiting.delete(container.id);
      return projected;
    }
    Object.defineProperty(result, placement.placement.key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: projected.value,
    });
  }
  visiting.delete(container.id);
  return { ok: true, value: result };
}

function visibleObjectMember(
  tree: TreeState,
  container: TreeContainer,
  key: string,
): TreeMember | null {
  const members = objectGroups(tree, container).get(key);
  if (members === undefined || members.length === 0) return null;
  return [...members].sort(compareMemberPlacements).at(-1) ?? null;
}

function objectGroups(
  tree: TreeState,
  container: TreeContainer,
): Map<string, TreeMember[]> {
  const groups = new Map<string, TreeMember[]>();
  for (const memberId of container.order) {
    const member = tree.members.get(memberId);
    const placement = member?.placed;
    if (
      member === undefined
      || !member.live
      || placement === undefined
      || placement.parent !== container.id
      || placement.placement.kind !== "object"
    ) {
      continue;
    }
    const key = placement.placement.key;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [member]);
    else group.push(member);
  }
  return groups;
}

function visibleArrayMember(
  tree: TreeState,
  container: TreeContainer,
  segment: string,
): TreeMember | null {
  if (!/^(0|[1-9]\d*)$/.test(segment)) return null;
  const index = Number(segment);
  if (!Number.isSafeInteger(index)) return null;
  return visibleArrayMembers(tree, container)[index] ?? null;
}

function visibleArrayMembers(
  tree: TreeState,
  container: TreeContainer,
): TreeMember[] {
  const members: TreeMember[] = [];
  for (const positionId of container.order) {
    const memberId = tree.arrayPositions.get(positionId);
    if (memberId === undefined) continue;
    const member = tree.members.get(memberId);
    const placement = member?.placed;
    if (
      member !== undefined
      && member.live
      && placement?.parent === container.id
      && placement.placement.kind === "array"
      && placement.positionId === positionId
    ) {
      members.push(member);
    }
  }
  return members;
}

function insertIntoContainer(
  tree: TreeState,
  container: TreeContainer,
  memberId: MemberId,
  placement: MemberPlacement,
  positionId?: PositionId,
): TreeFailure | { readonly ok: true } {
  if (container.kind === "object") {
    container.order.push(memberId);
    return { ok: true };
  }
  if (positionId === undefined) {
    return failure(
      "missing_position_id",
      "array insertion requires an immutable position identity",
    );
  }
  if (tree.arrayPositions.has(positionId)) {
    return failure(
      "identity_collision",
      `array position already exists: ${positionId}`,
    );
  }
  const before = (placement as ArrayPlacement).before;
  const after = (placement as ArrayPlacement).after;
  const beforeIndex = before === null
    ? -1
    : arrayPositionIndex(tree, container, before);
  const afterIndex = after === null
    ? -1
    : arrayPositionIndex(tree, container, after);
  if (
    before !== null
    && beforeIndex >= 0
    && after !== null
    && afterIndex >= 0
  ) {
    if (afterIndex >= beforeIndex) {
      return failure(
        "anchor_order_invalid",
        "array gap anchors no longer identify an ordered interval",
      );
    }
    container.order.splice(beforeIndex, 0, positionId);
    return { ok: true };
  }
  if (before !== null && beforeIndex >= 0) {
    container.order.splice(beforeIndex, 0, positionId);
    return { ok: true };
  }
  if (after !== null && afterIndex >= 0) {
    container.order.splice(afterIndex + 1, 0, positionId);
    return { ok: true };
  }
  if (before === null && after === null) {
    container.order.push(positionId);
    return { ok: true };
  }
  return failure(
    "anchor_not_found",
    "no observed array gap anchor is still present",
  );
}

function arrayPositionIndex(
  tree: TreeState,
  container: TreeContainer,
  positionId: PositionId,
): number {
  return tree.arrayPositions.has(positionId)
    ? container.order.indexOf(positionId)
    : -1;
}

function removeFromOrder(
  container: TreeContainer,
  memberId: MemberId,
): void {
  let index = container.order.indexOf(memberId);
  while (index >= 0) {
    container.order.splice(index, 1);
    index = container.order.indexOf(memberId);
  }
}

function checkPlacement(
  container: TreeContainer,
  placement: MemberPlacement,
): TreeFailure | { readonly ok: true } {
  return container.kind === placement.kind
    ? { ok: true }
    : failure(
        "placement_mismatch",
        `${placement.kind} placement cannot target ${container.kind} container`,
      );
}

function containsContainer(
  tree: TreeState,
  currentId: ContainerNodeId,
  targetId: ContainerNodeId,
  seen: Set<ContainerNodeId>,
): boolean {
  if (currentId === targetId) return true;
  if (seen.has(currentId)) return false;
  seen.add(currentId);
  const container = tree.containers.get(currentId);
  if (container === undefined) return false;
  const children = container.kind === "array"
    ? visibleArrayMembers(tree, container)
    : container.order.flatMap((memberId) => {
        const member = tree.members.get(memberId);
        return member === undefined ? [] : [member];
      });
  for (const member of children) {
    if (
      member.live
      && member.placed?.parent === container.id
      && member.node.kind === "container"
      && containsContainer(
        tree,
        member.node.containerId,
        targetId,
        seen,
      )
    ) {
      return true;
    }
  }
  return false;
}

function containsReachableTextNode(
  tree: TreeState,
  targetId: TextNodeId,
): boolean {
  const visitMember = (
    memberId: MemberId,
    seen: Set<ContainerNodeId>,
  ): boolean => {
    const member = tree.members.get(memberId);
    if (member === undefined || !member.live) return false;
    if (member.node.kind === "text") {
      return member.node.textNodeId === targetId;
    }
    if (member.node.kind !== "container") return false;
    if (seen.has(member.node.containerId)) return false;
    seen.add(member.node.containerId);
    const container = tree.containers.get(member.node.containerId);
    if (container === undefined) return false;
    const children = container.kind === "array"
      ? visibleArrayMembers(tree, container)
      : container.order.flatMap((childId) => {
          const child = tree.members.get(childId);
          return child === undefined ? [] : [child];
        });
    for (const child of children) {
      if (
        child.live
        && child.placed?.parent === container.id
        && visitMember(child.id, seen)
      ) {
        return true;
      }
    }
    return false;
  };
  return visitMember(tree.root, new Set());
}

function versionConflict<T>(
  versions: ReadonlyArray<T>,
  stampOf: (version: T) => OperationStamp,
  isAncestor: (left: ChangeId, right: ChangeId) => boolean,
): {
  readonly winner: ChangeId;
  readonly alternatives: ReadonlyArray<ChangeId>;
} | null {
  const authored = versions.filter((version) => (
    stampOf(version).changeId !== undefined
  ));
  const maximal = authored.filter((candidate) => {
    const candidateStamp = stampOf(candidate);
    const candidateId = candidateStamp.changeId as ChangeId;
    return !authored.some((other) => {
      if (other === candidate) return false;
      const otherStamp = stampOf(other);
      const otherId = otherStamp.changeId as ChangeId;
      if (changeIdKey(candidateId) === changeIdKey(otherId)) {
        return candidateStamp.opIndex < otherStamp.opIndex;
      }
      return isAncestor(candidateId, otherId);
    });
  });
  if (maximal.length < 2) return null;
  const sorted = [...maximal].sort((left, right) => (
    compareStamps(stampOf(left), stampOf(right))
  ));
  const winnerStamp = stampOf(sorted.at(-1) as T);
  const winner = winnerStamp.changeId as ChangeId;
  return {
    winner,
    alternatives: sorted
      .slice(0, -1)
      .map((version) => stampOf(version).changeId as ChangeId)
      .sort(compareChangeIds),
  };
}

function compareMemberPlacements(
  left: TreeMember,
  right: TreeMember,
): number {
  return compareStamps(
    left.placementStamp ?? INITIAL_STAMP,
    right.placementStamp ?? INITIAL_STAMP,
  ) || compareStrings(left.id, right.id);
}

function compareStamps(
  left: OperationStamp,
  right: OperationStamp,
): number {
  return left.order - right.order || left.opIndex - right.opIndex;
}

function operationSeed(stamp: OperationStamp): string {
  const changeId = stamp.changeId;
  if (changeId === undefined) return "initial";
  return `change:${changeIdKey(changeId)}:${stamp.opIndex}`;
}

function initialPositionId(memberId: MemberId): PositionId {
  return `position:initial:${memberId}`;
}

function operationPositionId(
  memberId: MemberId,
  stamp: OperationStamp,
): PositionId {
  return `position:${operationSeed(stamp)}:${memberId}`;
}

function encodeSegment(segment: string): string {
  return `${segment.length}:${segment}`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(code: string, reason: string): TreeFailure {
  return { ok: false, code, reason };
}

export type { TreeContainer };
