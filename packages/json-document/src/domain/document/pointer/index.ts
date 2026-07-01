export {
  parsePointer,
  tryParsePointer,
  buildPointer,
  escapeSegment,
  unescapeSegment,
  PointerSyntaxError,
  parentPointer,
  lastSegment,
  lastSegmentIndex,
  appendSegment,
  withLastSegment,
} from "../../../foundation/pointer/index.js";
export type { Pointer } from "../../../foundation/pointer/index.js";
export { resolveSiblingRange } from "../../../foundation/pointer/siblingRange.js";
export type {
  ResolveSiblingRangeOptions,
  SiblingLocation,
  SiblingRangeErrorCode,
  SiblingRangeResult,
} from "../../../foundation/pointer/siblingRange.js";
export { trackPointer } from "../../../foundation/patch/track.js";
