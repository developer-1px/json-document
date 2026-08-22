export type SelectOperation = "replace" | "extend" | "toggle";

export type AffordanceMoveDirection = "previous" | "next" | "up" | "down" | "left" | "right";

export type AffordanceRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type AffordanceHand =
  | {
    readonly type: "select";
    readonly operation: SelectOperation;
    readonly rect?: AffordanceRect;
    readonly objectIds?: ReadonlyArray<string>;
  }
  | { readonly type: "move"; readonly direction: AffordanceMoveDirection; readonly operation: "replace" | "extend" }
  | { readonly type: "boundary"; readonly edge: "start" | "end"; readonly operation: "replace" | "extend" }
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "expand" }
  | { readonly type: "collapse" }
  | { readonly type: "translate"; readonly dx: number; readonly dy: number }
  | { readonly type: "nudge"; readonly dx: number; readonly dy: number }
  | { readonly type: "select-all" }
  | { readonly type: "clear" }
  | { readonly type: "typeahead"; readonly buffer: string; readonly name: string | null }
  | { readonly type: "click"; readonly count: number }
  | { readonly type: "caret"; readonly action: "place" | "range"; readonly operation: "replace" | "extend" }
  | {
    readonly type: "caret-move";
    readonly direction?: AffordanceMoveDirection;
    readonly edge?: "start" | "end";
    readonly operation: "replace" | "extend";
  }
  | { readonly type: "rename"; readonly action: "begin" | "commit" | "cancel" }
  | { readonly type: "activate" }
  | { readonly type: "press"; readonly phase: "start" | "end" | "cancel" }
  | { readonly type: "cancel" }
  | { readonly type: "tab"; readonly direction: "next" | "prev" }
  | { readonly type: "hover"; readonly phase: "hint" | "tooltip" }
  | { readonly type: "copy" }
  | { readonly type: "move-drop" }
  | {
    readonly type: "history";
    readonly undo: { readonly name: "undo"; readonly disabled: boolean };
    readonly redo: { readonly name: "redo"; readonly disabled: boolean };
  };

export type AffordancePreview<H extends AffordanceHand = AffordanceHand> = {
  readonly hand: H | null;
  readonly cursor?: string;
};

export type AffordanceCommit<H extends AffordanceHand = AffordanceHand> = {
  readonly hand: H;
  readonly cursor?: string;
  readonly commit: true;
};

export type AffordanceResult<H extends AffordanceHand = AffordanceHand> =
  | AffordancePreview<H>
  | AffordanceCommit<H>;

export type AffordancePreviewActions<H extends AffordanceHand = AffordanceHand> = {
  readonly cursor?: (cursor: string) => void;
  readonly hand?: (hand: H) => void;
};

export type AffordanceCommitActions<H extends AffordanceHand = AffordanceHand> =
  & AffordancePreviewActions<H>
  & {
    readonly commit?: (hand: H) => void;
  };

export function applyAffordance<H extends AffordanceHand>(
  result: AffordanceCommit<H>,
  actions: AffordanceCommitActions<H>,
): void;
export function applyAffordance<H extends AffordanceHand>(
  result: AffordancePreview<H>,
  actions: AffordancePreviewActions<H>,
): void;
export function applyAffordance<H extends AffordanceHand>(
  result: AffordanceResult<H>,
  actions: AffordanceCommitActions<H>,
): void {
  if (result.cursor !== undefined) actions.cursor?.(result.cursor);
  if (result.hand) actions.hand?.(result.hand);
  if ("commit" in result && result.commit && result.hand) actions.commit?.(result.hand);
}
export function commitAffordance<H extends AffordanceHand>(
  result: AffordancePreview<H>,
): AffordanceCommit<H> | null {
  const hand = result.hand;
  if (hand == null) return null;
  if (hand.type === "translate" && hand.dx === 0 && hand.dy === 0) return null;
  return result.cursor === undefined
    ? { hand, commit: true }
    : { hand, cursor: result.cursor, commit: true };
}
