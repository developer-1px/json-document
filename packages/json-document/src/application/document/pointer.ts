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
  resolveSiblingRange,
  trackPointer,
} from "../../domain/document/index.js";
export type {
  Pointer,
  ResolveSiblingRangeOptions,
  SiblingLocation,
  SiblingRangeErrorCode,
  SiblingRangeResult,
} from "../../domain/document/index.js";
