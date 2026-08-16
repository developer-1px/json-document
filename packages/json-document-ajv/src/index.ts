import type {
  JSONPatchValidationResult,
  JSONValue,
} from "@interactive-os/json-document";
import type {
  AsyncValidateFunction,
  ErrorObject,
  ValidateFunction,
} from "ajv";

type AjvValidateFunction = ValidateFunction | AsyncValidateFunction;

export interface AjvValidatorOptions {
  readonly code?: string;
  /**
   * `clone` protects canonical candidates from mutating Ajv options and custom
   * keywords. Use `none` only when the compiled validator is proven read-only.
   */
  readonly candidateIsolation?: "clone" | "none";
}

export function createAjvValidator(
  validate: AjvValidateFunction,
  options: AjvValidatorOptions = {},
): (candidate: JSONValue) => JSONPatchValidationResult {
  if ("$async" in validate && validate.$async === true) {
    throw new TypeError("Ajv Connector requires a synchronous validator.");
  }

  const code = options.code ?? "schema_violation";
  const isolate = options.candidateIsolation !== "none";

  return (candidate) => {
    const result = validate(isolate ? cloneJSON(candidate) : candidate);
    if (result === true) return { ok: true };
    if (result !== false) {
      return {
        ok: false,
        code,
        reason: "Ajv validator must return a synchronous boolean result.",
      };
    }

    const issue = validate.errors?.[0];
    if (issue === undefined) {
      return {
        ok: false,
        code,
        reason: "Ajv validation failed without an error.",
      };
    }

    return issueFailure(issue, code);
  };
}

function issueFailure(issue: ErrorObject, code: string): JSONPatchValidationResult {
  return {
    ok: false,
    code,
    reason: issue.message ?? "Ajv validation failed.",
    pointer: issue.instancePath,
  };
}

function cloneJSON(value: JSONValue): JSONValue {
  if (Array.isArray(value)) return value.map(cloneJSON);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneJSON(child)]),
    );
  }
  return value;
}
