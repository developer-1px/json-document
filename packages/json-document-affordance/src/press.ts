import type { WebPressInteraction } from "@interactive-os/json-document-web";
import type { AffordancePreview } from "./result.js";

export type PressAffordanceState =
  | { readonly status: "idle" }
  | { readonly status: "active"; readonly source: "pointer" }
  | { readonly status: "active"; readonly source: "keyboard"; readonly key: "Enter" | "Space" };

export type PressAffordanceResult = AffordancePreview & {
  readonly state: PressAffordanceState;
};

/** Owns one source-aware custom Press lifecycle; the host maps it to a role action. */
export function pressAffordance(
  interaction: WebPressInteraction | null,
  state: PressAffordanceState,
  options: { readonly disabled?: boolean } = {},
): PressAffordanceResult {
  if (options.disabled) return cancelActive(state);
  if (interaction === null) return { hand: null, state };
  if (interaction.phase === "activation") {
    return { hand: { type: "activate" }, state: { status: "idle" } };
  }
  if (interaction.phase === "start") {
    if (state.status === "active") return { hand: null, state };
    const next = interaction.source === "pointer"
      ? { status: "active", source: "pointer" } as const
      : { status: "active", source: "keyboard", key: interaction.key } as const;
    return { hand: pressHand(interaction), state: next };
  }
  if (!matchesActivePress(interaction, state)) return { hand: null, state };
  return { hand: pressHand(interaction, state), state: { status: "idle" } };
}

function cancelActive(state: PressAffordanceState): PressAffordanceResult {
  if (state.status === "idle") return { hand: null, state };
  return {
    hand: state.source === "pointer"
      ? { type: "press", phase: "cancel", source: "pointer" }
      : { type: "press", phase: "cancel", source: "keyboard", key: state.key },
    state: { status: "idle" },
  };
}

function matchesActivePress(
  interaction: Exclude<WebPressInteraction, { readonly phase: "start" | "activation" }>,
  state: PressAffordanceState,
): boolean {
  if (state.status === "idle" || interaction.source !== state.source) return false;
  return interaction.source === "pointer"
    || (state.source === "keyboard" && (
      interaction.phase === "cancel"
      || ("key" in interaction && interaction.key === state.key)
    ));
}

function pressHand(
  interaction: Exclude<WebPressInteraction, { readonly phase: "activation" }>,
  state: PressAffordanceState = { status: "idle" },
) {
  if (interaction.source === "pointer") {
    return { type: "press", phase: interaction.phase, source: "pointer" } as const;
  }
  const key = "key" in interaction
    ? interaction.key
    : state.status === "active" && state.source === "keyboard" ? state.key : null;
  if (key === null) throw new Error("keyboard Press cancellation requires active keyboard state");
  return { type: "press", phase: interaction.phase, source: "keyboard", key } as const;
}
