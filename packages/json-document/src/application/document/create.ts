import { createProjection } from "../../domain/projection/index.js";
import type {
  JSONCapabilityResult,
  JSONDocument,
  JSONValue,
} from "./contract.js";

export function createJSONDocument(
  initial: unknown,
  options: {
    readonly accepts?: (candidate: JSONValue) => JSONCapabilityResult;
  } = {},
): JSONDocument {
  return createProjection(initial, options);
}
