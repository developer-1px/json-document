import { createJSONDocumentState } from "../../domain/json-document/index.js";
import type {
  JSONDocument,
  JSONDocumentOptions,
  JSONPatchValidationResult,
  JSONValue,
} from "./contract.js";

export function createJSONDocument(
  initial: unknown,
  options: JSONDocumentOptions = {},
): JSONDocument {
  const validate = options.validate;
  return createJSONDocumentState(initial, {
    ...(validate === undefined ? {} : {
      validate: (candidate: JSONValue): JSONPatchValidationResult =>
        validate(candidate),
    }),
  });
}
