import type { TreeNode, TreeTopology } from "./tree.js";

export interface TreeVisibilityRow extends TreeNode {
  readonly depth: number;
  readonly posInSet: number;
  readonly setSize: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}

export interface TreeVisibility {
  readonly rows: ReadonlyArray<TreeVisibilityRow>;
  readonly topology: TreeTopology;
}

export type TreeVisibilityNavigation =
  | { readonly type: "move"; readonly direction: "previous" | "next" | "up" | "down" | "left" | "right" }
  | { readonly type: "boundary"; readonly edge: "start" | "end" };

/** Projects canonical tree nodes through Host-owned expanded IDs. */
export function projectTreeVisibility(
  nodes: ReadonlyArray<TreeNode>,
  expandedIds: ReadonlySet<string>,
): TreeVisibility {
  const byParent = new Map<string | null, TreeNode[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  const rows: TreeVisibilityRow[] = [];
  function visit(parentId: string | null, depth: number) {
    const siblings = byParent.get(parentId) ?? [];
    siblings.forEach((node, index) => {
      const children = byParent.get(node.id) ?? [];
      const expanded = expandedIds.has(node.id);
      rows.push({
        ...node,
        depth,
        posInSet: index + 1,
        setSize: siblings.length,
        hasChildren: children.length > 0,
        expanded,
      });
      if (expanded) visit(node.id, depth + 1);
    });
  }
  visit(null, 0);
  return { rows, topology: { visibleIds: rows.map((row) => row.id) } };
}

/** Resolves navigation inside one projected visible tree. */
export function treeVisibilityNeighbor(
  visibility: TreeVisibility,
  nodeId: string,
  navigation: TreeVisibilityNavigation,
): string | null {
  if (navigation.type === "boundary") {
    return navigation.edge === "start"
      ? visibility.topology.visibleIds[0] ?? null
      : visibility.topology.visibleIds.at(-1) ?? null;
  }
  const row = visibility.rows.find((candidate) => candidate.id === nodeId);
  if (row === undefined) return null;
  if (navigation.direction === "left") return row.parentId;
  if (navigation.direction === "right") {
    return visibility.rows.find((candidate) => candidate.parentId === row.id)?.id ?? null;
  }
  const index = visibility.topology.visibleIds.indexOf(nodeId);
  if (index < 0) return null;
  const delta = navigation.direction === "previous" || navigation.direction === "up" ? -1 : 1;
  return visibility.topology.visibleIds[index + delta] ?? null;
}
