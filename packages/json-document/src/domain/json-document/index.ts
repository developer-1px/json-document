export {
  createJSONDocumentState,
} from "./create.js";

export { isJSONValue, jsonEqual } from "../../foundation/json/index.js";

export {
  appendSegment,
  applyProtocolPatch,
  buildPointer,
  parentPointer,
  parseArrayIndex,
  parsePointer,
  readPointer,
  trackPointer,
  tryParsePointer,
} from "../../foundation/protocol/index.js";
