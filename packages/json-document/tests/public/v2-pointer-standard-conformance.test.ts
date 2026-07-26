import {
  appendSegment,
  buildPointer,
  parentPointer,
  parsePointer,
  trackPointer,
  tryParsePointer,
} from "@interactive-os/json-document";

import {
  runPointerConformance,
  type PointerHarness,
} from "../conformance/v2/pointer-suite.js";

const referenceHarness: PointerHarness = {
  appendSegment,
  buildPointer,
  parentPointer,
  parsePointer,
  trackPointer,
  tryParsePointer,
};

runPointerConformance(referenceHarness);
