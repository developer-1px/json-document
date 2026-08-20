import {
  createWebKeyboardAdapter,
  selectionOperationFromModifiers,
  type WebKeyboardStroke,
} from "@interactive-os/json-document-web";
import {
  type AffordancePreview,
  type SelectOperation,
} from "./result.js";


const keyboard = createWebKeyboardAdapter();

export type { SelectOperation };

export function pointerSelect(modifiers: {
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
}): AffordancePreview {
  return {
    hand: {
      type: "select",
      operation: selectionOperationFromModifiers({
        shiftKey: modifiers.shiftKey ?? false,
        metaKey: modifiers.metaKey ?? false,
        ctrlKey: modifiers.ctrlKey ?? false,
      }),
    },
  };
}

export function resolveAffordanceKey(stroke: WebKeyboardStroke): AffordancePreview {
  return { hand: keyboard.resolve(stroke) };
}

export function selectAllAffordance(
  stroke: Pick<WebKeyboardStroke, "key" | "metaKey" | "ctrlKey">,
  state: { readonly allSelected: boolean },
): AffordancePreview {
  const mod = stroke.metaKey || stroke.ctrlKey;
  if (!mod || stroke.key.toLowerCase() !== "a") return { hand: null };
  return { hand: { type: state.allSelected ? "clear" : "select-all" } };
}

export function typeaheadAffordance(input: {
  readonly buffer: string;
  readonly key: string;
  readonly elapsedMs: number;
  readonly names: ReadonlyArray<string>;
  readonly from: string | null;
  readonly windowMs?: number;
}): AffordancePreview {
  if (input.key.length !== 1 || input.key < " ") return { hand: null };
  const windowMs = input.windowMs ?? 500;
  const buffer = input.elapsedMs <= windowMs ? `${input.buffer}${input.key}` : input.key;
  const query = buffer.toLowerCase();
  const start = Math.max(0, input.names.findIndex((name) => name === input.from));
  const ordered = [...input.names.slice(start + 1), ...input.names.slice(0, start + 1)];
  const name = ordered.find((candidate) => candidate.toLowerCase().startsWith(query)) ?? null;
  return { hand: { type: "typeahead", buffer, name } };
}

export function clickCountAffordance(detail: number): AffordancePreview {
  if (detail < 1) return { hand: null };
  return { hand: { type: "click", count: detail } };
}

export function activateAffordance(input: { readonly key?: string; readonly detail?: number; readonly button?: number }): AffordancePreview {
  if (input.key === "Enter") return { hand: { type: "activate" } };
  if (input.button === 0 && (input.detail ?? 1) === 1) return { hand: { type: "activate" } };
  return { hand: null };
}

export function escapeAffordance(input: { readonly key?: string; readonly type?: string }): AffordancePreview {
  if (input.key === "Escape" || input.type === "pointercancel" || input.type === "lostpointercapture") {
    return { hand: { type: "cancel" } };
  }
  return { hand: null };
}

export function focusAffordance(stroke: Pick<WebKeyboardStroke, "key" | "shiftKey">): AffordancePreview {
  if (stroke.key === "Tab") {
    return { hand: { type: "tab", direction: stroke.shiftKey ? "prev" : "next" } };
  }
  const command = keyboard.resolve({
    key: stroke.key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
  });
  if (command?.type === "move" || command?.type === "boundary") return { hand: command };
  return { hand: null };
}
