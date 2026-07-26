import { describe, expect, test } from "vitest";

import rawVectors from "./protocol-vectors.json" with { type: "json" };

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JSONValue>
  | { readonly [key: string]: JSONValue };

export type JSONPatchOperation =
  | { readonly op: "add"; readonly path: string; readonly value: JSONValue }
  | { readonly op: "remove"; readonly path: string }
  | { readonly op: "replace"; readonly path: string; readonly value: JSONValue }
  | { readonly op: "move"; readonly from: string; readonly path: string }
  | { readonly op: "copy"; readonly from: string; readonly path: string }
  | { readonly op: "test"; readonly path: string; readonly value: JSONValue };

export interface ProtocolChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
}

export type ProtocolPatchResult =
  | {
      readonly ok: true;
      readonly value: JSONValue;
      readonly change: ProtocolChange;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: string;
    };

export interface ProtocolHarness {
  applyPatch(
    value: JSONValue,
    operations: ReadonlyArray<JSONPatchOperation>,
  ): ProtocolPatchResult;
}

type ExpectedObject = Readonly<Record<string, unknown>>;

interface MutationAttempt {
  readonly pointer: string;
  readonly value: JSONValue;
}

interface VectorBase {
  readonly id: string;
  readonly requirements: ReadonlyArray<string>;
  readonly expect: ExpectedObject;
}

interface PatchVector extends VectorBase {
  readonly kind: "patch";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
}

interface ExtraFieldsVector extends VectorBase {
  readonly kind: "extra-fields";
  readonly operations: ReadonlyArray<
    JSONPatchOperation & Readonly<Record<string, JSONValue>>
  >;
  readonly absentFields: ReadonlyArray<string>;
}

interface NonJSONStateVector extends VectorBase {
  readonly kind: "non-json-state";
  readonly property: string;
  readonly hostValue: "callable";
}

interface NonJSONPayloadVector extends VectorBase {
  readonly kind: "non-json-payload";
  readonly operation: {
    readonly op: "add" | "replace" | "test";
    readonly path: string;
  };
  readonly hostValue: "callable";
}

interface PrecedenceVector extends VectorBase {
  readonly kind: "precedence";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly laterOperation: {
    readonly op: "add" | "replace" | "test";
    readonly path: string;
  };
  readonly hostValue: "callable";
}

interface IsolationVector extends VectorBase {
  readonly kind: "isolation";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly mutations: {
    readonly input: MutationAttempt;
    readonly operations: MutationAttempt;
    readonly resultValue: MutationAttempt;
    readonly resultChange: MutationAttempt;
  };
}

type ProtocolVector =
  | PatchVector
  | ExtraFieldsVector
  | NonJSONStateVector
  | NonJSONPayloadVector
  | PrecedenceVector
  | IsolationVector;

interface ProtocolManifest {
  readonly initial: JSONValue;
  readonly vectors: ReadonlyArray<ProtocolVector>;
}

const manifest = rawVectors as unknown as ProtocolManifest;

function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectRequired(actual: unknown, expected: ExpectedObject): void {
  expect(actual).toMatchObject(expected);
}

function attemptMutation(
  target: unknown,
  mutation: MutationAttempt,
): void {
  try {
    const segments = mutation.pointer === ""
      ? []
      : mutation.pointer.slice(1).split("/").map((segment) => (
          segment.replaceAll("~1", "/").replaceAll("~0", "~")
        ));
    if (segments.length === 0) return;
    let parent: unknown = target;
    for (const segment of segments.slice(0, -1)) {
      if (parent === null || typeof parent !== "object") return;
      parent = Reflect.get(parent, segment);
    }
    if (parent === null || typeof parent !== "object") return;
    Reflect.set(parent, segments.at(-1) as string, cloneJSON(mutation.value));
  } catch {
    // Copying and freezing are both valid isolation strategies.
  }
}

function expectInputsUnchanged(
  initial: JSONValue,
  beforeInitial: JSONValue,
  operations: ReadonlyArray<JSONPatchOperation>,
  beforeOperations: ReadonlyArray<JSONPatchOperation>,
): void {
  expect(initial).toEqual(beforeInitial);
  expect(operations).toEqual(beforeOperations);
}

function runPatchVector(
  harness: ProtocolHarness,
  vector: PatchVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const operations = cloneJSON(vector.operations);
  const beforeInitial = cloneJSON(initial);
  const beforeOperations = cloneJSON(operations);

  const result = harness.applyPatch(initial, operations);

  expectRequired(result, vector.expect);
  expectInputsUnchanged(
    initial,
    beforeInitial,
    operations,
    beforeOperations,
  );
}

function runExtraFieldsVector(
  harness: ProtocolHarness,
  vector: ExtraFieldsVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const operations = cloneJSON(vector.operations);
  const beforeInitial = cloneJSON(initial);
  const beforeOperations = cloneJSON(operations);

  const result = harness.applyPatch(initial, operations);

  expectRequired(result, vector.expect);
  expectInputsUnchanged(
    initial,
    beforeInitial,
    operations,
    beforeOperations,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const applied = result.change.applied[0];
  expect(applied).toBeDefined();
  for (const field of vector.absentFields) {
    expect(
      Object.prototype.hasOwnProperty.call(applied, field),
      `canonical operation must omit ${field}`,
    ).toBe(false);
  }
}

function runNonJSONStateVector(
  harness: ProtocolHarness,
  vector: NonJSONStateVector,
): void {
  const initial = cloneJSON(manifest.initial) as unknown as Record<string, unknown>;
  initial[vector.property] = () => undefined;
  const result = harness.applyPatch(
    initial as unknown as JSONValue,
    [],
  );

  expectRequired(result, vector.expect);
  expect(typeof initial[vector.property]).toBe("function");
  expectFailureIsStable(result, vector.expect);
}

function runNonJSONPayloadVector(
  harness: ProtocolHarness,
  vector: NonJSONPayloadVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const beforeInitial = cloneJSON(initial);
  const operations = [{
    op: vector.operation.op,
    path: vector.operation.path,
    value: () => undefined,
  }] as unknown as ReadonlyArray<JSONPatchOperation>;

  const result = harness.applyPatch(initial, operations);

  expectRequired(result, vector.expect);
  expect(initial).toEqual(beforeInitial);
  expectFailureIsStable(result, vector.expect);
}

function runPrecedenceVector(
  harness: ProtocolHarness,
  vector: PrecedenceVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const beforeInitial = cloneJSON(initial);
  const operations = [
    ...cloneJSON(vector.operations),
    {
      op: vector.laterOperation.op,
      path: vector.laterOperation.path,
      value: () => undefined,
    },
  ] as unknown as ReadonlyArray<JSONPatchOperation>;

  const result = harness.applyPatch(initial, operations);

  expectRequired(result, vector.expect);
  expect(initial).toEqual(beforeInitial);
  expectFailureIsStable(result, vector.expect);
}

function expectFailureIsStable(
  result: ProtocolPatchResult,
  expected: ExpectedObject,
): void {
  if (result.ok) return;
  try {
    Reflect.set(result, "code", "outside");
  } catch {
    // Frozen failures satisfy the same observable contract.
  }
  expectRequired(result, expected);
}

function runIsolationVector(
  harness: ProtocolHarness,
  vector: IsolationVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const operations = cloneJSON(vector.operations);
  const beforeInitial = cloneJSON(initial);
  const beforeOperations = cloneJSON(operations);
  const result = harness.applyPatch(initial, operations);

  expectRequired(result, vector.expect);
  expectInputsUnchanged(
    initial,
    beforeInitial,
    operations,
    beforeOperations,
  );
  if (!result.ok) return;

  const expectedResult = cloneJSON(result);
  attemptMutation(initial, vector.mutations.input);
  attemptMutation(operations, vector.mutations.operations);
  expect(result).toEqual(expectedResult);

  const externalInitial = cloneJSON(initial);
  const externalOperations = cloneJSON(operations);
  attemptMutation(result.value, vector.mutations.resultValue);
  attemptMutation(result.change, vector.mutations.resultChange);

  expect(result).toEqual(expectedResult);
  expect(initial).toEqual(externalInitial);
  expect(operations).toEqual(externalOperations);
}

function runVector(
  harness: ProtocolHarness,
  vector: ProtocolVector,
): void {
  switch (vector.kind) {
    case "patch":
      runPatchVector(harness, vector);
      return;
    case "extra-fields":
      runExtraFieldsVector(harness, vector);
      return;
    case "non-json-state":
      runNonJSONStateVector(harness, vector);
      return;
    case "non-json-payload":
      runNonJSONPayloadVector(harness, vector);
      return;
    case "precedence":
      runPrecedenceVector(harness, vector);
      return;
    case "isolation":
      runIsolationVector(harness, vector);
  }
}

export function runProtocolConformance(
  harness: ProtocolHarness,
): void {
  describe("json-document v2 pure Protocol black-box conformance", () => {
    for (const vector of manifest.vectors) {
      test(`[${vector.id}]`, () => runVector(harness, vector));
    }
  });
}
