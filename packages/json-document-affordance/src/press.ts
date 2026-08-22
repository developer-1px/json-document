import type { WebPressInteraction } from "@interactive-os/json-document-web";
import type { AffordancePreview } from "./result.js";

export type PressAffordanceResult = AffordancePreview & {
  readonly pressing: boolean;
};

/** Owns transient Press lifecycle; the host maps a completed press to a role action. */
export function pressAffordance(
  interaction: WebPressInteraction | null,
  state: { readonly pressing: boolean; readonly disabled?: boolean },
): PressAffordanceResult {
  if (state.disabled) {
    return state.pressing
      ? { hand: { type: "press", phase: "cancel" }, pressing: false }
      : { hand: null, pressing: false };
  }
  if (interaction === null) return { hand: null, pressing: state.pressing };
  if (interaction.phase === "activation") {
    return { hand: { type: "activate" }, pressing: false };
  }
  if (interaction.phase === "start") {
    return state.pressing
      ? { hand: null, pressing: true }
      : { hand: { type: "press", phase: "start" }, pressing: true };
  }
  if (!state.pressing) return { hand: null, pressing: false };
  return interaction.phase === "cancel"
    ? { hand: { type: "press", phase: "cancel" }, pressing: false }
    : { hand: { type: "press", phase: "end" }, pressing: false };
}
