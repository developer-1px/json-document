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
} from "../../../../standards/json-document-v3/conformance/suites/pointer.js";

const referenceHarness: PointerHarness = {
  appendSegment,
  buildPointer,
  parentPointer,
  parsePointer,
  trackPointer,
  tryParsePointer,
};

runPointerConformance(referenceHarness);
