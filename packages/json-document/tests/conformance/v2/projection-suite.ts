import { describe, expect, test } from "vitest";

import rawVectors from "./projection-vectors.json" with { type: "json" };

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

export type ProjectionAcceptance = "json" | "task-list";
export type ProjectionMetadata = Readonly<Record<string, JSONValue>>;

export interface ProjectionChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: ProjectionMetadata;
}

export interface ProjectionCommitOptions {
  readonly metadata?: ProjectionMetadata;
}

export interface ProjectionSuccessResult {
  readonly ok: true;
}

export interface ProjectionFailureResult {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}

export type ProjectionCapabilityResult =
  | ProjectionSuccessResult
  | ProjectionFailureResult;

export type ProjectionReadResult =
  | { readonly ok: true; readonly path: string; readonly value: JSONValue }
  | ProjectionFailureResult;

export type ProjectionQueryResult =
  | {
      readonly ok: true;
      readonly query: string;
      readonly pointers: ReadonlyArray<string>;
    }
  | ProjectionFailureResult;

export type ProjectionCommitResult =
  | (ProjectionSuccessResult & { readonly change: ProjectionChange })
  | ProjectionFailureResult;

export interface Projection {
  readonly value: JSONValue;
  at(pointer: string): ProjectionReadResult;
  query(jsonPath: string): ProjectionQueryResult;
  canPatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): ProjectionCapabilityResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: ProjectionCommitOptions,
  ): ProjectionCommitResult;
  subscribe(listener: (change: ProjectionChange) => void): () => void;
}

export interface ProjectionHarness {
  create(
    acceptance: ProjectionAcceptance,
    initial: JSONValue,
  ): Projection;
}

type ExpectedObject = Readonly<Record<string, unknown>>;

interface VectorBase {
  readonly id: string;
  readonly requirements: ReadonlyArray<string>;
}

interface SurfaceVector extends VectorBase {
  readonly kind: "surface";
  readonly members: ReadonlyArray<string>;
}

interface ReadVector extends VectorBase {
  readonly kind: "read";
  readonly at: ReadonlyArray<{
    readonly pointer: string;
    readonly expect: ExpectedObject;
  }>;
  readonly query: ReadonlyArray<{
    readonly jsonPath: string;
    readonly expect: ExpectedObject;
  }>;
}

interface CommitVector extends VectorBase {
  readonly kind: "commit";
  readonly acceptance?: ProjectionAcceptance;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: ProjectionMetadata;
  readonly expect: {
    readonly probe: ExpectedObject;
    readonly commit: ExpectedObject;
    readonly value: JSONValue;
    readonly notifications: ReadonlyArray<ExpectedObject>;
  };
}

interface UnsubscribeVector extends VectorBase {
  readonly kind: "unsubscribe";
  readonly commits: ReadonlyArray<{
    readonly operations: ReadonlyArray<JSONPatchOperation>;
    readonly metadata?: ProjectionMetadata;
    readonly expect: ExpectedObject;
  }>;
  readonly unsubscribeAfter: number;
  readonly expect: {
    readonly value: JSONValue;
    readonly notifications: ReadonlyArray<ExpectedObject>;
  };
}

interface MutationAttempt {
  readonly pointer: string;
  readonly value: JSONValue;
}

interface IsolationVector extends VectorBase {
  readonly kind: "isolation";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata: ProjectionMetadata;
  readonly nextOperations: ReadonlyArray<JSONPatchOperation>;
  readonly mutations: {
    readonly initial: MutationAttempt;
    readonly operations: MutationAttempt;
    readonly metadata: MutationAttempt;
    readonly snapshot: MutationAttempt;
    readonly read: MutationAttempt;
    readonly change: MutationAttempt;
  };
  readonly readPointer: string;
  readonly expect: {
    readonly previousSnapshot: JSONValue;
    readonly afterFirst: JSONValue;
    readonly afterSecond: JSONValue;
    readonly firstChange: ExpectedObject;
    readonly notificationCount: number;
  };
}

interface NonJSONVector extends VectorBase {
  readonly kind: "non-json";
  readonly path: string;
  readonly hostValue: "callable";
  readonly expect: {
    readonly probe: ExpectedObject;
    readonly commit: ExpectedObject;
    readonly value: JSONValue;
    readonly notifications: ReadonlyArray<ExpectedObject>;
  };
}

type ProjectionVector =
  | SurfaceVector
  | ReadVector
  | CommitVector
  | UnsubscribeVector
  | IsolationVector
  | NonJSONVector;

interface ProjectionManifest {
  readonly initial: JSONValue;
  readonly vectors: ReadonlyArray<ProjectionVector>;
}

interface Observation {
  readonly changes: ProjectionChange[];
  readonly values: JSONValue[];
  readonly unsubscribe: () => void;
}

const manifest = rawVectors as unknown as ProjectionManifest;

function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectRequired(actual: unknown, expected: ExpectedObject): void {
  expect(actual).toMatchObject(expected);
}

function observe(projection: Projection): Observation {
  const changes: ProjectionChange[] = [];
  const values: JSONValue[] = [];
  const unsubscribe = projection.subscribe((change) => {
    changes.push(change);
    values.push(cloneJSON(projection.value));
  });
  return { changes, values, unsubscribe };
}

function expectNotifications(
  actual: ReadonlyArray<ProjectionChange>,
  expected: ReadonlyArray<ExpectedObject>,
): void {
  expect(actual).toHaveLength(expected.length);
  for (const [index, expectedChange] of expected.entries()) {
    expectRequired(actual[index], expectedChange);
  }
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
    // A binding may isolate by copying or by freezing. Both satisfy this probe
    // when the following observable-state assertions remain unchanged.
  }
}

function runSurfaceVector(
  harness: ProjectionHarness,
  vector: SurfaceVector,
): void {
  const projection = harness.create("json", cloneJSON(manifest.initial));
  const surface = projection as unknown as Record<string, unknown>;
  for (const member of vector.members) {
    expect(member in surface).toBe(true);
    if (member !== "value") expect(typeof surface[member]).toBe("function");
  }
}

function runReadVector(
  harness: ProjectionHarness,
  vector: ReadVector,
): void {
  const projection = harness.create("json", cloneJSON(manifest.initial));
  const before = cloneJSON(projection.value);
  const observation = observe(projection);
  for (const row of vector.at) {
    expectRequired(projection.at(row.pointer), row.expect);
  }
  for (const row of vector.query) {
    expectRequired(projection.query(row.jsonPath), row.expect);
  }
  expect(projection.value).toEqual(before);
  expect(observation.changes).toEqual([]);
}

function runCommitVector(
  harness: ProjectionHarness,
  vector: CommitVector,
): void {
  const projection = harness.create(
    vector.acceptance ?? "json",
    cloneJSON(manifest.initial),
  );
  const observation = observe(projection);
  const beforeProbe = cloneJSON(projection.value);
  const operations = cloneJSON(vector.operations);
  const probe = projection.canPatch(operations);
  expectRequired(probe, vector.expect.probe);
  expect(projection.value).toEqual(beforeProbe);
  expect(observation.changes).toEqual([]);

  const commit = projection.commit(
    operations,
    vector.metadata === undefined
      ? undefined
      : { metadata: cloneJSON(vector.metadata) },
  );
  expectRequired(commit, vector.expect.commit);
  expect(projection.value).toEqual(vector.expect.value);
  expectNotifications(observation.changes, vector.expect.notifications);
  for (const observedValue of observation.values) {
    expect(observedValue).toEqual(vector.expect.value);
  }
  if (!probe.ok && !commit.ok) expect(commit.code).toBe(probe.code);
}

function runUnsubscribeVector(
  harness: ProjectionHarness,
  vector: UnsubscribeVector,
): void {
  const projection = harness.create("json", cloneJSON(manifest.initial));
  const observation = observe(projection);
  for (const [index, row] of vector.commits.entries()) {
    const result = projection.commit(
      cloneJSON(row.operations),
      row.metadata === undefined
        ? undefined
        : { metadata: cloneJSON(row.metadata) },
    );
    expectRequired(result, row.expect);
    if (index === vector.unsubscribeAfter) observation.unsubscribe();
  }
  expect(projection.value).toEqual(vector.expect.value);
  expectNotifications(observation.changes, vector.expect.notifications);
}

function runIsolationVector(
  harness: ProjectionHarness,
  vector: IsolationVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const projection = harness.create("json", initial);
  const previousSnapshot = projection.value;
  attemptMutation(initial, vector.mutations.initial);
  expect(projection.value).toEqual(vector.expect.previousSnapshot);

  const operations = cloneJSON(vector.operations);
  const metadata = cloneJSON(vector.metadata);
  const observation = observe(projection);
  const first = projection.commit(operations, { metadata });
  expectRequired(first, { ok: true });
  expect(projection.value).toEqual(vector.expect.afterFirst);
  expectNotifications(observation.changes, [vector.expect.firstChange]);

  const read = projection.at(vector.readPointer);
  expectRequired(read, { ok: true, path: vector.readPointer });
  attemptMutation(operations, vector.mutations.operations);
  attemptMutation(metadata, vector.mutations.metadata);
  attemptMutation(previousSnapshot, vector.mutations.snapshot);
  if (read.ok) attemptMutation(read.value, vector.mutations.read);
  attemptMutation(observation.changes[0], vector.mutations.change);

  expect(projection.value).toEqual(vector.expect.afterFirst);
  expect(previousSnapshot).toEqual(vector.expect.previousSnapshot);
  expectRequired(observation.changes[0], vector.expect.firstChange);

  const second = projection.commit(cloneJSON(vector.nextOperations));
  expectRequired(second, { ok: true });
  expect(projection.value).toEqual(vector.expect.afterSecond);
  expect(previousSnapshot).toEqual(vector.expect.previousSnapshot);
  expectRequired(observation.changes[0], vector.expect.firstChange);
  expect(observation.changes).toHaveLength(vector.expect.notificationCount);
}

function runNonJSONVector(
  harness: ProjectionHarness,
  vector: NonJSONVector,
): void {
  const projection = harness.create("json", cloneJSON(manifest.initial));
  const observation = observe(projection);
  const hostValue = vector.hostValue === "callable"
    ? () => undefined
    : undefined;
  const operations = [{
    op: "add",
    path: vector.path,
    value: hostValue,
  }] as unknown as ReadonlyArray<JSONPatchOperation>;

  const probe = projection.canPatch(operations);
  expectRequired(probe, vector.expect.probe);
  const commit = projection.commit(operations);
  expectRequired(commit, vector.expect.commit);
  if (!probe.ok && !commit.ok) expect(commit.code).toBe(probe.code);
  expect(projection.value).toEqual(vector.expect.value);
  expectNotifications(observation.changes, vector.expect.notifications);
}

function runVector(
  harness: ProjectionHarness,
  vector: ProjectionVector,
): void {
  switch (vector.kind) {
    case "surface":
      runSurfaceVector(harness, vector);
      return;
    case "read":
      runReadVector(harness, vector);
      return;
    case "commit":
      runCommitVector(harness, vector);
      return;
    case "unsubscribe":
      runUnsubscribeVector(harness, vector);
      return;
    case "isolation":
      runIsolationVector(harness, vector);
      return;
    case "non-json":
      runNonJSONVector(harness, vector);
  }
}

export function runProjectionConformance(
  harness: ProjectionHarness,
): void {
  describe("json-document v2 Projection black-box conformance", () => {
    for (const vector of manifest.vectors) {
      test(`[${vector.id}]`, () => runVector(harness, vector));
    }
  });
}
