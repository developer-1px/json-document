import {
  runPressureConformance,
} from "../conformance/v3/pressure-suite.js";
import {
  runJSONDocumentConformance,
  type JSONDocumentHarness,
} from "../conformance/v3/json-document-suite.js";
import { createIndependentJSONDocument } from "./v3-json-document.js";

const independentHarness: JSONDocumentHarness = {
  create: createIndependentJSONDocument,
};

runJSONDocumentConformance(independentHarness);
runPressureConformance(independentHarness);
