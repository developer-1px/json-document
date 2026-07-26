// SPEC §5.9 — React facade over the headless createJSONDocument surface.

import { useMemo, useReducer, useRef } from "react";

import { createJSONDocument } from "../session/create.js";
import type {
  JSONDocument,
  JSONDocumentOptions,
} from "../session/contract.js";
import type {
  JSONDocumentSchemaInput,
  JSONDocumentSchemaLike,
  JSONDocumentSchemaOutput,
} from "../session/create.js";

type TrustedInitialDocumentOptions = JSONDocumentOptions & { trustedInitial: true };
type UntrustedInitialDocumentOptions = JSONDocumentOptions & { trustedInitial?: false | undefined };

export function useJSONDocument<S extends JSONDocumentSchemaLike>(
  schema: S,
  initial: JSONDocumentSchemaOutput<S>,
  options: TrustedInitialDocumentOptions,
): JSONDocument<JSONDocumentSchemaOutput<S>>;
export function useJSONDocument<S extends JSONDocumentSchemaLike>(
  schema: S,
  initial: JSONDocumentSchemaInput<S>,
  options?: UntrustedInitialDocumentOptions,
): JSONDocument<JSONDocumentSchemaOutput<S>>;
export function useJSONDocument<S extends JSONDocumentSchemaLike>(
  schema: S,
  initial: JSONDocumentSchemaInput<S> | JSONDocumentSchemaOutput<S>,
  options: JSONDocumentOptions = {},
): JSONDocument<JSONDocumentSchemaOutput<S>> {
  const [, force] = useReducer((version: number) => version + 1, 0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  return useMemo(
    () => {
      const documentOptions: UntrustedInitialDocumentOptions = {
        get strict() { return optionsRef.current.strict; },
        onError(error) { optionsRef.current.onError?.(error); },
        onChange: force,
      };
      if (options.history !== undefined) documentOptions.history = options.history;
      if (options.selection !== undefined) documentOptions.selection = options.selection;
      if (options.trustedInitial === true) {
        return createJSONDocument(schema, initial as JSONDocumentSchemaOutput<S>, {
          ...documentOptions,
          trustedInitial: true,
        });
      }
      return createJSONDocument(schema, initial as JSONDocumentSchemaInput<S>, documentOptions);
    },
    [schema],
  );
}
