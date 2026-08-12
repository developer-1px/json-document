import type { SelectionOperation } from "@interactive-os/json-document-selection";

export interface WebModifierState {
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

export function selectionOperationFromModifiers(
  modifiers: WebModifierState,
): Extract<SelectionOperation, "replace" | "extend" | "toggle"> {
  if (modifiers.shiftKey) return "extend";
  if (modifiers.metaKey || modifiers.ctrlKey) return "toggle";
  return "replace";
}
