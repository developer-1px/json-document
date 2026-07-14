// Headless low-level JSON state owner.

import type * as z from "zod";

import {
  applyOperation,
  applyPatch,
  applySingleTrustedValuePatchToTrustedState,
  applyPatchToTrustedState as applyPatchToTrustedStateCore,
  validatePatchOperations,
} from "../../../foundation/patch/index.js";
import { applyAcceptedPatch } from "../../../foundation/patch/index.js";
import type {
  JSONPatchOperation,
  JSONResult,
} from "../../../foundation/patch/index.js";
import { jsonSerializableError } from "../../../foundation/json/index.js";
import { handleResult, type ErrorPolicy } from "../../../foundation/error/index.js";
import { schemaOutputIsKnownJson } from "../../schema/model/schema.js";
import {
  applyPatchToTrustedState,
  applyPatchWithLocalSchemaValidation,
} from "../../schema/validation/patch.js";
import type {
  JSONStateOps,
} from "./ops.js";
import type { JSONChangeMetadata } from "../history/metadata.js";
import { createJSONStateOwnership } from "./ownership.js";

type JSONChangeListener = (
  applied: ReadonlyArray<JSONPatchOperation>,
  metadata?: JSONChangeMetadata,
) => void;

interface CreateJSONStateOptions extends ErrorPolicy {
  onChange?: () => void;
  trustedInitial?: boolean | undefined;
}

export interface TrustedJSONStateOps<T> extends JSONStateOps<T> {
  readonly snapshot: T;
  readonly revision: number;
  readonly stateJsonTrusted: boolean;
  sequenceForApplied(applied: ReadonlyArray<JSONPatchOperation>): number | undefined;
  executePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONStatePatchExecution<T>;
  previewPatch(operations: ReadonlyArray<JSONPatchOperation>): PreparedJSONStateChange<T>;
  previewOwnedPatch(operations: ReadonlyArray<JSONPatchOperation>): PreparedJSONStateChange<T>;
  previewTrustedValuesPatch(operations: ReadonlyArray<JSONPatchOperation>): PreparedJSONStateChange<T>;
  publishPreparedPatch(
    change: PreparedJSONStateChange<T>,
    metadata?: JSONChangeMetadata,
  ): PreparedJSONStatePublication<T> | { status: "stale" };
  applyTrustedPatch(operations: ReadonlyArray<JSONPatchOperation>, metadata?: JSONChangeMetadata): JSONResult;
  trustedApply(state: T, applied: ReadonlyArray<JSONPatchOperation>, metadata?: JSONChangeMetadata): JSONResult;
}

export interface PreparedJSONStateChange<T> {
  readonly baseRevision: number;
  readonly before: T;
  readonly state: T;
  readonly result: JSONResult;
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly valuesOwned: boolean;
}

export interface PreparedJSONStatePublication<T> {
  readonly status: "published";
  readonly sequence: number;
  readonly revision: number;
  readonly changed: boolean;
  readonly before: T;
  readonly state: T;
  readonly applied: ReadonlyArray<JSONPatchOperation>;
}

export interface JSONStatePatchExecution<T> {
  readonly result: JSONResult;
  readonly publication: PreparedJSONStatePublication<T> | null;
}

const ROOT_REPLACE = (value: unknown): JSONPatchOperation => ({ op: "replace", path: "", value });
const MAX_PREPARE_RETRIES = 8;
const STALE_PREPARED_CHANGE_MESSAGE = "state changed repeatedly while preparing the patch";

export function createJSONState<S extends z.ZodType>(
  schema: S,
  initial: z.input<S> | z.output<S>,
  options: CreateJSONStateOptions = {},
): TrustedJSONStateOps<z.output<S>> {
  const ownership = createJSONStateOwnership();
  const schemaOutputJsonTrusted = schemaOutputIsKnownJson(schema);
  let state: z.output<S>;
  if (options.trustedInitial === true) {
    state = initial as z.output<S>;
  } else {
    const parsed = schema.safeParse(initial);
    if (!parsed.success) throw parsed.error;
    state = parsed.data as z.output<S>;
  }
  const trustedFrozenRoot = options.trustedInitial === true
    && state !== null
    && typeof state === "object"
    && Object.isFrozen(state);
  const initialJsonError = schemaOutputJsonTrusted
    && (options.trustedInitial !== true || trustedFrozenRoot)
    ? null
    : jsonSerializableError(state);
  if (initialJsonError !== null) {
    throw new TypeError(`Initial document value is not JSON-serializable: ${initialJsonError}`);
  }
  if (options.trustedInitial === true) {
    state = ownership.ownTrustedInitial(state);
  } else {
    state = ownership.ownParsedState(state, !schemaOutputJsonTrusted);
  }
  let stateJsonTrusted = true;
  const initialState = state;
  const policy: ErrorPolicy = options;
  const listeners = new Set<JSONChangeListener>();
  const sequenceByApplied = new WeakMap<object, number>();
  let revision = 0;
  let publicationSequence = 0;

  const notify = (
    applied: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
    sequence = ++publicationSequence,
  ): void => {
    if (applied.length === 0) return;
    sequenceByApplied.set(applied as object, sequence);
    for (const listener of listeners) listener(applied, metadata);
    options.onChange?.();
  };

  const executePatch = (
    label: JSONPatchOperation | "patch",
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONStatePatchExecution<z.output<S>> => {
    for (let attempt = 0; attempt < MAX_PREPARE_RETRIES; attempt += 1) {
      const prepared = prepareOwnedPatch(operations);
      if (prepared.baseRevision !== revision || prepared.before !== state) continue;
      if (!prepared.result.ok) {
        return {
          result: handleResult(policy, label, prepared.result),
          publication: null,
        };
      }
      const publication = publishPreparedPatch(prepared, metadata);
      if (publication.status === "stale") continue;
      return { result: prepared.result, publication };
    }
    throw new Error(STALE_PREPARED_CHANGE_MESSAGE);
  };
  const dispatch = (
    label: JSONPatchOperation | "patch",
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult => executePatch(label, operations, metadata).result;
  const dispatchTrusted = (
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult => {
    const before = state;
    const applied = applyAcceptedPatch(before, operations);
    if (!applied.result.ok) return handleResult(policy, "patch", applied.result);
    if (applied.state === before) return applied.result;
    ownership.freeze(applied.applied);
    ownership.freezePatchResult(before, applied.state, applied.applied);
    stateJsonTrusted = stateJsonTrusted
      ? true
      : schemaOutputJsonTrusted || jsonSerializableError(applied.state) === null;
    state = applied.state;
    revision += 1;
    notify(applied.applied, metadata);
    return applied.result;
  };
  const applyTrustedState = (
    next: z.output<S>,
    applied: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult => {
    if (next === state) return { ok: true };
    ownership.freeze(applied);
    stateJsonTrusted = true;
    state = next;
    revision += 1;
    notify(applied, metadata);
    return { ok: true };
  };
  const preparePatchFrom = (
    from: z.output<S>,
    baseRevision: number,
    sourceJsonTrusted: boolean,
    operations: ReadonlyArray<JSONPatchOperation>,
    valuesTrusted: boolean,
    valuesOwned: boolean,
  ): PreparedJSONStateChange<z.output<S>> => {
    const applied = !sourceJsonTrusted
      ? applyPatch(schema, from, operations)
      : valuesTrusted
        ? applyPatchWithLocalSchemaValidation(schema, from, operations, { valuesTrusted: true })
          ?? applySingleTrustedValuePatchToTrustedState(schema, from, operations)
          ?? applyPatchToTrustedStateCore(schema, from, operations)
        : applyPatchToTrustedState(schema, from, operations);
    return {
      baseRevision,
      before: from,
      state: applied.state as z.output<S>,
      result: applied.result,
      applied: applied.applied,
      valuesOwned,
    };
  };
  const preparePatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedJSONStateChange<z.output<S>> => {
    const from = state;
    const baseRevision = revision;
    const sourceJsonTrusted = stateJsonTrusted;
    return preparePatchFrom(from, baseRevision, sourceJsonTrusted, operations, false, false);
  };
  const prepareOwnedPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedJSONStateChange<z.output<S>> => {
    if (!Array.isArray(operations) || validatePatchOperations(operations) !== null) {
      return preparePatch(operations);
    }
    const owned = ownership.ownPatch(operations);
    const from = state;
    const baseRevision = revision;
    const sourceJsonTrusted = stateJsonTrusted;
    return preparePatchFrom(
      from,
      baseRevision,
      sourceJsonTrusted,
      owned.operations,
      owned.valuesTrusted,
      owned.valuesTrusted,
    );
  };
  const prepareTrustedValuesPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedJSONStateChange<z.output<S>> => {
    if (!Array.isArray(operations) || validatePatchOperations(operations) !== null) {
      return preparePatch(operations);
    }
    const owned = ownership.ownPatch(operations, true);
    const from = state;
    const baseRevision = revision;
    const sourceJsonTrusted = stateJsonTrusted;
    return preparePatchFrom(from, baseRevision, sourceJsonTrusted, owned.operations, true, true);
  };
  const publishPreparedPatch = (
    prepared: PreparedJSONStateChange<z.output<S>>,
    metadata?: JSONChangeMetadata,
  ): PreparedJSONStatePublication<z.output<S>> | { status: "stale" } => {
    if (prepared.baseRevision !== revision || prepared.before !== state) return { status: "stale" };
    const sequence = ++publicationSequence;
    if (!prepared.result.ok || prepared.state === prepared.before) {
      const publication: PreparedJSONStatePublication<z.output<S>> = {
        status: "published",
        sequence,
        revision,
        changed: false,
        before: prepared.before,
        state: prepared.before,
        applied: [],
      };
      return publication;
    }
    let next = prepared.state;
    let applied = prepared.applied;
    if (!prepared.valuesOwned) {
      const owned = ownership.ownPatch(applied, true);
      const replayed = applyAcceptedPatch(prepared.before, owned.operations);
      if (!replayed.result.ok) throw new Error("prepared patch could not be replayed");
      next = replayed.state as z.output<S>;
      applied = replayed.applied;
    }
    ownership.freeze(applied);
    ownership.freezePatchResult(prepared.before, next, applied);
    stateJsonTrusted = true;
    state = next;
    revision += 1;
    const publication: PreparedJSONStatePublication<z.output<S>> = {
      status: "published",
      sequence,
      revision,
      changed: true,
      before: prepared.before,
      state: next,
      applied,
    };
    notify(applied, metadata, sequence);
    return publication;
  };

  const single = (operation: JSONPatchOperation): JSONResult => dispatch(operation, [operation]);

  const replaceRoot = (label: "load" | "reset", value: unknown): JSONResult => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return handleResult(policy, label, {
        ok: false,
        code: "schema_violation",
        reason: JSON.stringify(parsed.error.issues),
      });
    }
    const next = parsed.data as z.output<S>;
    const nextJsonError = schemaOutputJsonTrusted ? null : jsonSerializableError(next);
    if (nextJsonError !== null) {
      return handleResult(policy, label, {
        ok: false,
        code: "not_serializable",
        reason: nextJsonError,
      });
    }
    state = ownership.ownParsedState(next, !schemaOutputJsonTrusted);
    stateJsonTrusted = true;
    revision += 1;
    notify(ownership.ownPatch([ROOT_REPLACE(state)]).operations);
    return { ok: true };
  };

  const restoreInitial = (): JSONResult => {
    state = initialState;
    stateJsonTrusted = true;
    revision += 1;
    notify(ownership.ownPatch([ROOT_REPLACE(state)]).operations);
    return { ok: true };
  };

  const ops: TrustedJSONStateOps<z.output<S>> = {
    add(path, value) {
      return single({ op: "add", path, value });
    },
    remove(path) {
      return single({ op: "remove", path });
    },
    replace(path, value) {
      return single({ op: "replace", path, value });
    },
    move(from, path) {
      return single({ op: "move", from, path });
    },
    copy(from, path) {
      return single({ op: "copy", from, path });
    },
    test(path, value) {
      const op: JSONPatchOperation = { op: "test", path, value };
      const result = applyOperation(schema, state, op);
      return handleResult(policy, op, result.result);
    },
    patch: (operations, metadata) => dispatch("patch", operations, metadata),
    executePatch: (operations, metadata) => executePatch("patch", operations, metadata),
    previewPatch: preparePatch,
    previewOwnedPatch: prepareOwnedPatch,
    previewTrustedValuesPatch: prepareTrustedValuesPatch,
    publishPreparedPatch,
    applyTrustedPatch: (operations, metadata) => dispatchTrusted(operations, metadata),
    trustedApply: (next, applied, metadata) => applyTrustedState(next, applied, metadata),
    load: (value) => replaceRoot("load", value),
    reset: (value) => value === undefined ? restoreInitial() : replaceRoot("reset", value),
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get state() { return state; },
    get snapshot() { return ownership.freeze(state); },
    get revision() { return revision; },
    get stateJsonTrusted() { return stateJsonTrusted; },
    sequenceForApplied: (applied) => sequenceByApplied.get(applied as object),
  };
  return ops;
}
