import type { WebKeyboardCommand } from "@interactive-os/json-document-web";

export type SelectOperation = "replace" | "extend" | "toggle";

export type AffordanceHand =
  | { readonly type: "select"; readonly operation: SelectOperation }
  | WebKeyboardCommand
  | { readonly type: "expand" }
  | { readonly type: "collapse" }
  | { readonly type: "translate"; readonly dx: number; readonly dy: number }
  | { readonly type: "nudge"; readonly dx: number; readonly dy: number }
  | { readonly type: "select-all" }
  | { readonly type: "clear" }
  | { readonly type: "typeahead"; readonly buffer: string; readonly name: string | null }
  | { readonly type: "click"; readonly count: number }
  | { readonly type: "activate" }
  | { readonly type: "cancel" }
  | { readonly type: "tab"; readonly direction: "next" | "prev" }
  | { readonly type: "place" }
  | { readonly type: "open-menu" }
  | { readonly type: "rename"; readonly phase: "begin" | "commit" | "cancel" }
  | { readonly type: "hover"; readonly phase: "hint" | "tooltip" }
  | { readonly type: "scroll"; readonly dx: number; readonly dy: number }
  | { readonly type: "zoom"; readonly direction?: "in" | "out"; readonly delta?: number }
  | { readonly type: "copy" }
  | { readonly type: "move-drop" }
  | {
    readonly type: "history";
    readonly undo: { readonly name: "undo"; readonly disabled: boolean };
    readonly redo: { readonly name: "redo"; readonly disabled: boolean };
  };

export type AffordanceResult<H extends AffordanceHand = AffordanceHand> = {
  readonly hand: H | null;
  readonly cursor?: string;
  readonly commit?: boolean;
};

export function applyAffordance(
  result: AffordanceResult,
  actions: {
    readonly cursor?: (cursor: string) => void;
    readonly hand?: (hand: AffordanceHand) => void;
  },
): void {
  if (result.cursor !== undefined) actions.cursor?.(result.cursor);
  if (result.hand) actions.hand?.(result.hand);
}

export function selectOperationFrom(result: AffordanceResult): SelectOperation {
  return result.hand?.type === "select" ? result.hand.operation : "replace";
}

export function keyboardCommandFrom(result: AffordanceResult): WebKeyboardCommand | null {
  const hand = result.hand;
  if (!hand) return null;
  if (
    hand.type === "move"
    || hand.type === "boundary"
    || hand.type === "toggle"
    || hand.type === "delete"
    || hand.type === "undo"
    || hand.type === "redo"
  ) {
    return hand;
  }
  return null;
}
