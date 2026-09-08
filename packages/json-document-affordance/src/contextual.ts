export type ContextualAffordancePhase = "rest" | "approach" | "selected" | "editing";

export type ContextualAffordanceCapability<Id extends string = string> = {
  readonly id: Id;
  readonly phases: ReadonlyArray<Exclude<ContextualAffordancePhase, "rest">>;
};

export type ContextualAffordanceSnapshot<Id extends string = string> = {
  readonly phase: ContextualAffordancePhase;
  readonly visible: ReadonlyArray<Id>;
};

/**
 * Projects input-independent content state into the controls that may be shown
 * near that content. Hosts provide capability IDs and render their placement;
 * pointer hover, keyboard focus, and product selection remain interchangeable
 * ways to reach a non-rest phase.
 */
export function contextualAffordance<Id extends string>(input: {
  readonly approached?: boolean;
  readonly focused?: boolean;
  readonly selected?: boolean;
  readonly editing?: boolean;
  readonly capabilities: ReadonlyArray<ContextualAffordanceCapability<Id>>;
}): ContextualAffordanceSnapshot<Id> {
  const phase: ContextualAffordancePhase = input.editing
    ? "editing"
    : input.selected
      ? "selected"
      : input.approached || input.focused
        ? "approach"
        : "rest";

  if (phase === "rest") return { phase, visible: [] };
  return {
    phase,
    visible: input.capabilities
      .filter((capability) => capability.phases.includes(phase))
      .map((capability) => capability.id),
  };
}
