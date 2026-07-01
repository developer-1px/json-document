import type * as z from "zod";
import { createDocumentRuntime } from "../../domain/document/index.js";
import type {
  JSONDocument,
  JSONDocumentOptions,
} from "./contract.js";
import type {
  JSONDocumentSchemaInput,
  JSONDocumentSchemaLike,
  JSONDocumentSchemaOutput,
} from "./schema-type.js";

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
