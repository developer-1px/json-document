import {
  JSONPathSyntaxError,
  applyOwnedProtocolPatch,
  applyProtocolPatch,
  cloneJsonSerializable,
  jsonEqual,
  parsePointer,
  queryJSONPath,
  readAt,
  type JSONAppliedChange,
  type JSONPatchValidationResult,
  type JSONChangeMetadata,
  type JSONDocumentCommitOptions,
  type JSONDocumentCommitResult,
  type JSONPatchOperation,
  type JSONPatchResult,
  type JSONValue,
  type QueryResult,
  type ReadResult,
} from "../../foundation/protocol/index.js";

interface JSONDocumentStateOptions {
  readonly validate?: (candidate: JSONValue) => JSONPatchValidationResult;
}

interface JSONDocumentState {
  readonly value: JSONValue;
  at(pointer: string): ReadResult;
  query(jsonPath: string): QueryResult;
  validatePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchValidationResult;
  canPatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchValidationResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}

export function createJSONDocumentState(
  initial: unknown,
  options: JSONDocumentStateOptions = {},
): JSONDocumentState {
  const initialized = applyProtocolPatch(initial, []);
  if (!initialized.ok) {
    throw new TypeError(
      `Initial document value is not JSON: ${initialized.reason ?? initialized.code}`,
    );
  }

  let state = initialized.value;
  const initialValidation = validateCandidate(options.validate, state);
  if (!initialValidation.ok) {
    throw new TypeError(
      `Initial document value was rejected: ${initialValidation.reason ?? initialValidation.code}`,
    );
  }

  const listeners = new Set<(change: JSONAppliedChange) => void>();
  const notificationQueue: JSONAppliedChange[] = [];
  let notifying = false;
  let evaluatingValidation = false;

  const prepare = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchResult => {
    const patched = applyOwnedProtocolPatch(state, operations);
    if (!patched.ok) return patched;
    evaluatingValidation = true;
    try {
      const validation = validateCandidate(options.validate, patched.value);
      return validation.ok ? patched : validation;
    } finally {
      evaluatingValidation = false;
    }
  };

  const document = {
    get value() {
      return state;
    },
    at(pointer: string): ReadResult {
      let segments: string[];
      try {
        segments = parsePointer(pointer);
      } catch (error) {
        return failure(
          "invalid_pointer",
          error instanceof Error ? error.message : "invalid pointer",
          pointer,
        );
      }
      const result = readAt(state, segments);
      return result.ok
        ? Object.freeze({ ok: true, path: pointer, value: result.value as JSONValue })
        : failure("path_not_found", `path not found: ${pointer}`, pointer);
    },
    query(jsonPath: string): QueryResult {
      try {
        return Object.freeze({
          ok: true,
          query: jsonPath,
          pointers: Object.freeze(queryJSONPath(jsonPath, state)),
        });
      } catch (error) {
        if (error instanceof JSONPathSyntaxError) {
          return Object.freeze({
            ok: false,
            code: "invalid_query",
            reason: error.message,
          });
        }
        throw error;
      }
    },
    validatePatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONPatchValidationResult {
      if (evaluatingValidation) return VALIDATION_REENTRANCY_FAILURE;
      const result = prepare(operations);
      return result.ok ? OK : result;
    },
    canPatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONPatchValidationResult {
      if (evaluatingValidation) return VALIDATION_REENTRANCY_FAILURE;
      const result = prepare(operations);
      return result.ok ? OK : result;
    },
    commit(
      operations: ReadonlyArray<JSONPatchOperation>,
      commitOptions?: JSONDocumentCommitOptions,
    ): JSONDocumentCommitResult {
      if (evaluatingValidation) return VALIDATION_REENTRANCY_FAILURE;
      const metadata = ownMetadata(commitOptions?.metadata);
      if (!metadata.ok) return metadata;

      const result = prepare(operations);
      if (!result.ok) return result;

      if (jsonEqual(state, result.value)) {
        return Object.freeze({
          ok: true,
          change: createChange([], metadata.value),
        });
      }

      state = result.value;
      const change = createChange(result.change.applied, metadata.value);
      notify(change);
      return Object.freeze({ ok: true, change });
    },
    subscribe(listener: (change: JSONAppliedChange) => void): () => void {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
  } satisfies JSONDocumentState;

  return Object.freeze(document);

  function notify(change: JSONAppliedChange): void {
    notificationQueue.push(change);
    if (notifying) return;

    notifying = true;
    try {
      while (notificationQueue.length > 0) {
        const next = notificationQueue.shift() as JSONAppliedChange;
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          try {
            listener(next);
          } catch {
            // A subscriber runs after the state change is committed. Its failure
            // cannot turn that successful commit into an apparent failed write,
            // nor can it prevent delivery to the remaining subscribers.
          }
        }
      }
    } finally {
      notifying = false;
    }
  }
}

const OK: JSONPatchValidationResult = Object.freeze({ ok: true });
const VALIDATION_REENTRANCY_FAILURE = failure(
  "acceptance_reentrancy",
  "acceptance callback cannot call canPatch or commit",
);

function validateCandidate(
  validate: JSONDocumentStateOptions["validate"],
  candidate: JSONValue,
): JSONPatchValidationResult {
  if (validate === undefined) return OK;
  try {
    const result = validate(candidate);
    if (result?.ok === true) return OK;
    if (result?.ok === false && typeof result.code === "string") {
      return Object.freeze({
        ok: false,
        code: result.code,
        ...(result.reason === undefined ? {} : { reason: result.reason }),
        ...(result.pointer === undefined ? {} : { pointer: result.pointer }),
      });
    }
    return failure(
      "schema_violation",
      "acceptance callback must return a result with an ok discriminant",
    );
  } catch (error) {
    return failure(
      "schema_violation",
      error instanceof Error ? error.message : "acceptance callback failed",
    );
  }
}

function ownMetadata(
  metadata: JSONChangeMetadata | undefined,
):
  | { readonly ok: true; readonly value: JSONChangeMetadata | undefined }
  | Extract<JSONDocumentCommitResult, { readonly ok: false }> {
  if (metadata === undefined) return { ok: true, value: undefined };
  const cloned = cloneJsonSerializable(metadata);
  if (!cloned.ok) return failure("not_serializable", cloned.reason);
  return { ok: true, value: freezeJSON(cloned.value) };
}

function createChange(
  applied: ReadonlyArray<JSONPatchOperation>,
  metadata: JSONChangeMetadata | undefined,
): JSONAppliedChange {
  const frozenApplied = Object.isFrozen(applied)
    ? applied
    : Object.freeze([...applied]);
  return Object.freeze(
    metadata === undefined
      ? { applied: frozenApplied }
      : { applied: frozenApplied, metadata },
  );
}

function failure(
  code: string,
  reason?: string,
  pointer?: string,
): Extract<JSONDocumentCommitResult, { readonly ok: false }> {
  return Object.freeze({
    ok: false,
    code,
    ...(reason === undefined ? {} : { reason }),
    ...(pointer === undefined ? {} : { pointer }),
  });
}

function freezeJSON<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeJSON(child);
  Object.freeze(value);
  return value;
}
