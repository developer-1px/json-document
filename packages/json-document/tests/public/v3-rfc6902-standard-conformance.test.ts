import { applyPatch } from "@interactive-os/json-document";

import {
  runRFC6902Conformance,
  type RFC6902Harness,
} from "../conformance/v3/rfc6902-suite.js";

const referenceHarness: RFC6902Harness = {
  applyPatch,
};

runRFC6902Conformance(referenceHarness);
