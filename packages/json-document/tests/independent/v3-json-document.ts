import type {
  JSONPatchOperation,
  JSONValue,
  JSONDocument,
  JSONDocumentValidation,
  JSONDocumentValidationResult,
  JSONDocumentChange,
  JSONDocumentCommitOptions,
  JSONDocumentCommitResult,
  JSONDocumentMetadata,
  JSONDocumentQueryResult,
  JSONDocumentReadResult,
} from "../conformance/v3/json-document-suite.js";

interface PreparedCommit {
  readonly value: JSONValue;
  readonly applied: ReadonlyArray<JSONPatchOperation>;
}

interface OperationResult {
  readonly value: JSONValue;
  readonly applied: JSONPatchOperation;
}

export function createIndependentJSONDocument(
  validation: JSONDocumentValidation,
  initial: JSONValue,
): JSONDocument {
  let state = freezeJSON(cloneJSON(initial));
  accept(validation, state);

  const listeners = new Set<(change: JSONDocumentChange) => void>();
  const notificationQueue: JSONDocumentChange[] = [];
  let publishing = false;
  let evaluatingValidation = false;

  const prepare = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedCommit | JSONDocumentFailure => {
    try {
      let value = cloneJSON(state);
      const applied: JSONPatchOperation[] = [];
      for (const operation of operations) {
        const result = applyOperation(value, operation);
        value = result.value;
        applied.push(
          cloneJSON(result.applied) as unknown as JSONPatchOperation,
        );
      }
      value = freezeJSON(value);
      evaluatingValidation = true;
      try {
        accept(validation, value);
      } finally {
        evaluatingValidation = false;
      }
      return { value, applied };
    } catch (error) {
      return failureFrom(error);
    }
  };

  const document: JSONDocument = {
    get value() {
      return state;
    },
    at(pointer: string): JSONDocumentReadResult {
      try {
        const value = readAt(state, parsePointer(pointer));
        return Object.freeze({ ok: true, path: pointer, value });
      } catch (error) {
        const failed = failureFrom(error);
        return failed.code === "invalid_pointer"
          ? Object.freeze({ ...failed, pointer })
          : Object.freeze({ ...failed, pointer });
      }
    },
    query(jsonPath: string): JSONDocumentQueryResult {
      try {
        return Object.freeze({
          ok: true,
          query: jsonPath,
          pointers: Object.freeze(queryPointers(state, jsonPath)),
        });
      } catch (error) {
        const failed = failureFrom(error);
        return Object.freeze({
          ok: false,
          code: failed.code === "invalid_query"
            ? failed.code
            : "invalid_query",
          ...(failed.reason === undefined ? {} : { reason: failed.reason }),
        });
      }
    },
    validatePatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONDocumentValidationResult {
      if (evaluatingValidation) return VALIDATION_REENTRANCY_FAILURE;
      const prepared = prepare(operations);
      return "ok" in prepared ? prepared : OK;
    },
    commit(
      operations: ReadonlyArray<JSONPatchOperation>,
      options?: JSONDocumentCommitOptions,
    ): JSONDocumentCommitResult {
      if (evaluatingValidation) return VALIDATION_REENTRANCY_FAILURE;

      let metadata: JSONDocumentMetadata | undefined;
      try {
        metadata = options?.metadata === undefined
          ? undefined
          : freezeJSON(cloneJSON(options.metadata)) as JSONDocumentMetadata;
      } catch (error) {
        return failureFrom(error);
      }

      const prepared = prepare(operations);
      if ("ok" in prepared) return prepared;
      if (jsonEqual(state, prepared.value)) {
        return Object.freeze({
          ok: true,
          change: createChange([], metadata),
        });
      }

      state = prepared.value;
      const change = createChange(prepared.applied, metadata);
      publish(change);
      return Object.freeze({ ok: true, change });
    },
    subscribe(listener: (change: JSONDocumentChange) => void): () => void {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
  };

  return Object.freeze(document);

  function publish(change: JSONDocumentChange): void {
    notificationQueue.push(change);
    if (publishing) return;

    publishing = true;
    try {
      while (notificationQueue.length > 0) {
        const next = notificationQueue.shift() as JSONDocumentChange;
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          try {
            listener(next);
          } catch {
            // Notification is post-commit. A listener cannot roll state back or
            // prevent delivery to the remaining listeners.
          }
        }
      }
    } finally {
      publishing = false;
    }
  }
}

interface JSONDocumentFailure {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}

class IndependentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly pointer?: string,
  ) {
    super(message);
  }
}

const OK = Object.freeze({ ok: true as const });
const VALIDATION_REENTRANCY_FAILURE = Object.freeze({
  ok: false as const,
  code: "acceptance_reentrancy",
  reason: "validation callback cannot call validatePatch or commit",
});

function failureFrom(error: unknown): JSONDocumentFailure {
  if (error instanceof IndependentError) {
    return Object.freeze({
      ok: false,
      code: error.code,
      reason: error.message,
      ...(error.pointer === undefined ? {} : { pointer: error.pointer }),
    });
  }
  return Object.freeze({
    ok: false,
    code: "not_serializable",
    reason: error instanceof Error ? error.message : "value is not JSON",
  });
}

function accept(
  validation: JSONDocumentValidation,
  candidate: JSONValue,
): void {
  if (validation === "json") return;
  if (validation === "attempt-transform") {
    if (isRecord(candidate)) {
      Reflect.set(candidate, "title", "Implicit");
    }
    return;
  }
  if (
    isRecord(candidate)
    && typeof candidate.title === "string"
    && Array.isArray(candidate.items)
    && candidate.items.every((item) => (
      isRecord(item)
      && typeof item.id === "string"
      && typeof item.done === "boolean"
    ))
    && isRecord(candidate.meta)
    && typeof candidate.meta.owner === "string"
  ) {
    return;
  }
  throw new IndependentError(
    "schema_violation",
    "candidate does not satisfy the task-list validation rule",
  );
}

function applyOperation(
  state: JSONValue,
  operation: JSONPatchOperation,
): OperationResult {
  if (operation === null || typeof operation !== "object") {
    throw new IndependentError("invalid_pointer", "operation must be an object");
  }

  switch (operation.op) {
    case "add":
      return addValue(state, operation.path, cloneJSON(operation.value));
    case "remove":
      return removeValue(state, operation.path);
    case "replace":
      return replaceValue(state, operation.path, cloneJSON(operation.value));
    case "copy": {
      const copied = cloneJSON(readAt(state, parsePointer(operation.from)));
      const added = addValue(state, operation.path, copied);
      return {
        value: added.value,
        applied: {
          op: "copy",
          from: operation.from,
          path: added.applied.path,
        },
      };
    }
    case "move": {
      parsePointer(operation.path);
      parsePointer(operation.from);
      if (operation.from === operation.path) {
        return {
          value: state,
          applied: {
            op: "move",
            from: operation.from,
            path: operation.path,
          },
        };
      }
      if (isPointerAncestor(operation.from, operation.path)) {
        throw new IndependentError(
          "path_not_found",
          "move destination cannot be inside its source",
          operation.path,
        );
      }
      const moved = cloneJSON(readAt(state, parsePointer(operation.from)));
      const removed = removeValue(state, operation.from);
      const added = addValue(removed.value, operation.path, moved);
      return {
        value: added.value,
        applied: {
          op: "move",
          from: operation.from,
          path: added.applied.path,
        },
      };
    }
    case "test": {
      const actual = readAt(state, parsePointer(operation.path));
      if (!jsonEqual(actual, operation.value)) {
        throw new IndependentError(
          "test_failed",
          "value mismatch",
          operation.path,
        );
      }
      return {
        value: state,
        applied: {
          op: "test",
          path: operation.path,
          value: cloneJSON(operation.value),
        },
      };
    }
    default:
      throw new IndependentError(
        "invalid_pointer",
        "operation is not recognized",
      );
  }
}

function addValue(
  state: JSONValue,
  pointer: string,
  value: JSONValue,
): OperationResult {
  const segments = parsePointer(pointer);
  if (segments.length === 0) {
    return {
      value,
      applied: { op: "add", path: pointer, value },
    };
  }

  const { parent, key, parentPointer } = resolveParent(state, segments, pointer);
  let path = pointer;
  if (Array.isArray(parent)) {
    const index = key === "-" ? parent.length : parseArrayIndex(key);
    if (index === null || index > parent.length) {
      throw new IndependentError(
        "path_not_found",
        `array insertion index is invalid: ${key}`,
        pointer,
      );
    }
    parent.splice(index, 0, value);
    path = appendPointer(parentPointer, String(index));
  } else {
    defineJsonProperty(parent, key, value);
  }
  return {
    value: state,
    applied: { op: "add", path, value },
  };
}

function removeValue(
  state: JSONValue,
  pointer: string,
): OperationResult {
  const segments = parsePointer(pointer);
  if (segments.length === 0) {
    throw new IndependentError(
      "path_not_found",
      "a JSON document cannot remove its root",
      pointer,
    );
  }

  const { parent, key } = resolveParent(state, segments, pointer);
  if (Array.isArray(parent)) {
    const index = parseArrayIndex(key);
    if (index === null || index >= parent.length) {
      throw new IndependentError("path_not_found", "array index is absent", pointer);
    }
    parent.splice(index, 1);
  } else {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new IndependentError("path_not_found", "object member is absent", pointer);
    }
    delete parent[key];
  }
  return {
    value: state,
    applied: { op: "remove", path: pointer },
  };
}

function replaceValue(
  state: JSONValue,
  pointer: string,
  value: JSONValue,
): OperationResult {
  const segments = parsePointer(pointer);
  if (segments.length === 0) {
    return {
      value,
      applied: { op: "replace", path: pointer, value },
    };
  }

  const { parent, key } = resolveParent(state, segments, pointer);
  if (Array.isArray(parent)) {
    const index = parseArrayIndex(key);
    if (index === null || index >= parent.length) {
      throw new IndependentError("path_not_found", "array index is absent", pointer);
    }
    parent[index] = value;
  } else {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new IndependentError("path_not_found", "object member is absent", pointer);
    }
    defineJsonProperty(parent, key, value);
  }
  return {
    value: state,
    applied: { op: "replace", path: pointer, value },
  };
}

function resolveParent(
  state: JSONValue,
  segments: ReadonlyArray<string>,
  pointer: string,
): {
  readonly parent: JSONValue[] | Record<string, JSONValue>;
  readonly key: string;
  readonly parentPointer: string;
} {
  const parentSegments = segments.slice(0, -1);
  const parent = readAt(state, parentSegments);
  if (parent === null || typeof parent !== "object") {
    throw new IndependentError(
      "path_not_found",
      "parent is not a container",
      pointer,
    );
  }
  return {
    parent: parent as JSONValue[] | Record<string, JSONValue>,
    key: segments[segments.length - 1] as string,
    parentPointer: buildPointer(parentSegments),
  };
}

function readAt(
  state: JSONValue,
  segments: ReadonlyArray<string>,
): JSONValue {
  let current = state;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") {
      throw new IndependentError("path_not_found", "path is absent");
    }
    if (Array.isArray(current)) {
      const index = parseArrayIndex(segment);
      if (index === null || index >= current.length) {
        throw new IndependentError("path_not_found", "array index is absent");
      }
      current = current[index] as JSONValue;
    } else {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        throw new IndependentError("path_not_found", "object member is absent");
      }
      current = (
        current as Readonly<Record<string, JSONValue>>
      )[segment] as JSONValue;
    }
  }
  return current;
}

function parsePointer(pointer: string): string[] {
  if (pointer === "" || pointer === "#") return [];
  let body = pointer;
  if (pointer.startsWith("#")) {
    if (!pointer.startsWith("#/")) {
      throw new IndependentError("invalid_pointer", "invalid URI fragment", pointer);
    }
    try {
      body = `/${decodeURIComponent(pointer.slice(2))}`;
    } catch {
      throw new IndependentError("invalid_pointer", "invalid URI encoding", pointer);
    }
  }
  if (!body.startsWith("/")) {
    throw new IndependentError(
      "invalid_pointer",
      "JSON Pointer must start with '/'",
      pointer,
    );
  }
  return body.slice(1).split("/").map((segment) => {
    for (
      let index = segment.indexOf("~");
      index !== -1;
      index = segment.indexOf("~", index + 2)
    ) {
      const escaped = segment[index + 1];
      if (escaped !== "0" && escaped !== "1") {
        throw new IndependentError(
          "invalid_pointer",
          "invalid JSON Pointer escape",
          pointer,
        );
      }
    }
    return segment.replaceAll("~1", "/").replaceAll("~0", "~");
  });
}

function parseArrayIndex(segment: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(segment)) return null;
  const index = Number(segment);
  return Number.isSafeInteger(index) ? index : null;
}

function queryPointers(value: JSONValue, query: string): string[] {
  const tokens = parseQuery(query);
  let matches: Array<{ readonly value: JSONValue; readonly path: string }> = [
    { value, path: "" },
  ];
  for (const token of tokens) {
    const next: Array<{ readonly value: JSONValue; readonly path: string }> = [];
    for (const match of matches) {
      if (token === "*") {
        if (Array.isArray(match.value)) {
          for (let index = 0; index < match.value.length; index += 1) {
            next.push({
              value: match.value[index] as JSONValue,
              path: appendPointer(match.path, String(index)),
            });
          }
        } else if (isRecord(match.value)) {
          for (const key of Object.keys(match.value)) {
            next.push({
              value: match.value[key] as JSONValue,
              path: appendPointer(match.path, key),
            });
          }
        }
        continue;
      }
      if (Array.isArray(match.value)) {
        const index = parseArrayIndex(token);
        if (index !== null && index < match.value.length) {
          next.push({
            value: match.value[index] as JSONValue,
            path: appendPointer(match.path, token),
          });
        }
      } else if (
        isRecord(match.value)
        && Object.prototype.hasOwnProperty.call(match.value, token)
      ) {
        next.push({
          value: match.value[token] as JSONValue,
          path: appendPointer(match.path, token),
        });
      }
    }
    matches = next;
  }
  return matches.map((match) => match.path);
}

function parseQuery(query: string): string[] {
  if (query === "$") return [];
  if (!query.startsWith("$")) {
    throw new IndependentError("invalid_query", "JSONPath must start with '$'");
  }

  const tokens: string[] = [];
  let index = 1;
  while (index < query.length) {
    if (query[index] === ".") {
      const start = ++index;
      while (
        index < query.length
        && query[index] !== "."
        && query[index] !== "["
      ) {
        index += 1;
      }
      if (index === start) {
        throw new IndependentError("invalid_query", "empty member name");
      }
      tokens.push(query.slice(start, index));
      continue;
    }
    if (query[index] === "[") {
      const close = query.indexOf("]", index + 1);
      if (close === -1) {
        throw new IndependentError("invalid_query", "unclosed selector");
      }
      const selector = query.slice(index + 1, close);
      if (selector === "*") {
        tokens.push("*");
      } else if (/^(0|[1-9]\d*)$/.test(selector)) {
        tokens.push(selector);
      } else {
        const quoted = /^(["'])(.*)\1$/.exec(selector);
        if (quoted === null) {
          throw new IndependentError("invalid_query", "unsupported selector");
        }
        tokens.push(quoted[2] as string);
      }
      index = close + 1;
      continue;
    }
    throw new IndependentError("invalid_query", "unexpected JSONPath token");
  }
  return tokens;
}

function createChange(
  applied: ReadonlyArray<JSONPatchOperation>,
  metadata: JSONDocumentMetadata | undefined,
): JSONDocumentChange {
  const ownedApplied = freezeJSON(
    cloneJSON(applied) as unknown as JSONValue,
  ) as unknown as ReadonlyArray<JSONPatchOperation>;
  return Object.freeze(
    metadata === undefined
      ? { applied: ownedApplied }
      : { applied: ownedApplied, metadata },
  );
}

function cloneJSON(value: unknown, seen = new WeakSet<object>()): JSONValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new TypeError("non-finite number is not JSON");
  }
  if (typeof value !== "object") {
    throw new TypeError(`${typeof value} is not JSON`);
  }
  if (seen.has(value)) throw new TypeError("circular reference is not JSON");
  seen.add(value);

  if (Array.isArray(value)) {
    if (
      Object.getOwnPropertySymbols(value).length > 0
      || Object.getOwnPropertyNames(value).length !== value.length + 1
    ) {
      throw new TypeError("array has non-JSON properties");
    }
    const result: JSONValue[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined
        || !descriptor.enumerable
        || "get" in descriptor
        || "set" in descriptor
      ) {
        throw new TypeError("array is sparse or has accessors");
      }
      result.push(cloneJSON(descriptor.value, seen));
    }
    return result;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("non-plain object is not JSON");
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError("symbol keys are not JSON");
  }

  const result: Record<string, JSONValue> = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || "get" in descriptor
      || "set" in descriptor
    ) {
      throw new TypeError("object property is not JSON data");
    }
    defineJsonProperty(result, key, cloneJSON(descriptor.value, seen));
  }
  return result;
}

function freezeJSON<T extends JSONValue>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeJSON(child);
  }
  return Object.freeze(value);
}

function jsonEqual(left: JSONValue, right: JSONValue): boolean {
  if (left === right) return true;
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
    || Array.isArray(left) !== Array.isArray(right)
  ) {
    return false;
  }
  if (Array.isArray(left)) {
    return left.length === (right as ReadonlyArray<JSONValue>).length
      && left.every((value, index) => (
        jsonEqual(value, (right as ReadonlyArray<JSONValue>)[index] as JSONValue)
      ));
  }
  const leftKeys = Object.keys(left);
  const leftObject = left as Readonly<Record<string, JSONValue>>;
  const rightObject = right as Readonly<Record<string, JSONValue>>;
  return leftKeys.length === Object.keys(rightObject).length
    && leftKeys.every((key) => (
      Object.prototype.hasOwnProperty.call(rightObject, key)
      && jsonEqual(leftObject[key] as JSONValue, rightObject[key] as JSONValue)
    ));
}

function defineJsonProperty(
  target: Record<string, JSONValue>,
  key: string,
  value: JSONValue,
): void {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    target[key] = value;
  }
}

function buildPointer(segments: ReadonlyArray<string>): string {
  return segments.length === 0
    ? ""
    : `/${segments.map(escapePointerSegment).join("/")}`;
}

function appendPointer(pointer: string, segment: string): string {
  return `${pointer}/${escapePointerSegment(segment)}`;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPointerAncestor(ancestor: string, descendant: string): boolean {
  const ancestorSegments = parsePointer(ancestor);
  const descendantSegments = parsePointer(descendant);
  return ancestorSegments.length < descendantSegments.length
    && ancestorSegments.every((
      segment,
      index,
    ) => segment === descendantSegments[index]);
}

function isRecord(
  value: JSONValue | undefined,
): value is Readonly<Record<string, JSONValue>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
