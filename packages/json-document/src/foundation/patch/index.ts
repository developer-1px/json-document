export {
  applyOpRaw,
  validateOperationShape,
} from "./apply.js";
export type { RawResult } from "./apply.js";
export type {
  ApplyResult,
  ErrorCode,
  FastPatchResult,
  JSONPatchOperation,
  JSONResult,
  TrustedApplyResult,
  TrustedPatchOptions,
} from "./contract.js";
export { computeInverses } from "./inverse.js";
export {
  copyRootObject,
  copyRootObjectKeyPrefix,
  copyRootObjectKeys,
  objectHasOwn,
  removedRootKeysMatchSuffix,
} from "./object.js";
export {
  appendArrayIndexPath,
  arrayFieldText,
  arrayLocation,
  arrayRemoveLocation,
  indexDirection,
  numericSegment,
  parseArrayFieldPath,
  parseFirstArrayNestedPath,
  parseKnownArrayFieldIndex,
  parseKnownArrayNestedIndex,
} from "./path.js";
export type {
  ArrayFieldPath,
  ArrayFieldText,
  ArrayNestedPath,
} from "./path.js";
export { replaceValueAtSegments } from "./replaceValue.js";
export {
  fail,
  ok,
  zodIssuesReason,
} from "./result.js";
export {
  applyOperation,
  applyPatch,
  applyPatchToTrustedState,
  applySingleTrustedValuePatchToTrustedState,
} from "./schema.js";
export { removeSourcesPatch } from "./source.js";
export type {
  RemoveSourcesPatchOk,
  RemoveSourcesPatchResult,
} from "./source.js";
export {
  exists,
  recoverLostPointer,
  trackPointer,
  trackPointerFrom,
} from "./track.js";
export {
  applyAcceptedPatch,
  applyTrustedPatch,
} from "./trusted.js";
export { applyTrustedValueMutation } from "./value.js";
