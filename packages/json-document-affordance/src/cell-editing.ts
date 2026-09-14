import { createWebKeyboardAdapter, webKeyboardText, type WebKeyboardStroke } from "@interactive-os/json-document-web";
import { focusAffordance, renameAffordance, selectAllAffordance } from "./select.js";
import type { AffordancePreview } from "./result.js";

const activation = createWebKeyboardAdapter<"enter" | "previous" | "begin" | "cancel">({defaults: false,
  keymap: {Enter: "enter", "Shift-Enter": "previous", F2: "begin", Escape: "cancel"}});

/** Cell edit meaning. Native text keys stay native while an edit is active. */
export function cellEditingAffordance(stroke: WebKeyboardStroke, state: {readonly editing: boolean; readonly allSelected: boolean; readonly enter?: "edit" | "move"}): AffordancePreview {
  if (!stroke.metaKey && !stroke.ctrlKey && !stroke.altKey) {
    const focus = focusAffordance(stroke);
    if (focus.hand?.type === "tab") return focus;
  }
  const action = activation.resolve(stroke);
  if (state.editing) {
    if (state.enter === "move" && stroke.key === "Enter" && stroke.ctrlKey && !stroke.metaKey && !stroke.altKey && !stroke.shiftKey) return {hand:{type:"rename",action:"commit",target:"selection"}};
    if (action === "cancel") return renameAffordance({key: "Escape"});
    if (action === "enter" || action === "previous") return {hand: {type: "rename", action: "commit", move: action === "previous" ? "up" : "down"}};
    return {hand: null};
  }
  if (action === "cancel") return {hand:{type:"cancel"}};
  const all = selectAllAffordance(stroke, state, {repeat: "preserve"});
  if (all.hand) return all;
  if (stroke.key === " " && !stroke.metaKey && !stroke.altKey && stroke.ctrlKey !== stroke.shiftKey) return {hand:{type:"select",operation:"replace",axis:stroke.ctrlKey ? "column" : "row"}};
  if (state.enter === "move" && (action === "enter" || action === "previous")) return {hand: {type: "move", direction: action === "previous" ? "up" : "down", operation: "replace"}};
  if (action === "enter" || action === "begin") return renameAffordance({key: "F2"});
  const text = webKeyboardText(stroke);
  return text === null ? {hand: null} : {hand: {type: "rename", action: "begin", initialText: text}};
}
