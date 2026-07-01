// Advanced JSON Patch entrypoint.
// Prefer the document facade for ordinary app editing.

export {
  applyOperation,
  applyPatch,
} from "../foundation/patch/schema.js";
export { applyPatchToTrustedState } from "../domain/schema/validation/patch.js";
export type { JSONPatchInput } from "../application/document/state/patch.js";
export type {
  JSONPatchOperation,
  JSONResult,
} from "../foundation/patch/contract.js";
