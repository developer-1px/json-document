import {
  runPressureConformance,
} from "../../conformance/suites/pressure.js";
import {
  runJSONDocumentConformance,
  type JSONDocumentHarness,
} from "../../conformance/suites/json-document.js";
import { createIndependentJSONDocument } from "./json-document.js";

const independentHarness: JSONDocumentHarness = {
  create: createIndependentJSONDocument,
};

runJSONDocumentConformance(independentHarness);
runPressureConformance(independentHarness);
