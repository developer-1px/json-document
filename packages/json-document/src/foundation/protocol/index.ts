import { trackPointer as trackPointerInternal } from "../patch/track.js";
import type { Pointer } from "../pointer/index.js";
import type { JSONPatchOperation } from "./contract.js";

export {
  applyOwnedProtocolPatch,
  applyProtocolPatch,
} from "./apply.js";
export type {
  JSONAppliedChange,
  JSONCapabilityResult,
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
  JSONDocumentCommitResult,
  JSONPatchFailure,
  JSONPatchOperation,
  JSONPatchResult,
  JSONValue,
  QueryResult,
  ReadResult,
} from "./contract.js";

export {
  cloneJsonSerializable,
  cloneTrustedPlainJson,
  jsonEqual,
} from "../json/index.js";
export {
  JSONPathSyntaxError,
  query as queryJSONPath,
} from "../jsonpath/index.js";
export {
  PointerSyntaxError,
  appendSegment,
  buildPointer,
  parentPointer,
  parsePointer,
  readAt,
  tryParsePointer,
} from "../pointer/index.js";
export type { Pointer } from "../pointer/index.js";

export function trackPointer(
  pointer: Pointer,
  applied: ReadonlyArray<JSONPatchOperation>,
): Pointer | null {
  return trackPointerInternal(pointer, applied);
}
