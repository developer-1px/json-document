import {
  createWebKeyboardAdapter,
  selectionOperationFromModifiers,
  type WebKeyboardCommand,
  type WebKeyboardStroke,
  type WebModifierState,
} from "@interactive-os/json-document-web";

const keyboard = createWebKeyboardAdapter();

export type SelectOperation = "replace" | "extend" | "toggle";

export function pointerSelect(modifiers: WebModifierState): SelectOperation {
  return selectionOperationFromModifiers(modifiers);
}

export function resolveAffordanceKey(stroke: WebKeyboardStroke): WebKeyboardCommand | null {
  return keyboard.resolve(stroke);
}
