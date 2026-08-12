import { applyPatch } from "@interactive-os/json-document";

import {
  runRFC6902Conformance,
  type RFC6902Harness,
} from "../../../../standards/json-document-v3/conformance/suites/rfc6902.js";

const referenceHarness: RFC6902Harness = {
  applyPatch,
};

runRFC6902Conformance(referenceHarness);
