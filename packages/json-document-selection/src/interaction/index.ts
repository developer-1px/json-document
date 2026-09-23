export type NavigationCommand =
  | {
      readonly type: "move";
      readonly direction: "previous" | "next" | "up" | "down" | "left" | "right";
      readonly operation: "replace" | "extend";
    }
  | {
      readonly type: "boundary";
      readonly edge: "start" | "end";
      readonly operation: "replace" | "extend";
    }
  | { readonly type: "activate" }
  | { readonly type: "cancel" };

export type SelectionOperation = "replace" | "extend" | "toggle" | "add" | "subtract";
