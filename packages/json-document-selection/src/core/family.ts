export interface SelectionFamily<
  State,
  Command,
  Context,
  Mapping,
  Target,
  Change = unknown,
> {
  transition(
    state: State,
    command: Command,
    context: Context,
  ): SelectionResult<State, Change>;
  reconcile(state: State, context: Context): SelectionResult<State, Change>;
  map(
    state: State,
    mapping: Mapping,
    context: Context,
  ): SelectionResult<State, Change>;
  targets(state: State, context: Context): readonly Target[];
}

export interface SelectionResult<State, Change = unknown> {
  readonly state: State;
  readonly changed: boolean;
  readonly change?: Change;
}

export type SelectionLifecycle = "transition" | "reconcile" | "map";

export interface SelectionChange {
  readonly lifecycle: SelectionLifecycle;
}

export function selectionResult<State>(
  previous: State,
  state: State,
  lifecycle: SelectionLifecycle,
  equal: (left: State, right: State) => boolean,
): SelectionResult<State, SelectionChange> {
  if (equal(previous, state)) return { state: previous, changed: false };
  return { state, changed: true, change: { lifecycle } };
}
