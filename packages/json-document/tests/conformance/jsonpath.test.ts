import { createJSONDocument } from "@interactive-os/json-document";

import {
  runJSONPathConformance,
  type JSONPathHarness,
} from "../../../../standards/json-document-v3/conformance/suites/jsonpath.js";

const referenceHarness: JSONPathHarness = {
  create: createJSONDocument,
};

runJSONPathConformance(referenceHarness);
