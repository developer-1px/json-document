// Headless low-level JSON state owner.

import type * as z from "zod";

import {
  applyOperation,
  applyPatch,
  applySingleTrustedValuePatchToTrustedState,
  applyPatchToTrustedState as applyPatchToTrustedStateCore,
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

type JSONChangeListener = (
  applied: ReadonlyArray<JSONPatchOperation>,
  metadata?: JSONChangeMetadata,
) => void;

interface CreateJSONStateOptions extends ErrorPolicy {
  onChange?: () => void;
  trustedInitial?: boolean | undefined;
}

export interface TrustedJSONStateOps<T> extends JSONStateOps<T> {
  readonly lastApplied: ReadonlyArray<JSONPatchOperation>;
  readonly revision: number;
  readonly stateJsonTrusted: boolean;
  previewPatch(operations: ReadonlyArray<JSONPatchOperation>): PreparedJSONStateChange<T>;
  previewTrustedValuesPatch(operations: ReadonlyArray<JSONPatchOperation>): PreparedJSONStateChange<T>;
  publishPreparedPatch(
    change: PreparedJSONStateChange<T>,
    metadata?: JSONChangeMetadata,
  ): PreparedJSONStatePublication | { status: "stale" };
  applyTrustedPatch(operations: ReadonlyArray<JSONPatchOperation>, metadata?: JSONChangeMetadata): JSONResult;
  trustedApply(state: T, applied: ReadonlyArray<JSONPatchOperation>, metadata?: JSONChangeMetadata): JSONResult;
}

export interface PreparedJSONStateChange<T> {
  readonly baseRevision: number;
  readonly before: T;
  readonly state: T;
  readonly result: JSONResult;
  readonly applied: ReadonlyArray<JSONPatchOperation>;
}

export interface PreparedJSONStatePublication {
  readonly status: "published";
  readonly revision: number;
  readonly changed: boolean;
}

const ROOT_REPLACE = (value: unknown): JSONPatchOperation => ({ op: "replace", path: "", value });
const MAX_PREPARE_RETRIES = 8;
const STALE_PREPARED_CHANGE_MESSAGE = "state changed repeatedly while preparing the patch";

export function createJSONState<S extends z.ZodType>(
  schema: S,
  initial: z.input<S> | z.output<S>,
  options: CreateJSONStateOptions = {},
): TrustedJSONStateOps<z.output<S>> {
  const schemaOutputJsonTrusted = schemaOutputIsKnownJson(schema);
  let state: z.output<S>;
  if (options.trustedInitial === true) {
    state = initial as z.output<S>;
  } else {
    const parsed = schema.safeParse(initial);
    if (!parsed.success) throw parsed.error;
    state = parsed.data as z.output<S>;
  }
  let stateJsonTrusted = schemaOutputJsonTrusted || jsonSerializableError(state) === null;
  const initialState = state;
  const policy: ErrorPolicy = options;
  const listeners = new Set<JSONChangeListener>();
  let lastApplied: ReadonlyArray<JSONPatchOperation> = [];
  let revision = 0;

  const notify = (
    applied: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): void => {
    if (applied.length === 0) return;
    lastApplied = applied;
    options.onChange?.();
    for (const listener of listeners) listener(applied, metadata);
  };

  const dispatch = (
    label: JSONPatchOperation | "patch",
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult => {
    for (let attempt = 0; attempt < MAX_PREPARE_RETRIES; attempt += 1) {
      const prepared = preparePatch(operations);
      if (prepared.baseRevision !== revision || prepared.before !== state) continue;
      if (!prepared.result.ok) return handleResult(policy, label, prepared.result);
      const publication = publishPreparedPatch(prepared, metadata);
      if (publication.status === "stale") continue;
      return prepared.result;
    }
    throw new Error(STALE_PREPARED_CHANGE_MESSAGE);
  };
  const dispatchTrusted = (
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult => {
    const before = state;
    const applied = applyAcceptedPatch(before, operations);
    if (!applied.result.ok) return handleResult(policy, "patch", applied.result);
    if (applied.state === before) return applied.result;
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
    };
  };
  const preparePatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedJSONStateChange<z.output<S>> => {
    const from = state;
    const baseRevision = revision;
    const sourceJsonTrusted = stateJsonTrusted;
    return preparePatchFrom(from, baseRevision, sourceJsonTrusted, operations, false);
  };
  const prepareTrustedValuesPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedJSONStateChange<z.output<S>> => {
    const from = state;
    const baseRevision = revision;
    const sourceJsonTrusted = stateJsonTrusted;
    return preparePatchFrom(from, baseRevision, sourceJsonTrusted, operations, true);
  };
  const publishPreparedPatch = (
    prepared: PreparedJSONStateChange<z.output<S>>,
    metadata?: JSONChangeMetadata,
  ): PreparedJSONStatePublication | { status: "stale" } => {
    if (prepared.baseRevision !== revision || prepared.before !== state) return { status: "stale" };
    if (!prepared.result.ok || prepared.state === prepared.before) {
      const publication: PreparedJSONStatePublication = {
        status: "published",
        revision,
        changed: false,
      };
      return publication;
    }
    stateJsonTrusted = true;
    state = prepared.state;
    revision += 1;
    const publication: PreparedJSONStatePublication = {
      status: "published",
      revision,
      changed: true,
    };
    notify(prepared.applied, metadata);
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
    state = parsed.data as z.output<S>;
    stateJsonTrusted = schemaOutputJsonTrusted || jsonSerializableError(state) === null;
    revision += 1;
    notify([ROOT_REPLACE(state)]);
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
    previewPatch: preparePatch,
    previewTrustedValuesPatch: prepareTrustedValuesPatch,
    publishPreparedPatch,
    applyTrustedPatch: (operations, metadata) => dispatchTrusted(operations, metadata),
    trustedApply: (next, applied, metadata) => applyTrustedState(next, applied, metadata),
    load: (value) => replaceRoot("load", value),
    reset: (value) => replaceRoot("reset", value ?? initialState),
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get state() { return state; },
    get lastApplied() { return lastApplied; },
    get revision() { return revision; },
    get stateJsonTrusted() { return stateJsonTrusted; },
  };
  return ops;
}
