import { applyPatch } from "@interactive-os/json-document";

import {
  runProtocolConformance,
  type ProtocolHarness,
} from "../conformance/v2/protocol-suite.js";

const referenceHarness: ProtocolHarness = {
  applyPatch,
};

runProtocolConformance(referenceHarness);
