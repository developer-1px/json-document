import { buildPointer, jsonEqual, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { visibleMemberEntries, type TreeState } from "./tree.js";

interface VisibleMember {
  readonly id: string;
  readonly value: JSONValue;
  readonly container: string | undefined;
  parent?: VisibleMember;
  key: string;
  children: VisibleMember[];
  readonly childrenByKey: Map<string, VisibleMember> | undefined;
}

/** Compile the visible tree transition, retaining member identity in RFC 6902 moves. */
export function patchBetweenTrees(
  before: JSONValue,
  after: JSONValue,
  beforeTree: TreeState,
  afterTree: TreeState,
): ReadonlyArray<JSONPatchOperation> {
  const current = new Map<string, VisibleMember>();
  const desired = new Map<string, VisibleMember>();
  let root = snapshot(beforeTree, beforeTree.root, before, "", current);
  const target = snapshot(afterTree, afterTree.root, after, "", desired);
  const operations: JSONPatchOperation[] = [];
  if (root.container !== target.container && target.container !== undefined) {
    const source = [...current.values()].find((member) => member.container === target.container);
    if (source !== undefined) {
      operations.push({ op: "move", from: pointer(source), path: "" });
      detach(source);
      root = source;
    }
  }
  // Root replacement invalidates descendants, just as a local root replace does.
  if (root.container !== target.container || root.container === undefined) {
    return jsonEqual(before, after) ? [] : [{ op: "replace", path: "", value: after }];
  }
  let staging: VisibleMember | undefined;

  function remove(node: VisibleMember): void {
    operations.push({ op: "remove", path: pointer(node) });
    detach(node);
  }

  function move(node: VisibleMember, parent: VisibleMember, key: string): void {
    const from = pointer(node);
    detach(node);
    // RFC 6902 resolves the destination after removing the source.
    const path = buildPointer([...segments(parent), key]);
    insert(node, parent, key);
    operations.push({ op: "move", from, path });
  }

  function retain(node: VisibleMember): boolean {
    return desired.has(node.id) || node.children.some(retain);
  }

  function vacate(node: VisibleMember): void {
    if (!retain(node)) { remove(node); return; }
    if (staging === undefined) {
      let key = "__json_document_transfer__";
      if (Array.isArray(root.value)) key = String(root.children.length);
      else while (root.childrenByKey?.has(key) || target.childrenByKey?.has(key)) key += "_";
      staging = { id: "", value: [], container: "", key, children: [], childrenByKey: undefined };
      insert(staging, root, key);
      operations.push({ op: "add", path: pointer(staging), value: [] });
    }
    move(node, staging, String(staging.children.length));
  }

  function reconcile(node: VisibleMember, wanted: VisibleMember): void {
    if (node.container !== wanted.container || node.container === undefined) {
      if (jsonEqual(node.value, wanted.value) && node.container === wanted.container) return;
      // Rescue members moved out of a replaced container before dropping it.
      for (const child of [...node.children]) vacate(child);
      const value = wanted.container === undefined ? wanted.value : Array.isArray(wanted.value) ? [] : {};
      operations.push({ op: "replace", path: pointer(node), value });
      const replacement: VisibleMember = { ...wanted, children: [], childrenByKey: wanted.childrenByKey && new Map(), key: node.key };
      if (node.parent !== undefined) {
        const parent = node.parent;
        const index = parent.children.indexOf(node);
        replacement.parent = parent;
        parent.children[index] = replacement;
        parent.childrenByKey?.set(replacement.key, replacement);
      }
      current.set(wanted.id, replacement);
      node = replacement;
      if (wanted.container === undefined) return;
    }
    for (const [index, child] of wanted.children.entries()) {
      const key = Array.isArray(wanted.value) ? String(index) : child.key;
      let existing = current.get(child.id);
      if (existing !== undefined && !attached(existing, root)) existing = undefined;
      const occupant = Array.isArray(node.value)
        ? node.children[index]
        : node.childrenByKey?.get(key);
      if (!Array.isArray(node.value) && occupant !== undefined && occupant !== existing) vacate(occupant);
      if (existing === undefined) {
        const value = child.container === undefined ? child.value : Array.isArray(child.value) ? [] : {};
        existing = { ...child, value, children: [], childrenByKey: child.childrenByKey && new Map() };
        insert(existing, node, key);
        current.set(child.id, existing);
        operations.push({ op: "add", path: pointer(existing), value });
      } else if (existing.parent !== node || occupant !== existing) {
        move(existing, node, key);
      }
      reconcile(existing, child);
    }
    const wantedIds = new Set(wanted.children.map((child) => child.id));
    for (const child of [...node.children]) {
      if (child !== staging && !wantedIds.has(child.id)) vacate(child);
    }
  }

  reconcile(root, target);
  if (staging !== undefined) remove(staging);
  return operations;
}

function snapshot(tree: TreeState, id: string, value: JSONValue, key: string, members: Map<string, VisibleMember>): VisibleMember {
  const reference = tree.members.get(id)!.node;
  const node: VisibleMember = {
    id,
    value,
    container: reference.kind === "container" ? reference.containerId : undefined,
    key,
    children: [],
    childrenByKey: value !== null && typeof value === "object" && !Array.isArray(value) ? new Map() : undefined,
  };
  members.set(node.id, node);
  if (value !== null && typeof value === "object") {
    for (const [key, childId] of visibleMemberEntries(tree, id)) {
      const child = Array.isArray(value) ? value[Number(key)]! : (value as Readonly<Record<string, JSONValue>>)[key]!;
      const member = snapshot(tree, childId, child, key, members);
      member.parent = node;
      node.children.push(member);
      node.childrenByKey?.set(key, member);
    }
  }
  return node;
}

function attached(node: VisibleMember, root: VisibleMember): boolean {
  while (node.parent !== undefined) node = node.parent;
  return node === root;
}

function segments(node: VisibleMember): string[] {
  const result: string[] = [];
  while (node.parent !== undefined) {
    result.push(Array.isArray(node.parent.value) ? String(node.parent.children.indexOf(node)) : node.key);
    node = node.parent;
  }
  return result.reverse();
}

function pointer(node: VisibleMember): string { return buildPointer(segments(node)); }

function detach(node: VisibleMember): void {
  if (node.parent === undefined) throw new Error("cannot detach the document root");
  node.parent.children.splice(node.parent.children.indexOf(node), 1);
  node.parent.childrenByKey?.delete(node.key);
  delete node.parent;
}

function insert(node: VisibleMember, parent: VisibleMember, key: string): void {
  node.parent = parent;
  node.key = key;
  if (Array.isArray(parent.value)) parent.children.splice(Number(key), 0, node);
  else {
    parent.children.push(node);
    parent.childrenByKey!.set(key, node);
  }
}
