export type SelectionOperation = "replace" | "extend" | "toggle" | "add" | "subtract";

export type PointerSample<Point> =
  | {
      readonly phase: "start";
      readonly pointerId: string;
      readonly point: Point;
      readonly operation: SelectionOperation;
    }
  | { readonly phase: "move"; readonly pointerId: string; readonly point: Point }
  | { readonly phase: "end"; readonly pointerId: string; readonly point: Point }
  | { readonly phase: "cancel"; readonly pointerId: string };

export type PointerInteractionState<Point> =
  | { readonly kind: "idle" }
  | {
      readonly kind: "active";
      readonly pointerId: string;
      readonly start: Point;
      readonly current: Point;
      readonly operation: SelectionOperation;
    };

export interface InteractionResult<State, Preview, Commit> {
  readonly state: State;
  readonly changed: boolean;
  readonly preview: Preview | null;
  readonly commit: Commit | null;
  readonly canceled: boolean;
}

export function idlePointerInteraction<Point>(): PointerInteractionState<Point> {
  return { kind: "idle" };
}
