import { applyPatch } from "@interactive-os/json-document";

import {
  runProtocolConformance,
  type ProtocolHarness,
} from "../conformance/v3/protocol-suite.js";

const referenceHarness: ProtocolHarness = {
  applyPatch,
};

runProtocolConformance(referenceHarness);
