// Advanced JSON Pointer entrypoint.
// Prefer document methods that accept Pointer strings for ordinary app editing.

export {
  appendSegment,
  buildPointer,
  escapeSegment,
  lastSegment,
  lastSegmentIndex,
  parentPointer,
  parsePointer,
  PointerSyntaxError,
  tryParsePointer,
  unescapeSegment,
  withLastSegment,
} from "../foundation/pointer/index.js";
export { resolveSiblingRange } from "../foundation/pointer/siblingRange.js";
export { trackPointer } from "../foundation/patch/track.js";
export type { Pointer } from "../foundation/pointer/index.js";
export type {
  ResolveSiblingRangeOptions,
  SiblingLocation,
  SiblingRangeErrorCode,
  SiblingRangeResult,
} from "../foundation/pointer/siblingRange.js";
