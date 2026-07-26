export {
  createProjection,
} from "./create.js";
export type {
  ProjectionDocument,
  ProjectionOptions,
} from "./create.js";

export {
  appendSegment,
  applyProtocolPatch,
  buildPointer,
  parentPointer,
  parsePointer,
  trackPointer,
  tryParsePointer,
} from "../../foundation/protocol/index.js";
