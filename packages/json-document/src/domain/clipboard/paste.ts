// verbs/paste — Clipboard 기둥. payload + target/mode → RFC 6902 add patch.
// (schema, state, payload, target, mode) → { next, patch }.

import type * as z from "zod";
import type { ApplyResult, JSONPatchOperation } from "../../foundation/patch/index.js";
import { appendSegment, buildPointer, readAt, tryParsePointer, type Pointer } from "../../foundation/pointer/index.js";
import { patchPreflight, patchPreflightFromApplyResult, type PatchPreflightErrorCode } from "../schema/mutation/patch.js";
import { getDiscriminatedUnionInfo, schemaAtPointer } from "../schema/inspection/introspection.js";
import { tryRekeyPayload } from "../schema/mutation/rekey.js";
import type { RekeyOptions } from "../schema/mutation/rekey.js";
import { getDef, getObjectShape } from "../schema/inspection/zod.js";

type PasteMode = "at" | "before" | "after" | "into" | "replace";
export type PasteTarget =
  | Pointer
  | { into: Pointer }
  | { before: Pointer }
  | { after: Pointer }
  | { replace: Pointer };

interface PasteOk<T> {
  ok: true;
  next: T;
  patch: JSONPatchOperation[];
  applied: ReadonlyArray<JSONPatchOperation>;
}

export interface PasteError {
  ok: false;
  code: "empty_selection" | "not_serializable" | "rekey_failed" | PatchPreflightErrorCode;
  reason: string;
  violations?: ReadonlyArray<{ path: string; message: string }>;
}

export interface PasteDiscriminatorMismatch {
  ok: false;
  code: "discriminator_mismatch";
  reason: string;
  source: { discriminator: string; value: unknown };
  expected: { discriminator: string; allowed: unknown[] };
}

interface PastePayloadOptions {
  rekey?: RekeyOptions;
  /** Array payload 를 array target 에 여러 add op 로 펼친다. Multi-source clipboard paste 에 사용. */
  spread?: boolean;
  /** Skip JSON-serializability validation when the caller already owns that boundary. */
  trustedPayload?: boolean;
}

export interface PasteOptions extends PastePayloadOptions {}

export function rekeyProducesTrustedPayload(options: PasteOptions): boolean {
  return options.rekey !== undefined && options.rekey.fields.length > 0;
}

interface PasteExecutionOptions extends PastePayloadOptions {
  previewPatch?: ((operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<z.ZodTypeAny>) | undefined;
}

interface ResolvedPasteArgs {
  target?: Pointer;
  mode: PasteMode;
  options: PastePayloadOptions;
}

interface LiteralField {
  key: string;
  allowed: unknown[];
}

export function resolvePasteArgs(
  target?: PasteTarget,
  options: PasteOptions = {},
): ResolvedPasteArgs {
  if (typeof target === "object" && target !== null) {
    if ("into" in target) return { target: target.into, mode: "into", options };
    if ("before" in target) return { target: target.before, mode: "before", options };
    if ("after" in target) return { target: target.after, mode: "after", options };
    if ("replace" in target) return { target: target.replace, mode: "replace", options };
    return { mode: "at", options };
  }
  return {
    ...(target !== undefined ? { target } : {}),
    mode: "at",
    options,
  };
}

export function paste<S extends z.ZodType>(
  schema: S,
  state: z.output<S>,
  payload: unknown,
  target: Pointer,
  mode: PasteMode = "into",
  options: PasteExecutionOptions = {},
): PasteOk<z.output<S>> | PasteError | PasteDiscriminatorMismatch {
  const rekeyed = tryRekeyPayload(payload, state, options.rekey, {
    trustedPayload: options.trustedPayload,
  });
  if (!rekeyed.ok) return rekeyed;
  const nextPayload = rekeyed.payload;
  const placement = resolvePastePlacement(state, target, mode);
  if (!placement.ok) return placement;

  const spread = shouldSpread(nextPayload, state, placement.path, mode, options);
  const mismatch = findPasteMismatch(schema, nextPayload, placement.path, mode, spread);
  if (mismatch) return mismatch;

  const patch = spread ? buildSpreadPasteOps(nextPayload, placement.path) : [buildPasteOp(nextPayload, placement.path, mode)];
  const r = options.previewPatch
    ? patchPreflightFromApplyResult(options.previewPatch(patch))
    : patchPreflight(schema, state, patch);
  if (!r.ok) {
    return pasteError(r.code, r.message, r.violations);
  }
  return { ok: true, next: r.draft as z.output<S>, patch, applied: r.applied };
}

function findPasteMismatch<S extends z.ZodType>(
  schema: S,
  payload: unknown,
  target: Pointer,
  mode: PasteMode,
  spread: boolean,
): PasteDiscriminatorMismatch | null {
  const targetSchema = schemaAtPointer(schema, target, mode === "replace" ? "value" : "insert");
  if (!targetSchema) return null;

  const checkPayload = createPayloadMismatchCapabilityer(targetSchema);
  if (!spread) return checkPayload(payload);
  if (!Array.isArray(payload)) return null;
  for (const item of payload) {
    const mismatch = checkPayload(item);
    if (mismatch) return mismatch;
  }
  return null;
}

function createPayloadMismatchCapabilityer(targetSchema: z.ZodType): (payload: unknown) => PasteDiscriminatorMismatch | null {
  const info = getDiscriminatedUnionInfo(targetSchema);
  if (info) {
    return (payload) => {
      if (!isRecord(payload)) return null;
      const value = payload[info.discriminator];
      if (info.allowed.some((allowed) => Object.is(allowed, value))) return null;

      const reason = `${String(value)} cannot be pasted where ${info.allowed.map(String).join(" | ")} is expected`;
      return {
        ok: false,
        code: "discriminator_mismatch",
        reason,
        source: { discriminator: info.discriminator, value },
        expected: { discriminator: info.discriminator, allowed: info.allowed },
      };
    };
  }

  const literalFields = objectLiteralFields(targetSchema);
  if (literalFields.length === 0) return () => null;
  return (payload) => {
    if (!isRecord(payload)) return null;
    return findLiteralMismatch(payload, literalFields);
  };
}

function objectLiteralFields(targetSchema: z.ZodType): LiteralField[] {
  const shape = getObjectShape(targetSchema);
  if (shape === null) return [];

  const fields: LiteralField[] = [];
  for (const key of Object.keys(shape)) {
    const valueSchema = shape[key];
    if (valueSchema === undefined) continue;
    const def = getDef(valueSchema);
    if (Array.isArray(def.values) && def.values.length > 0) {
      fields.push({ key, allowed: def.values });
    }
  }
  return fields;
}

function findLiteralMismatch(
  payload: Record<string, unknown>,
  literalFields: ReadonlyArray<LiteralField>,
): PasteDiscriminatorMismatch | null {
  for (const { key, allowed } of literalFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;

    const value = payload[key];
    if (allowed.some((allowedValue) => Object.is(allowedValue, value))) return null;
    const reason = `${String(value)} cannot be pasted where ${allowed.map(String).join(" | ")} is expected`;
    return {
      ok: false,
      code: "discriminator_mismatch",
      reason,
      source: { discriminator: key, value },
      expected: { discriminator: key, allowed },
    };
  }
  return null;
}

function pasteError(
  code: PasteError["code"],
  reason: string,
  violations?: PasteError["violations"],
): PasteError {
  return violations === undefined
    ? { ok: false, code, reason }
    : { ok: false, code, reason, violations };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildPasteOp(payload: unknown, target: Pointer, mode: PasteMode): JSONPatchOperation {
  return mode === "replace"
    ? { op: "replace", path: target, value: payload }
    : { op: "add", path: target, value: payload };
}

function shouldSpread(
  payload: unknown,
  state: unknown,
  target: Pointer,
  mode: PasteMode,
  options: PastePayloadOptions,
): payload is unknown[] {
  return options.spread === true
    && mode !== "replace"
    && Array.isArray(payload)
    && isArrayInsertionPath(state, target);
}

function buildSpreadPasteOps(payload: ReadonlyArray<unknown>, path: Pointer): JSONPatchOperation[] {
  const ops = new Array<JSONPatchOperation>(payload.length);
  if (path.endsWith("/-")) {
    for (let index = 0; index < payload.length; index += 1) {
      ops[index] = { op: "add", path, value: payload[index] };
    }
    return ops;
  }

  const numericTarget = trailingDecimalPath(path);
  if (numericTarget) {
    const prefix = numericTarget.prefix;
    const start = numericTarget.index;
    for (let index = 0; index < payload.length; index += 1) {
      ops[index] = { op: "add", path: prefix + String(start + index), value: payload[index] };
    }
    return ops;
  }

  for (let index = 0; index < payload.length; index += 1) {
    ops[index] = { op: "add", path, value: payload[index] };
  }
  return ops;
}

function isArrayInsertionPath(state: unknown, path: Pointer): boolean {
  const segments = tryParsePointer(path);
  if (segments === null || segments.length === 0) return false;

  const segment = segments[segments.length - 1]!;
  if (!isArrayInsertionSegment(segment)) return false;

  const parent = readAt(state, segments.slice(0, -1));
  return parent.ok && Array.isArray(parent.value);
}

function trailingDecimalPath(path: Pointer): { prefix: string; index: number } | null {
  const slash = path.lastIndexOf("/");
  if (slash < 0 || slash === path.length - 1) return null;
  for (let index = slash + 1; index < path.length; index += 1) {
    const code = path.charCodeAt(index);
    if (code < 48 || code > 57) return null;
  }
  return {
    prefix: path.slice(0, slash + 1),
    index: Number(path.slice(slash + 1)),
  };
}

function isArrayInsertionSegment(segment: string): boolean {
  if (segment === "-") return true;
  if (segment.length === 0) return false;
  const first = segment.charCodeAt(0);
  if (first === 48) return segment.length === 1;
  if (first < 49 || first > 57) return false;
  for (let index = 1; index < segment.length; index += 1) {
    const code = segment.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function resolvePastePlacement(
  state: unknown,
  target: Pointer,
  mode: PasteMode,
): { ok: true; path: Pointer } | PasteError {
  switch (mode) {
    case "replace":
    case "at":
      return { ok: true, path: target };
    case "into":
      return resolveIntoArrayTarget(state, target);
    case "before":
      return resolveRelativeInsertTarget(target, "before");
    case "after":
      return resolveRelativeInsertTarget(target, "after");
  }
}

function resolveIntoArrayTarget(
  state: unknown,
  target: Pointer,
): { ok: true; path: Pointer } | PasteError {
  const segments = tryParsePointer(target);
  if (segments === null) return pasteError("invalid_pointer", `invalid into target pointer: ${target}`);
  const container = readAt(state, segments);
  // 구문은 맞지만 대상이 없음 → path_not_found. 존재하나 배열이 아님은 별개(타입 불일치).
  if (!container.ok) return pasteError("path_not_found", `into target not found: ${target}`);
  if (!Array.isArray(container.value)) {
    return pasteError("invalid_pointer", `into target must address an array container: ${target}`);
  }
  return { ok: true, path: appendSegment(target, "-") };
}

function resolveRelativeInsertTarget(
  target: Pointer,
  position: "before" | "after",
): { ok: true; path: Pointer } | PasteError {
  const location = arrayItemLocation(target);
  if (location === null) {
    return pasteError("invalid_pointer", `relative insert target must address an array item: ${target}`);
  }
  return {
    ok: true,
    path: appendSegment(location.parent, position === "before" ? location.index : location.index + 1),
  };
}

function arrayItemLocation(pointer: Pointer): { parent: Pointer; index: number } | null {
  const segments = tryParsePointer(pointer);
  if (segments === null || segments.length === 0) return null;
  const indexSegment = segments[segments.length - 1]!;
  if (!isArrayInsertionSegment(indexSegment) || indexSegment === "-") return null;
  return {
    parent: buildPointer(segments.slice(0, -1)),
    index: Number(indexSegment),
  };
}
