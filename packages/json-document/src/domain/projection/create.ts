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
  type JSONCapabilityResult,
  type JSONChangeMetadata,
  type JSONDocumentCommitOptions,
  type JSONDocumentCommitResult,
  type JSONPatchOperation,
  type JSONPatchResult,
  type JSONValue,
  type QueryResult,
  type ReadResult,
} from "../../foundation/protocol/index.js";

export interface ProjectionOptions {
  readonly accepts?: (candidate: JSONValue) => JSONCapabilityResult;
}

export interface ProjectionDocument {
  readonly value: JSONValue;
  at(pointer: string): ReadResult;
  query(jsonPath: string): QueryResult;
  canPatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONCapabilityResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}

export function createProjection(
  initial: unknown,
  options: ProjectionOptions = {},
): ProjectionDocument {
  const initialized = applyProtocolPatch(initial, []);
  if (!initialized.ok) {
    throw new TypeError(
      `Initial document value is not JSON: ${initialized.reason ?? initialized.code}`,
    );
  }

  let state = initialized.value;
  const initialAcceptance = acceptCandidate(options.accepts, state);
  if (!initialAcceptance.ok) {
    throw new TypeError(
      `Initial document value was rejected: ${initialAcceptance.reason ?? initialAcceptance.code}`,
    );
  }

  const listeners = new Set<(change: JSONAppliedChange) => void>();
  const publicationQueue: JSONAppliedChange[] = [];
  let publishing = false;
  let evaluatingAcceptance = false;

  const prepare = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchResult => {
    const patched = applyOwnedProtocolPatch(state, operations);
    if (!patched.ok) return patched;
    evaluatingAcceptance = true;
    try {
      const accepted = acceptCandidate(options.accepts, patched.value);
      return accepted.ok ? patched : accepted;
    } finally {
      evaluatingAcceptance = false;
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
    canPatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONCapabilityResult {
      if (evaluatingAcceptance) return ACCEPTANCE_REENTRANCY_FAILURE;
      const result = prepare(operations);
      return result.ok ? OK : result;
    },
    commit(
      operations: ReadonlyArray<JSONPatchOperation>,
      commitOptions?: JSONDocumentCommitOptions,
    ): JSONDocumentCommitResult {
      if (evaluatingAcceptance) return ACCEPTANCE_REENTRANCY_FAILURE;
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
      publish(change);
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
  } satisfies ProjectionDocument;

  return Object.freeze(document);

  function publish(change: JSONAppliedChange): void {
    publicationQueue.push(change);
    if (publishing) return;

    publishing = true;
    try {
      while (publicationQueue.length > 0) {
        const next = publicationQueue.shift() as JSONAppliedChange;
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
      publishing = false;
    }
  }
}

const OK: JSONCapabilityResult = Object.freeze({ ok: true });
const ACCEPTANCE_REENTRANCY_FAILURE = failure(
  "acceptance_reentrancy",
  "acceptance callback cannot call canPatch or commit",
);

function acceptCandidate(
  accepts: ProjectionOptions["accepts"],
  candidate: JSONValue,
): JSONCapabilityResult {
  if (accepts === undefined) return OK;
  try {
    const result = accepts(candidate);
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
