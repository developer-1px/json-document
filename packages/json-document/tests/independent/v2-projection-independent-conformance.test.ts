import {
  runPressureConformance,
} from "../conformance/v2/pressure-suite.js";
import {
  runProjectionConformance,
  type ProjectionHarness,
} from "../conformance/v2/projection-suite.js";
import { createIndependentProjection } from "./v2-projection.js";

const independentHarness: ProjectionHarness = {
  create: createIndependentProjection,
};

runProjectionConformance(independentHarness);
runPressureConformance(independentHarness);
