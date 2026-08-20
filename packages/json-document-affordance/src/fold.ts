import type { AffordancePreview } from "./result.js";

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
): AffordancePreview {
  if (command.direction === "right" && node.hasChildren && !node.expanded) {
    return { hand: { type: "expand" } };
  }
  if (command.direction === "left" && node.hasChildren && node.expanded) {
    return { hand: { type: "collapse" } };
  }
  return { hand: { type: "move", direction: command.direction, operation: "replace" } };
}

export function disclosureAffordance(input: {
  readonly key: string;
  readonly expanded: boolean;
}): AffordancePreview {
  if (input.key !== "Enter" && input.key !== " ") return { hand: null };
  return { hand: { type: input.expanded ? "collapse" : "expand" } };
}
