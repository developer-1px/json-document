import { applyPatch } from "@interactive-os/json-document";

import {
  runProtocolConformance,
  type ProtocolHarness,
} from "../../../../standards/json-document-v3/conformance/suites/protocol.js";

const referenceHarness: ProtocolHarness = {
  applyPatch,
};

runProtocolConformance(referenceHarness);
