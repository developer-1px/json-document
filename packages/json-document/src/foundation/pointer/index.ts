export {
  PointerSyntaxError,
  appendSegment,
  buildPointer,
  escapeSegment,
  isPrefix,
  lastSegment,
  lastSegmentIndex,
  parentPointer,
  parsePointer,
  readAt,
  tryParsePointer,
  unescapeSegment,
  withLastSegment,
} from "./core.js";
export type {
  BuildPointerOptions,
  Pointer,
} from "./core.js";

export {
  appendArrayIndexes,
  arrayElementLocation,
  arrayIndexValue,
} from "./array.js";
export {
  resolveSiblingRange,
} from "./siblingRange.js";
export type {
  ResolveSiblingRangeOptions,
  SiblingLocation,
  SiblingRangeErrorCode,
  SiblingRangeResult,
} from "./siblingRange.js";
export {
  normalizePointerSources,
} from "./source.js";
export type {
  NormalizePointerSourcesResult,
  PointerSource,
  PointerSourceError,
} from "./source.js";
