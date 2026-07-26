import type * as z from "zod";
import { createDocumentRuntime } from "../../domain/document/index.js";
import type {
  JSONDocument,
  JSONDocumentOptions,
} from "./contract.js";

export interface JSONDocumentSchemaLike {
  readonly _zod: {
    readonly input: unknown;
    readonly output: unknown;
  };
  safeParse(value: unknown): { success: true; data: unknown } | { success: false; error: unknown };
}

export type JSONDocumentSchemaInput<S> =
  S extends { readonly _zod: { readonly input: infer Input } }
    ? Input
    : unknown;

export type JSONDocumentSchemaOutput<S> =
  S extends { readonly _zod: { readonly output: infer Output } }
    ? Output
    : unknown;

type TrustedInitialDocumentOptions = JSONDocumentOptions & { trustedInitial: true };
type UntrustedInitialDocumentOptions = JSONDocumentOptions & { trustedInitial?: false | undefined };

export function createJSONDocument<S extends JSONDocumentSchemaLike>(
  schema: S,
  initial: JSONDocumentSchemaOutput<S>,
  options: TrustedInitialDocumentOptions,
): JSONDocument<JSONDocumentSchemaOutput<S>>;
export function createJSONDocument<S extends JSONDocumentSchemaLike>(
  schema: S,
  initial: JSONDocumentSchemaInput<S>,
  options?: UntrustedInitialDocumentOptions,
): JSONDocument<JSONDocumentSchemaOutput<S>>;
export function createJSONDocument<S extends JSONDocumentSchemaLike>(
  schema: S,
  initial: JSONDocumentSchemaInput<S> | JSONDocumentSchemaOutput<S>,
  options: JSONDocumentOptions = {},
): JSONDocument<JSONDocumentSchemaOutput<S>> {
  const zodSchema = schema as unknown as z.ZodType<JSONDocumentSchemaOutput<S>, JSONDocumentSchemaInput<S>>;
  return createDocumentRuntime(zodSchema, initial, options) as JSONDocument<JSONDocumentSchemaOutput<S>>;
}
