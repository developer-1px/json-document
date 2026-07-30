import { trackPointer as trackPointerInternal } from "../patch/track.js";
import type { Pointer } from "../pointer/core.js";
import type { JSONPatchOperation } from "./contract.js";

export {
  applyOwnedProtocolPatch,
  applyProtocolPatch,
} from "./apply.js";
export type {
  JSONAppliedChange,
  JSONCapabilityResult,
  JSONPatchValidationResult,
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
  JSONDocumentCommitResult,
  JSONPatchOperation,
  JSONPatchResult,
  JSONValue,
  QueryResult,
  ReadResult,
} from "./contract.js";

export {
  cloneJsonSerializable,
  jsonEqual,
} from "../json/index.js";
export {
  JSONPathSyntaxError,
  query as queryJSONPath,
} from "../jsonpath/index.js";
export {
  appendSegment,
  buildPointer,
  parentPointer,
  parsePointer,
  readAt,
  tryParsePointer,
} from "../pointer/core.js";

export function trackPointer(
  pointer: Pointer,
  applied: ReadonlyArray<JSONPatchOperation>,
): Pointer | null {
  return trackPointerInternal(pointer, applied);
}
