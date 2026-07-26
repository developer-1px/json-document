import type * as z from "zod";
import type { ApplyResult, JSONPatchOperation } from "../../../foundation/patch/index.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import {
  cloneJsonSerializable,
  cloneTrustedPlainJson,
} from "../../../foundation/json/index.js";
import { appendArrayIndexPath } from "../../../foundation/patch/index.js";
import { operationFailure, schemaViolation } from "./result.js";
import { prefixIssues } from "./schema.js";

export interface PlanLocalSchemaValidationValueValidationInput {
  path: Pointer;
  schema: z.ZodType;
  value: unknown;
  knownJsonAccepted: boolean;
  valuesTrusted: boolean;
}

export type LocalSchemaValidationValueValidationPlan =
  | { kind: "accepted" }
  | { kind: "parse"; path: Pointer; schema: z.ZodType; value: unknown }
  | { kind: "notSerializable"; reason: string };

export interface AppliedValueValidationOperation {
  path: Pointer;
  value: unknown;
}

export interface AppliedAddValueValidationOperation extends AppliedValueValidationOperation {
  op: "add";
}

export interface AppliedReplaceValueValidationOperation extends AppliedValueValidationOperation {
  op: "replace";
}

export interface IndexedReplaceValueValidationOperation extends AppliedReplaceValueValidationOperation {
  index: number;
}

export interface AppliedRemoveOperation {
  op: "remove";
  path: Pointer;
}

export function planLocalSchemaValidationValueValidation(
  input: PlanLocalSchemaValidationValueValidationInput,
): LocalSchemaValidationValueValidationPlan {
  if (input.knownJsonAccepted) return { kind: "accepted" };
  let value: unknown;
  if (input.valuesTrusted) {
    value = cloneTrustedPlainJson(input.value);
  } else {
    const cloned = cloneJsonSerializable(input.value);
    if (!cloned.ok) return { kind: "notSerializable", reason: cloned.reason };
    value = cloned.value;
  }
  return { kind: "parse", path: input.path, schema: input.schema, value };
}

export function evaluateLocalSchemaValidationValueValidationPlan<S extends z.ZodType>(
  state: z.output<S>,
  plan: LocalSchemaValidationValueValidationPlan,
): ApplyResult<S> | null {
  return evaluateLocalSchemaValidationValueValidationPlans(state, [plan]);
}

export function evaluateLocalSchemaValidationValueValidationPlans<S extends z.ZodType>(
  state: z.output<S>,
  plans: ReadonlyArray<LocalSchemaValidationValueValidationPlan>,
): ApplyResult<S> | null {
  const issues: z.ZodError["issues"] = [];
  for (const plan of plans) {
    if (plan.kind === "notSerializable") {
      return operationFailure(state, "not_serializable", plan.reason);
    }
    if (plan.kind !== "parse") continue;
    const result = plan.schema.safeParse(plan.value);
    if (!result.success) issues.push(...prefixIssues(plan.path, result.error.issues));
  }
  return issues.length === 0 ? null : schemaViolation(state, "", issues);
}

export function planArrayAddAppliedOperations(input: {
  parent: Pointer;
  start: number;
  values: ReadonlyArray<unknown>;
}): AppliedAddValueValidationOperation[] {
  const applied = new Array<AppliedAddValueValidationOperation>(input.values.length);
  for (let index = 0; index < input.values.length; index += 1) {
    applied[index] = { op: "add", path: appendArrayIndexPath(input.parent, input.start + index), value: input.values[index] };
  }
  return applied;
}

export function toAppliedAddOperations(
  operations: ReadonlyArray<AppliedAddValueValidationOperation>,
): Extract<JSONPatchOperation, { op: "add" }>[] {
  return operations.map((op) => ({ op: "add", path: op.path, value: op.value }));
}

export function toAppliedReplaceOperations(
  operations: ReadonlyArray<AppliedReplaceValueValidationOperation>,
): Extract<JSONPatchOperation, { op: "replace" }>[] {
  return operations.map((op) => ({ op: "replace", path: op.path, value: op.value }));
}

export function toAppliedRemoveOperations(
  operations: ReadonlyArray<AppliedRemoveOperation>,
): Extract<JSONPatchOperation, { op: "remove" }>[] {
  return operations.map((op) => ({ op: "remove", path: op.path }));
}

export function evaluateAppliedValueValidationPlan<
  S extends z.ZodType,
  Operation extends AppliedValueValidationOperation = AppliedValueValidationOperation,
>(input: {
  state: z.output<S>;
  operations: ReadonlyArray<Operation>;
  schema: z.ZodType;
  knownJsonAccepted: (value: unknown) => boolean;
  valuesTrusted: boolean;
}): ApplyResult<S> | null {
  const plans: LocalSchemaValidationValueValidationPlan[] = [];
  for (const op of input.operations) {
    plans.push(planLocalSchemaValidationValueValidation({
      path: op.path,
      schema: input.schema,
      value: op.value,
      knownJsonAccepted: input.knownJsonAccepted(op.value),
      valuesTrusted: input.valuesTrusted,
    }));
  }
  return evaluateLocalSchemaValidationValueValidationPlans(input.state, plans);
}

export function evaluateAppliedAddValueValidationPlan<S extends z.ZodType>(
  state: z.output<S>,
  operations: ReadonlyArray<AppliedAddValueValidationOperation>,
  schema: z.ZodType,
  knownJsonAccepted: (value: unknown) => boolean,
  valuesTrusted: boolean,
): ApplyResult<S> | null {
  return evaluateAppliedValueValidationPlan({ state, operations, schema, knownJsonAccepted, valuesTrusted });
}

export function evaluateAppliedReplaceValueValidationPlan<S extends z.ZodType>(
  state: z.output<S>,
  operations: ReadonlyArray<AppliedReplaceValueValidationOperation>,
  schema: z.ZodType,
  knownJsonAccepted: (value: unknown) => boolean,
  valuesTrusted: boolean,
): ApplyResult<S> | null {
  return evaluateAppliedValueValidationPlan({ state, operations, schema, knownJsonAccepted, valuesTrusted });
}
