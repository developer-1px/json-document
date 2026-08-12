import type {
  JSONPatchValidationResult,
  JSONValue,
} from "@interactive-os/json-document";
import type { ZodType } from "zod/v4";

export interface ZodValidatorOptions {
  readonly code?: string;
}

export function createZodValidator(
  schema: ZodType,
  options: ZodValidatorOptions = {},
): (candidate: JSONValue) => JSONPatchValidationResult {
  const code = options.code ?? "schema_violation";

  return (candidate) => {
    const result = schema.safeParse(candidate);
    if (result.success) return { ok: true };

    const issue = result.error.issues[0];
    if (issue === undefined) {
      return {
        ok: false,
        code,
        reason: "Zod validation failed without an issue.",
      };
    }

    return {
      ok: false,
      code,
      reason: issue.message,
      pointer: issuePathToPointer(issue.path),
    };
  };
}

function issuePathToPointer(path: ReadonlyArray<PropertyKey>): string {
  return path.length === 0
    ? ""
    : `/${path.map((segment) => escapePointerToken(String(segment))).join("/")}`;
}

function escapePointerToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
