import { createWebKeyboardAdapter } from "@interactive-os/json-document-web";
import type { ComposerInteractionPolicy } from "./host-config.js";

const keyboard = createWebKeyboardAdapter();

export interface ComposerKeyStroke {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly commandKey?: boolean;
  readonly altKey?: boolean;
}

export type ComposerInteraction = "dismiss" | "history.redo" | "history.undo" | "newline" | "submit";

/** Uses the Web default history keymap, then applies Composer submit/newline policy. */
export function composerInteractionFromKeyStroke(
  stroke: ComposerKeyStroke,
  policy: ComposerInteractionPolicy,
): ComposerInteraction | null {
  if (stroke.key === "Escape") return "dismiss";
  const command = keyboard.resolve({
    key: stroke.key,
    shiftKey: stroke.shiftKey ?? false,
    metaKey: stroke.commandKey ?? false,
    ctrlKey: false,
    altKey: stroke.altKey ?? false,
  });
  if (command?.type === "undo") return "history.undo";
  if (command?.type === "redo") return "history.redo";
  if (stroke.key !== "Enter") return null;
  const submits = policy.submit === "mod-enter" ? stroke.commandKey === true : stroke.commandKey !== true && stroke.shiftKey !== true;
  if (submits) return "submit";
  const newlines = policy.newline === "enter" ? stroke.shiftKey !== true : stroke.shiftKey === true;
  return newlines ? "newline" : null;
}
