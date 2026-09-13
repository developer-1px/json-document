import { createWebKeyboardAdapter, webKeyboardText, type WebKeyboardStroke } from "@interactive-os/json-document-web";
import { focusAffordance, renameAffordance, selectAllAffordance } from "./select.js";
import type { AffordancePreview } from "./result.js";

const activation = createWebKeyboardAdapter<"enter" | "previous" | "begin" | "cancel">({defaults: false,
  keymap: {Enter: "enter", "Shift-Enter": "previous", F2: "begin", Escape: "cancel"}});

/** Cell edit meaning. Native text keys stay native while an edit is active. */
export function cellEditingAffordance(stroke: WebKeyboardStroke, state: {readonly editing: boolean; readonly allSelected: boolean}): AffordancePreview {
  if (!stroke.metaKey && !stroke.ctrlKey && !stroke.altKey) {
    const focus = focusAffordance(stroke);
    if (focus.hand?.type === "tab") return focus;
  }
  const action = activation.resolve(stroke);
  if (state.editing) {
    if (action === "cancel") return renameAffordance({key: "Escape"});
    if (action === "enter" || action === "previous") return {hand: {type: "rename", action: "commit", move: action === "previous" ? "up" : "down"}};
    return {hand: null};
  }
  const all = selectAllAffordance(stroke, state, {repeat: "preserve"});
  if (all.hand) return all;
  if (action === "enter" || action === "begin") return renameAffordance({key: "F2"});
  const text = webKeyboardText(stroke);
  return text === null ? {hand: null} : {hand: {type: "rename", action: "begin", initialText: text}};
}
