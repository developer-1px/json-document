import type * as z from "zod";
import { cloneJsonSerializable } from "../json/clone.js";
import { jsonSerializableError } from "../json/serializable.js";
import {
  applyOpRaw,
  validateOperationPointers,
  validateOperationShape,
  validatePatchOperations,
} from "./apply.js";
import { normalizeAppliedOp, normalizeOp } from "./container.js";
import { applyFastPatchStrategies, publicTrustedStateStrategies } from "./fast/apply.js";
import { fail, ok } from "./result.js";
import { applyTrustedValueMutation } from "./value.js";
import type { JSONPatchOperation } from "./contract.js";
import type { ApplyResult } from "./schema-contract.js";

const zodIssuesReason = (error: z.ZodError): string => JSON.stringify(error.issues);

export function applyOperation<S extends z.ZodTypeAny>(
  schema: S,
  state: z.output<S>,
  op: JSONPatchOperation,
): ApplyResult<S> {
  const stateJsonErr = jsonSerializableError(state);
  if (stateJsonErr) return { state, result: fail("not_serializable", stateJsonErr), applied: [] };
  const shape = validateOperationShape(op);
  if (shape) return { state, result: fail(shape.error, shape.reason), applied: [] };
  const pointerError = validateOperationPointers(op);
  if (pointerError) {
    return { state, result: fail(pointerError.error, pointerError.reason, pointerError.pointer), applied: [] };
  }
  const normalized = normalizeOp(op, state);
  const r = applyOpRaw(state, normalized);
  if ("error" in r) return { state, result: fail(r.error, r.reason, r.pointer), applied: [] };
  const appliedOp = normalizeAppliedOp(normalized, r.state);
  if (normalized.op === "test") return { state, result: ok, applied: [appliedOp] };
  const parsed = safeParseIsolated(schema, r.state);
  if (!parsed.success) return { state, result: fail("schema_violation", zodIssuesReason(parsed.error)), applied: [] };
  return { state: r.state as z.output<S>, result: ok, applied: [appliedOp] };
}

export function applyPatch<S extends z.ZodTypeAny>(
  schema: S,
  state: z.output<S>,
  ops: ReadonlyArray<JSONPatchOperation>,
): ApplyResult<S> {
  const stateJsonErr = jsonSerializableError(state);
  if (stateJsonErr) return { state, result: fail("not_serializable", stateJsonErr), applied: [] };
  return applyPatchToTrustedState(schema, state, ops);
}

export function applyPatchToTrustedState<S extends z.ZodTypeAny>(
  schema: S,
  state: z.output<S>,
  ops: ReadonlyArray<JSONPatchOperation>,
): ApplyResult<S> {
  if (!Array.isArray(ops)) return { state, result: fail("invalid_pointer", "patch must be an array"), applied: [] };
  const validation = validatePatchOperations(ops);
  if (validation === null) {
    const fast = applyFastPatchStrategies(state, ops, publicTrustedStateStrategies, false);
    if (fast !== null) {
      const parsed = safeParseIsolated(schema, fast.state);
      if (!parsed.success) return { state, result: fail("schema_violation", zodIssuesReason(parsed.error)), applied: [] };
      return { state: fast.state as z.output<S>, result: ok, applied: fast.applied };
    }
  }

  let cur: unknown = state;
  const normalized: JSONPatchOperation[] = [];
  for (let i = 0; i < ops.length; i++) {
    if (!(i in ops)) return { state, result: fail("invalid_pointer", `op[${i}]: op must be object`), applied: [] };
    const shape = validateOperationShape(ops[i]!);
    if (shape) return { state, result: fail(shape.error, `op[${i}]: ${shape.reason}`), applied: [] };
    const pointerError = validateOperationPointers(ops[i]!);
    if (pointerError) {
      return {
        state,
        result: fail(
          pointerError.error,
          `op[${i}]: ${pointerError.reason}`,
          pointerError.pointer,
        ),
        applied: [],
      };
    }
    const n = normalizeOp(ops[i]!, cur);
    const r = applyOpRaw(cur, n);
    if ("error" in r) {
      return { state, result: fail(r.error, r.reason ? `op[${i}]: ${r.reason}` : `op[${i}]`, r.pointer), applied: [] };
    }
    normalized.push(normalizeAppliedOp(n, r.state));
    cur = r.state;
  }
  const parsed = safeParseIsolated(schema, cur);
  if (!parsed.success) return { state, result: fail("schema_violation", zodIssuesReason(parsed.error)), applied: [] };
  return { state: cur as z.output<S>, result: ok, applied: normalized };
}

export function applySingleTrustedValuePatchToTrustedState<S extends z.ZodTypeAny>(
  schema: S,
  state: z.output<S>,
  ops: ReadonlyArray<JSONPatchOperation>,
): ApplyResult<S> | null {
  if (!Array.isArray(ops) || ops.length !== 1 || !(0 in ops)) return null;

  const op = ops[0]!;
  if (op === null || typeof op !== "object") return null;
  if (op.op !== "add" && op.op !== "replace") return null;

  const shape = validateOperationShape(op);
  if (shape) return { state, result: fail(shape.error, `op[0]: ${shape.reason}`), applied: [] };
  const pointerError = validateOperationPointers(op);
  if (pointerError) {
    return {
      state,
      result: fail(pointerError.error, `op[0]: ${pointerError.reason}`, pointerError.pointer),
      applied: [],
    };
  }

  const normalized = normalizeOp(op, state);
  if (normalized.op !== "add" && normalized.op !== "replace") return null;

  const applied = applyTrustedValueMutation(state, normalized);
  if ("error" in applied) {
    return { state, result: fail(applied.error, applied.reason ? `op[0]: ${applied.reason}` : "op[0]", applied.pointer), applied: [] };
  }

  const parsed = safeParseIsolated(schema, applied.state);
  if (!parsed.success) return { state, result: fail("schema_violation", zodIssuesReason(parsed.error)), applied: [] };
  return { state: applied.state as z.output<S>, result: ok, applied: [normalized] };
}

function safeParseIsolated<S extends z.ZodTypeAny>(schema: S, value: unknown) {
  const cloned = cloneJsonSerializable(value);
  return schema.safeParse(cloned.ok ? cloned.value : value);
}
