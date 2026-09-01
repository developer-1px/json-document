export type ContentInteractionRole = "content" | "drop-target" | "insertion";

export type ContentInteractionPhase = "rest" | "active" | "dragging";

export type ContentInteractionInput =
  | {
      readonly role: "content";
      readonly selected?: boolean;
      readonly active?: boolean;
      readonly dragging?: boolean;
    }
  | {
      readonly role: "drop-target" | "insertion";
      readonly active: boolean;
    };

export type ContentInteractionAffordance = {
  readonly role: ContentInteractionRole;
  readonly phase: ContentInteractionPhase;
  readonly selected: boolean;
  readonly elevated: boolean;
};

/** Normalizes persistent selection and transient direct-manipulation feedback. */
export function contentInteractionAffordance(
  input: ContentInteractionInput,
): ContentInteractionAffordance {
  if (input.role !== "content") {
    return {
      role: input.role,
      phase: input.active ? "active" : "rest",
      selected: false,
      elevated: false,
    };
  }
  const phase = input.dragging ? "dragging" : input.active ? "active" : "rest";
  return {
    role: input.role,
    phase,
    selected: input.selected ?? false,
    elevated: phase === "dragging",
  };
}
