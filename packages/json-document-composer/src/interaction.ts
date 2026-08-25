import type { ComposerInteractionPolicy } from "./host-config.js";

export interface ComposerKeyStroke {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly commandKey?: boolean;
}

export type ComposerInteraction = "dismiss" | "history.redo" | "history.undo" | "newline" | "submit";

export function composerInteractionFromKeyStroke(
  stroke: ComposerKeyStroke,
  policy: ComposerInteractionPolicy,
): ComposerInteraction | null {
  if (stroke.key === "Escape") return "dismiss";
  if (stroke.commandKey && stroke.key.toLowerCase() === "z") return stroke.shiftKey ? "history.redo" : "history.undo";
  if (stroke.key !== "Enter") return null;
  const submits = policy.submit === "mod-enter" ? stroke.commandKey === true : stroke.commandKey !== true && stroke.shiftKey !== true;
  if (submits) return "submit";
  const newlines = policy.newline === "enter" ? stroke.shiftKey !== true : stroke.shiftKey === true;
  return newlines ? "newline" : null;
}
