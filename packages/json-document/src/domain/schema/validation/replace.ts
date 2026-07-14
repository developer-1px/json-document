import type * as z from "zod";
import type { ApplyResult, JSONPatchOperation } from "../../../foundation/patch/index.js";
import {
  applyAcceptedPatch,
  applyTrustedPatch,
  numericSegment,
  validateOperationShape,
} from "../../../foundation/patch/index.js";
import {
  readAt,
  tryParsePointer,
  type Pointer,
} from "../../../foundation/pointer/index.js";
import { acceptsKnownJsonValue } from "../model/knownJson.js";
import { failedLocalSchemaValidation, okLocalSchemaValidation } from "../model/result.js";
import { cachedSchemaAtPointer, isPlainStructuralSchema } from "../model/schema.js";
import {
  evaluateLocalSchemaValidationValueValidationPlans,
  planLocalSchemaValidationValueValidation,
  type LocalSchemaValidationValueValidationPlan,
} from "../model/value.js";
import { getDef, getObjectShape } from "../inspection/zod.js";

type ReplaceOperation = Extract<JSONPatchOperation, { op: "replace" }>;

export type ReplacePatchAttempt<S extends z.ZodType> =
  | { kind: "notApplicable" }
  | { kind: "requiresFullValidation" }
  | { kind: "operationFailure" }
  | { kind: "handled"; result: ApplyResult<S> };

interface ReplaceValidationTarget {
  path: Pointer;
  segments: string[];
  order: number;
  value: unknown;
  readFromState: boolean;
}

interface ReplaceTargetTrieNode {
  children: Map<string, ReplaceTargetTrieNode>;
  target?: ReplaceValidationTarget;
}

interface ReplaceBatchPlan {
  inputs: ReplaceValidationTarget[];
  targets: ReplaceValidationTarget[];
  overlapping: boolean;
  legacyValidationMode: "first" | "aggregate" | null;
}

type ReplaceBatchPlanResult =
  | { kind: "notApplicable" }
  | { kind: "requiresFullValidation" }
  | { kind: "planned"; plan: ReplaceBatchPlan };

export function applyFinalStateReplacePatchWithLocalSchemaValidation<S extends z.ZodType>(
  schema: S,
  state: z.output<S>,
  operations: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
): ReplacePatchAttempt<S> {
  const planned = planReplaceBatch(schema, state, operations);
  if (planned.kind !== "planned") return planned;

  if (planned.plan.legacyValidationMode === "first") {
    for (const target of planned.plan.inputs) {
      const legacyPlans = planFinalReplaceValidations(schema, state, [target], valuesTrusted);
      if (legacyPlans === null) {
        return planned.plan.inputs.some((input) => input.segments.includes("-"))
          ? { kind: "notApplicable" }
          : { kind: "requiresFullValidation" };
      }
      const failure = evaluateLocalSchemaValidationValueValidationPlans(state, legacyPlans);
      if (failure) return { kind: "handled", result: failure };
    }
  } else if (planned.plan.legacyValidationMode === "aggregate") {
    const legacyPlans = planFinalReplaceValidations(
      schema,
      state,
      planned.plan.inputs,
      valuesTrusted,
    );
    if (legacyPlans === null) return { kind: "requiresFullValidation" };
    const failure = evaluateLocalSchemaValidationValueValidationPlans(state, legacyPlans);
    if (failure) return { kind: "handled", result: failure };
  }

  const applied = valuesTrusted
    ? applyAcceptedPatch(state, operations)
    : applyTrustedPatch(state, operations);
  if (!applied.result.ok) {
    return planned.plan.overlapping
      ? { kind: "operationFailure" }
      : { kind: "handled", result: failedLocalSchemaValidation(state, applied.result) };
  }

  if (planned.plan.legacyValidationMode !== null) {
    return {
      kind: "handled",
      result: okLocalSchemaValidation(applied.state as z.output<S>, applied.applied),
    };
  }

  const plans = planFinalReplaceValidations(schema, applied.state, planned.plan.targets, valuesTrusted);
  if (plans === null) return { kind: "requiresFullValidation" };

  const failure = evaluateLocalSchemaValidationValueValidationPlans(state, plans);
  if (failure && planned.plan.overlapping && !isPlainStructuralSchema(schema)) {
    return { kind: "requiresFullValidation" };
  }
  return failure
    ? { kind: "handled", result: failure }
    : {
        kind: "handled",
        result: okLocalSchemaValidation(applied.state as z.output<S>, applied.applied),
      };
}

export function applySingleReplacePatchWithLocalSchemaValidation<S extends z.ZodType>(
  schema: S,
  state: z.output<S>,
  operations: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
): ApplyResult<S> | null {
  const operation = singleReplaceOperation(operations);
  if (operation === null) return null;
  const valueSchema = cachedSchemaAtPointer(schema, operation.path, "value");
  if (valueSchema === null) return null;

  const plan = planLocalSchemaValidationValueValidation({
    path: operation.path,
    schema: valueSchema,
    value: operation.value,
    knownJsonAccepted: acceptsKnownJsonValue(valueSchema, operation.value),
    valuesTrusted,
  });
  const failure = evaluateLocalSchemaValidationValueValidationPlans(state, [plan]);
  if (failure) return failure;

  const applied = applyAcceptedPatch(state, [operation]);
  return applied.result.ok
    ? okLocalSchemaValidation(applied.state as z.output<S>, applied.applied)
    : failedLocalSchemaValidation(state, applied.result);
}

function isReplaceBatchCandidate(operations: ReadonlyArray<JSONPatchOperation>): boolean {
  if (!Array.isArray(operations) || operations.length < 2) return false;
  for (let index = 0; index < operations.length; index += 1) {
    if (!(index in operations)) return false;
    const operation = operations[index];
    if (operation === null || typeof operation !== "object" || operation.op !== "replace") return false;
  }
  return true;
}

function planReplaceBatch(
  schema: z.ZodType,
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
): ReplaceBatchPlanResult {
  if (!isReplaceBatchCandidate(operations)) return { kind: "notApplicable" };

  const candidates = new Array<ReplaceValidationTarget>(operations.length);
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index]!;
    if (
      validateOperationShape(operation) !== null
      || operation.op !== "replace"
      || typeof operation.path !== "string"
    ) {
      return { kind: "requiresFullValidation" };
    }
    const segments = tryParsePointer(operation.path);
    if (segments === null) {
      return { kind: "requiresFullValidation" };
    }
    candidates[index] = {
      path: operation.path,
      segments,
      order: index,
      value: operation.value,
      readFromState: false,
    };
  }

  const legacyValidationMode = legacyReplaceValidationMode(schema, state, operations, candidates);
  if (
    legacyValidationMode === null
    && candidates.some((candidate) => candidate.segments.includes("-"))
  ) {
    // `-` is an ordinary object key but an invalid replace index for arrays.
    // Keep ambiguous batches on the established sequential/full-validation
    // fallback because its failure ordering is part of the public contract.
    return { kind: "notApplicable" };
  }
  let targets = candidates;
  let overlapping = false;
  if (legacyValidationMode === null && !haveUniqueCanonicalPathsAtSameDepth(candidates)) {
    const root: ReplaceTargetTrieNode = { children: new Map() };
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      overlapping = addFinalTargetFromRight(root, candidates[index]!) || overlapping;
    }
    targets = collectReplaceTargets(root);
    targets.sort((left, right) => left.order - right.order);
  }
  return {
    kind: "planned",
    plan: {
      inputs: candidates,
      targets,
      overlapping,
      legacyValidationMode,
    },
  };
}

function haveUniqueCanonicalPathsAtSameDepth(
  candidates: ReadonlyArray<ReplaceValidationTarget>,
): boolean {
  const depth = candidates[0]!.segments.length;
  const paths = new Set<Pointer>();
  for (const candidate of candidates) {
    if (
      candidate.path[0] !== "/"
      || candidate.segments.length !== depth
      || paths.has(candidate.path)
    ) {
      return false;
    }
    paths.add(candidate.path);
  }
  return true;
}

function singleReplaceOperation(
  operations: ReadonlyArray<JSONPatchOperation>,
): ReplaceOperation | null {
  if (!Array.isArray(operations) || operations.length !== 1 || !(0 in operations)) return null;
  const operation = operations[0]!;
  return validateOperationShape(operation) === null
    && operation.op === "replace"
    && typeof operation.path === "string"
    && operation.path !== ""
    ? operation
    : null;
}

function addFinalTargetFromRight(
  root: ReplaceTargetTrieNode,
  candidate: ReplaceValidationTarget,
): boolean {
  let node = root;
  for (const segment of candidate.segments) {
    if (node.target) return true;
    let child = node.children.get(segment);
    if (!child) {
      child = { children: new Map() };
      node.children.set(segment, child);
    }
    node = child;
  }

  if (node.target) {
    node.target.order = candidate.order;
    return true;
  }
  const overlapping = node.children.size > 0;
  candidate.readFromState = overlapping;
  node.children.clear();
  node.target = candidate;
  return overlapping;
}

function collectReplaceTargets(root: ReplaceTargetTrieNode): ReplaceValidationTarget[] {
  const targets: ReplaceValidationTarget[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.target) targets.push(node.target);
    for (const child of node.children.values()) pending.push(child);
  }
  return targets;
}

function planFinalReplaceValidations(
  schema: z.ZodType,
  state: unknown,
  targets: ReadonlyArray<ReplaceValidationTarget>,
  valuesTrusted: boolean,
): LocalSchemaValidationValueValidationPlan[] | null {
  const plans: LocalSchemaValidationValueValidationPlan[] = [];
  for (const target of targets) {
    const valueSchema = cachedSchemaAtPointer(schema, target.path, "value");
    if (valueSchema === null) return null;
    let value = target.value;
    if (target.readFromState) {
      const read = readAt(state, target.segments);
      if (!read.ok) return null;
      value = read.value;
    }
    plans.push(planLocalSchemaValidationValueValidation({
      path: target.path,
      schema: valueSchema,
      value,
      knownJsonAccepted: acceptsKnownJsonValue(valueSchema, value),
      valuesTrusted,
    }));
  }
  return plans;
}

function isFlatRootReplaceBatch(
  schema: z.ZodType,
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
): boolean {
  const def = getDef(schema);
  if (getObjectShape(schema) === null && (def.type !== "record" || !def.valueType)) return false;
  return state === null
    || typeof state !== "object"
    || Array.isArray(state)
    ? false
    : operations.every((operation) => operation.op === "replace"
      && operation.path.length > 1
      && operation.path[0] === "/"
      && !operation.path.includes("~")
      && operation.path.indexOf("/", 1) === -1
      && Object.prototype.hasOwnProperty.call(state, operation.path.slice(1)));
}

function legacyReplaceValidationMode(
  schema: z.ZodType,
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
  candidates: ReadonlyArray<ReplaceValidationTarget>,
): "first" | "aggregate" | null {
  if (!isPlainStructuralSchema(schema)) return null;
  if (isFlatRootReplaceBatch(schema, state, operations)) return "first";
  return isSameArrayValueBatch(state, candidates) ? "aggregate" : null;
}

function isSameArrayValueBatch(
  state: unknown,
  candidates: ReadonlyArray<ReplaceValidationTarget>,
): boolean {
  const reference = candidates[0]!.segments;
  if (isSameArrayFieldBatch(state, candidates, reference)) return true;
  if (reference.length < 3) return false;

  for (let indexPosition = 0; indexPosition < reference.length - 1; indexPosition += 1) {
    if (numericSegment(reference[indexPosition]!) === null) continue;
    const parent = readAt(state, reference.slice(0, indexPosition));
    if (!parent.ok || !Array.isArray(parent.value)) continue;
    const array = parent.value;
    return candidates.every((candidate) => {
      if (candidate.segments.length !== reference.length) return false;
      const index = numericSegment(candidate.segments[indexPosition]!);
      return index !== null
        && index < array.length
        && segmentsMatchExcept(candidate.segments, reference, indexPosition);
    });
  }
  return false;
}

function isSameArrayFieldBatch(
  state: unknown,
  candidates: ReadonlyArray<ReplaceValidationTarget>,
  reference: ReadonlyArray<string>,
): boolean {
  const indexPosition = reference.length - 2;
  if (indexPosition < 0 || numericSegment(reference[indexPosition]!) === null) return false;
  const parent = readAt(state, reference.slice(0, indexPosition));
  if (!parent.ok || !Array.isArray(parent.value)) return false;
  const array = parent.value;
  const field = reference[indexPosition + 1]!;

  return candidates.every((candidate) => {
    if (candidate.segments.length !== reference.length) return false;
    const index = numericSegment(candidate.segments[indexPosition]!);
    if (
      index === null
      || !segmentsMatchExcept(candidate.segments, reference, indexPosition)
    ) {
      return false;
    }
    const row = array[index];
    return row !== null
      && typeof row === "object"
      && !Array.isArray(row)
      && Object.prototype.hasOwnProperty.call(row, field);
  });
}

function segmentsMatchExcept(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
  except: number,
): boolean {
  for (let index = 0; index < left.length; index += 1) {
    if (index !== except && left[index] !== right[index]) return false;
  }
  return true;
}
