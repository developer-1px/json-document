export type TreeFoldNode = {
  readonly expanded: boolean;
  readonly hasChildren: boolean;
};

export type TreeMoveDirection = "up" | "down" | "left" | "right" | "previous" | "next";

export type TreeAffordance =
  | { readonly type: "expand" }
  | { readonly type: "collapse" }
  | { readonly type: "move"; readonly direction: TreeMoveDirection };

export function treeAffordance(
  command: { readonly type: "move"; readonly direction: TreeMoveDirection },
  node: TreeFoldNode,
): TreeAffordance {
  if (command.direction === "right" && node.hasChildren && !node.expanded) {
    return { type: "expand" };
  }
  if (command.direction === "left" && node.hasChildren && node.expanded) {
    return { type: "collapse" };
  }
  return { type: "move", direction: command.direction };
}
