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

export function planeHitAffordance(input: {
  readonly hitId: string;
  readonly selectedIds: ReadonlyArray<string>;
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly nestedId?: string;
  readonly locked?: boolean;
}): AffordancePreview {
  if (input.locked) return { hand: null, cursor: "not-allowed" };
  const selected = input.selectedIds;
  const deep = (input.metaKey || input.ctrlKey) && input.nestedId;
  if (deep) {
    return {
      hand: { type: "select", operation: "replace", objectIds: [input.nestedId!] },
    };
  }
  const hitId = input.hitId;
  const hitSelected = selected.includes(hitId);
  if (input.shiftKey) {
    return {
      hand: {
        type: "select",
        operation: hitSelected ? "replace" : "extend",
        objectIds: hitSelected ? selected.filter((id) => id !== hitId) : [...new Set([...selected, hitId])],
      },
    };
  }
  return {
    hand: {
      type: "select",
      operation: "replace",
      objectIds: hitSelected ? selected : [hitId],
    },
  };
}

export function deleteAffordance(input: { readonly key?: string }): AffordancePreview {
  if (input.key === "Delete" || input.key === "Backspace") return { hand: { type: "delete" } };
  return { hand: null };
}

export function contextMenuAffordance(input: {
  readonly type?: string;
  readonly button?: number;
  readonly key?: string;
  readonly shiftKey?: boolean;
}): AffordancePreview {
  if (input.key === "Escape") return { hand: { type: "menu", action: "cancel" } };
  if (input.type === "contextmenu" || input.button === 2) return { hand: { type: "menu", action: "open" } };
  if (input.key === "ContextMenu" || (input.key === "F10" && input.shiftKey)) {
    return { hand: { type: "menu", action: "open" } };
  }
  return { hand: null };
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

export function caretCursor(direction: "horizontal" | "vertical"): "text" | "vertical-text" {
  return direction === "vertical" ? "vertical-text" : "text";
}

export function caretAffordance(input:
  | { readonly type: "pointer"; readonly dragging?: boolean }
  | Pick<WebKeyboardStroke, "key" | "shiftKey">
): AffordancePreview {
  if (!("key" in input)) {
    return {
      hand: {
        type: "caret",
        action: input.dragging ? "range" : "place",
        operation: input.dragging ? "extend" : "replace",
      },
      cursor: "text",
    };
  }
  const command = keyboard.resolve({
    key: input.key,
    shiftKey: input.shiftKey,
    metaKey: false,
    ctrlKey: false,
  });
  if (command?.type === "move") {
    return {
      hand: {
        type: "caret-move",
        direction: command.direction,
        operation: command.operation,
      },
    };
  }
  if (command?.type === "boundary") {
    return {
      hand: {
        type: "caret-move",
        edge: command.edge,
        operation: command.operation,
      },
    };
  }
  return { hand: null };
}

export function renameAffordance(input:
  | Pick<WebKeyboardStroke, "key">
  | {
    readonly type: "pointer";
    readonly detail: number;
    readonly intervalMs: number;
    readonly slowMs?: number;
  }
): AffordancePreview {
  if (!("key" in input)) {
    const slowMs = input.slowMs ?? 400;
    return input.detail === 2 && input.intervalMs >= slowMs
      ? { hand: { type: "rename", action: "begin" } }
      : { hand: null };
  }
  if (input.key === "F2") return { hand: { type: "rename", action: "begin" } };
  if (input.key === "Enter") return { hand: { type: "rename", action: "commit" } };
  if (input.key === "Escape") return { hand: { type: "rename", action: "cancel" } };
  return { hand: null };
}

export function activateAffordance(input: { readonly key?: string; readonly detail?: number; readonly button?: number }): AffordancePreview {
  if (input.key === "Enter") return { hand: { type: "activate" } };
  if (input.button === 0 && (input.detail ?? 1) >= 1) return { hand: { type: "activate" } };
  return { hand: null };
}

export function escapeAffordance(input: {
  readonly key?: string;
  readonly type?: string;
  readonly grabbing?: boolean;
  readonly selected?: boolean;
}): AffordancePreview {
  const pointerAbort = input.type === "pointercancel" || input.type === "lostpointercapture";
  if (pointerAbort) return { hand: { type: "cancel" } };
  if (input.key !== "Escape") return { hand: null };
  if (input.grabbing === true) return { hand: { type: "cancel" } };
  if (input.selected === true) return { hand: { type: "clear" } };
  if (input.grabbing === false && input.selected === false) return { hand: null };
  return { hand: { type: "cancel" } };
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
