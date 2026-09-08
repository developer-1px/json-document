import {
  runPressureConformance,
} from "../../conformance/suites/pressure.js";
import {
  runJSONDocumentConformance,
  type JSONDocumentHarness,
} from "../../conformance/suites/json-document.js";
import { applyIndependentPatch, createIndependentJSONDocument } from "./json-document.js";
import { runProtocolConformance } from "../../conformance/suites/protocol.js";
import { runJSONPathConformance } from "../../conformance/suites/jsonpath.js";
import { runRFC6902Conformance } from "../../conformance/suites/rfc6902.js";

const independentHarness: JSONDocumentHarness = {
  create: createIndependentJSONDocument,
};

runJSONDocumentConformance(independentHarness);
runPressureConformance(independentHarness);
runJSONPathConformance({ create: (initial) => createIndependentJSONDocument("json", initial) });
const independentPatchHarness = { applyPatch: applyIndependentPatch };
runRFC6902Conformance(independentPatchHarness);
runProtocolConformance(independentPatchHarness);
