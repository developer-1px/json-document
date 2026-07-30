import { jsonSerializableError } from "../json/serializable.js";
import { applyOpRaw, validateOperationPointers, validateOperationShape } from "./apply.js";
import { normalizeAppliedOp, normalizeOp } from "./container.js";
import { validatedStrategies, applyFastPatchStrategies, trustedStrategies } from "./fast/apply.js";
import { fail, ok } from "./result.js";
import { applyTrustedValueMutation } from "./value.js";
import type {
  JSONPatchOperation,
  TrustedApplyResult,
  TrustedPatchOptions,
} from "./contract.js";

export function applyTrustedPatch<T>(
  state: T,
  ops: ReadonlyArray<JSONPatchOperation>,
  options: TrustedPatchOptions = {},
): TrustedApplyResult<T> {
  if (!Array.isArray(ops)) return { state, result: fail("invalid_pointer", "patch must be an array"), applied: [] };
  const valuesTrusted = options.valuesTrusted === true;
  const singleValueFast = applySingleTrustedValuePatch(state, ops, valuesTrusted);
  if (singleValueFast !== null) return singleValueFast as TrustedApplyResult<T>;

  const fast = applyFastPatchStrategies(state, ops, trustedStrategies, valuesTrusted);
  if (fast !== null) return { state: fast.state as T, result: ok, applied: fast.applied };

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
  return { state: cur as T, result: ok, applied: normalized };
}

export function applyValidatedPatch<T>(
  state: T,
  ops: ReadonlyArray<JSONPatchOperation>,
): TrustedApplyResult<T> {
  if (!Array.isArray(ops)) return { state, result: fail("invalid_pointer", "patch must be an array"), applied: [] };

  if (ops.length === 1 && 0 in ops) {
    const single = applyValidatedSingleTrustedValuePatch(state, ops[0]!);
    if (single !== null) return single as TrustedApplyResult<T>;
  }

  const fast = applyFastPatchStrategies(state, ops, validatedStrategies, true);
  if (fast !== null) return { state: fast.state as T, result: ok, applied: fast.applied };

  return applyTrustedPatch(state, ops, { valuesTrusted: true });
}

function applySingleTrustedValuePatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
): TrustedApplyResult<unknown> | null {
  if (ops.length !== 1 || !(0 in ops)) return null;
  const op = ops[0]!;
  if (op === null || typeof op !== "object" || (op.op !== "add" && op.op !== "replace") || typeof op.path !== "string" || !("value" in op)) {
    return null;
  }

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
  if (!valuesTrusted && jsonSerializableError(op.value) !== null) return null;

  const normalized = op.op === "add" && op.path.endsWith("/-") ? normalizeOp(op, state) : op;
  if (normalized.op !== "add" && normalized.op !== "replace") return null;

  const applied = applyTrustedValueMutation(state, normalized);
  if ("error" in applied) {
    return { state, result: fail(applied.error, applied.reason ? `op[0]: ${applied.reason}` : "op[0]", applied.pointer), applied: [] };
  }

  return { state: applied.state, result: ok, applied: [normalized] };
}

function applyValidatedSingleTrustedValuePatch(
  state: unknown,
  op: JSONPatchOperation,
): TrustedApplyResult<unknown> | null {
  if (op === null || typeof op !== "object" || (op.op !== "add" && op.op !== "replace") || typeof op.path !== "string" || !("value" in op)) {
    return null;
  }
  const pointerError = validateOperationPointers(op);
  if (pointerError) {
    return {
      state,
      result: fail(pointerError.error, `op[0]: ${pointerError.reason}`, pointerError.pointer),
      applied: [],
    };
  }
  const normalized = op.op === "add" && op.path.endsWith("/-") ? normalizeOp(op, state) : op;
  if (normalized.op !== "add" && normalized.op !== "replace") return null;
  const applied = applyTrustedValueMutation(state, normalized);
  if ("error" in applied) {
    return { state, result: fail(applied.error, applied.reason ? `op[0]: ${applied.reason}` : "op[0]", applied.pointer), applied: [] };
  }
  return { state: applied.state, result: ok, applied: [normalized] };
}
