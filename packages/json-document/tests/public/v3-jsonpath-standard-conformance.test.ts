import { createJSONDocument } from "@interactive-os/json-document";

import {
  runJSONPathConformance,
  type JSONPathHarness,
} from "../conformance/v3/jsonpath-suite.js";

const referenceHarness: JSONPathHarness = {
  create: createJSONDocument,
};

runJSONPathConformance(referenceHarness);
