import type { NavigationState } from "../core/session.js";

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

export interface NavigationContext<Point, SelectionCommand, Activation = unknown> {
  move(
    current: Point | null,
    direction: Extract<NavigationCommand, { readonly type: "move" }>["direction"],
  ): Point | null;
  boundary(edge: "start" | "end"): Point | null;
  select(point: Point, operation: "replace" | "extend"): SelectionCommand;
  activate(point: Point): Activation;
}

export interface NavigationResult<Point, SelectionCommand, Activation> {
  readonly navigation: NavigationState<Point>;
  readonly selectionCommand: SelectionCommand | null;
  readonly activation: Activation | null;
  readonly canceled: boolean;
  readonly changed: boolean;
}

export function reduceNavigation<Point, SelectionCommand, Activation = unknown>(
  state: NavigationState<Point>,
  command: NavigationCommand,
  context: NavigationContext<Point, SelectionCommand, Activation>,
): NavigationResult<Point, SelectionCommand, Activation> {
  if (command.type === "cancel") {
    return {
      navigation: state,
      selectionCommand: null,
      activation: null,
      canceled: true,
      changed: false,
    };
  }
  if (command.type === "activate") {
    return {
      navigation: state,
      selectionCommand: null,
      activation: state.current === null ? null : context.activate(state.current),
      canceled: false,
      changed: false,
    };
  }
  const point = command.type === "move"
    ? context.move(state.current, command.direction)
    : context.boundary(command.edge);
  if (point === null) {
    return {
      navigation: state,
      selectionCommand: null,
      activation: null,
      canceled: false,
      changed: false,
    };
  }
  return {
    navigation: { current: point },
    selectionCommand: context.select(point, command.operation),
    activation: null,
    canceled: false,
    changed: point !== state.current,
  };
}
