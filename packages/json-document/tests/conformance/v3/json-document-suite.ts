import { describe, expect, test } from "vitest";

import rawVectors from "./json-document-vectors.json" with { type: "json" };

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

export type JSONDocumentValidation =
  | "json"
  | "task-list"
  | "attempt-transform";
export type JSONDocumentMetadata = Readonly<Record<string, JSONValue>>;

export interface JSONDocumentChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONDocumentMetadata;
}

export interface JSONDocumentCommitOptions {
  readonly metadata?: JSONDocumentMetadata;
}

export interface JSONDocumentSuccessResult {
  readonly ok: true;
}

export interface JSONDocumentFailureResult {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}

export type JSONDocumentValidationResult =
  | JSONDocumentSuccessResult
  | JSONDocumentFailureResult;

export type JSONDocumentReadResult =
  | { readonly ok: true; readonly path: string; readonly value: JSONValue }
  | JSONDocumentFailureResult;

export type JSONDocumentQueryResult =
  | {
      readonly ok: true;
      readonly query: string;
      readonly pointers: ReadonlyArray<string>;
    }
  | JSONDocumentFailureResult;

export type JSONDocumentCommitResult =
  | (JSONDocumentSuccessResult & { readonly change: JSONDocumentChange })
  | JSONDocumentFailureResult;

export interface JSONDocument {
  readonly value: JSONValue;
  at(pointer: string): JSONDocumentReadResult;
  query(jsonPath: string): JSONDocumentQueryResult;
  validatePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONDocumentValidationResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONDocumentChange) => void): () => void;
}

export interface JSONDocumentHarness {
  create(
    validation: JSONDocumentValidation,
    initial: JSONValue,
  ): JSONDocument;
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
  readonly validation?: JSONDocumentValidation;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONDocumentMetadata;
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
    readonly metadata?: JSONDocumentMetadata;
    readonly expect: ExpectedObject;
  }>;
  readonly unsubscribeAfter: number;
  readonly expect: {
    readonly value: JSONValue;
    readonly notifications: ReadonlyArray<ExpectedObject>;
  };
}

interface UnsubscribeDuringNotificationVector extends VectorBase {
  readonly kind: "unsubscribe-during-notification";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONDocumentMetadata;
  readonly expect: {
    readonly commit: ExpectedObject;
    readonly firstSubscriber: ReadonlyArray<ExpectedObject>;
    readonly secondSubscriber: ReadonlyArray<ExpectedObject>;
    readonly value: JSONValue;
  };
}

interface MutationAttempt {
  readonly pointer: string;
  readonly value: JSONValue;
}

interface IsolationVector extends VectorBase {
  readonly kind: "isolation";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata: JSONDocumentMetadata;
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

interface ReentrantNotificationVector extends VectorBase {
  readonly kind: "reentrant-notification";
  readonly outer: {
    readonly operations: ReadonlyArray<JSONPatchOperation>;
    readonly metadata?: JSONDocumentMetadata;
  };
  readonly nested: {
    readonly operations: ReadonlyArray<JSONPatchOperation>;
    readonly metadata?: JSONDocumentMetadata;
  };
  readonly expect: {
    readonly outer: ExpectedObject;
    readonly nested: ExpectedObject;
    readonly firstSubscriber: ReadonlyArray<ExpectedObject>;
    readonly secondSubscriber: ReadonlyArray<ExpectedObject>;
    readonly value: JSONValue;
  };
}

interface SubscriberErrorVector extends VectorBase {
  readonly kind: "subscriber-error";
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONDocumentMetadata;
  readonly expect: {
    readonly commit: ExpectedObject;
    readonly delivered: ReadonlyArray<ExpectedObject>;
    readonly value: JSONValue;
  };
}

type JSONDocumentVector =
  | SurfaceVector
  | ReadVector
  | CommitVector
  | UnsubscribeVector
  | UnsubscribeDuringNotificationVector
  | IsolationVector
  | NonJSONVector
  | ReentrantNotificationVector
  | SubscriberErrorVector;

interface JSONDocumentManifest {
  readonly initial: JSONValue;
  readonly vectors: ReadonlyArray<JSONDocumentVector>;
}

interface Observation {
  readonly changes: JSONDocumentChange[];
  readonly values: JSONValue[];
  readonly unsubscribe: () => void;
}

const manifest = rawVectors as unknown as JSONDocumentManifest;

function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectRequired(actual: unknown, expected: ExpectedObject): void {
  expect(actual).toMatchObject(expected);
}

function observe(document: JSONDocument): Observation {
  const changes: JSONDocumentChange[] = [];
  const values: JSONValue[] = [];
  const unsubscribe = document.subscribe((change) => {
    changes.push(change);
    values.push(cloneJSON(document.value));
  });
  return { changes, values, unsubscribe };
}

function expectNotifications(
  actual: ReadonlyArray<JSONDocumentChange>,
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
  harness: JSONDocumentHarness,
  vector: SurfaceVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const surface = document as unknown as Record<string, unknown>;
  for (const member of vector.members) {
    expect(member in surface).toBe(true);
    if (member !== "value") expect(typeof surface[member]).toBe("function");
  }
}

function runReadVector(
  harness: JSONDocumentHarness,
  vector: ReadVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const before = cloneJSON(document.value);
  const observation = observe(document);
  for (const row of vector.at) {
    expectRequired(document.at(row.pointer), row.expect);
  }
  for (const row of vector.query) {
    expectRequired(document.query(row.jsonPath), row.expect);
  }
  expect(document.value).toEqual(before);
  expect(observation.changes).toEqual([]);
}

function runCommitVector(
  harness: JSONDocumentHarness,
  vector: CommitVector,
): void {
  const document = harness.create(
    vector.validation ?? "json",
    cloneJSON(manifest.initial),
  );
  const observation = observe(document);
  const beforeProbe = cloneJSON(document.value);
  const operations = cloneJSON(vector.operations);
  const probe = document.validatePatch(operations);
  expectRequired(probe, vector.expect.probe);
  expect(document.value).toEqual(beforeProbe);
  expect(observation.changes).toEqual([]);

  const commit = document.commit(
    operations,
    vector.metadata === undefined
      ? undefined
      : { metadata: cloneJSON(vector.metadata) },
  );
  expectRequired(commit, vector.expect.commit);
  expect(document.value).toEqual(vector.expect.value);
  expectNotifications(observation.changes, vector.expect.notifications);
  for (const observedValue of observation.values) {
    expect(observedValue).toEqual(vector.expect.value);
  }
  if (!probe.ok && !commit.ok) expect(commit.code).toBe(probe.code);
}

function runUnsubscribeVector(
  harness: JSONDocumentHarness,
  vector: UnsubscribeVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const observation = observe(document);
  for (const [index, row] of vector.commits.entries()) {
    const result = document.commit(
      cloneJSON(row.operations),
      row.metadata === undefined
        ? undefined
        : { metadata: cloneJSON(row.metadata) },
    );
    expectRequired(result, row.expect);
    if (index === vector.unsubscribeAfter) observation.unsubscribe();
  }
  expect(document.value).toEqual(vector.expect.value);
  expectNotifications(observation.changes, vector.expect.notifications);
}

function runUnsubscribeDuringNotificationVector(
  harness: JSONDocumentHarness,
  vector: UnsubscribeDuringNotificationVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const firstSubscriber: JSONDocumentChange[] = [];
  const secondSubscriber: JSONDocumentChange[] = [];
  let unsubscribeSecond = (): void => undefined;

  document.subscribe((change) => {
    firstSubscriber.push(change);
    unsubscribeSecond();
  });
  unsubscribeSecond = document.subscribe((change) => {
    secondSubscriber.push(change);
  });

  const result = document.commit(
    cloneJSON(vector.operations),
    commitOptions(vector.metadata),
  );

  expectRequired(result, vector.expect.commit);
  expectNotifications(firstSubscriber, vector.expect.firstSubscriber);
  expectNotifications(secondSubscriber, vector.expect.secondSubscriber);
  expect(document.value).toEqual(vector.expect.value);
}

function runIsolationVector(
  harness: JSONDocumentHarness,
  vector: IsolationVector,
): void {
  const initial = cloneJSON(manifest.initial);
  const document = harness.create("json", initial);
  const previousSnapshot = document.value;
  attemptMutation(initial, vector.mutations.initial);
  expect(document.value).toEqual(vector.expect.previousSnapshot);

  const operations = cloneJSON(vector.operations);
  const metadata = cloneJSON(vector.metadata);
  const observation = observe(document);
  const first = document.commit(operations, { metadata });
  expectRequired(first, { ok: true });
  expect(document.value).toEqual(vector.expect.afterFirst);
  expectNotifications(observation.changes, [vector.expect.firstChange]);

  const read = document.at(vector.readPointer);
  expectRequired(read, { ok: true, path: vector.readPointer });
  attemptMutation(operations, vector.mutations.operations);
  attemptMutation(metadata, vector.mutations.metadata);
  attemptMutation(previousSnapshot, vector.mutations.snapshot);
  if (read.ok) attemptMutation(read.value, vector.mutations.read);
  attemptMutation(observation.changes[0], vector.mutations.change);

  expect(document.value).toEqual(vector.expect.afterFirst);
  expect(previousSnapshot).toEqual(vector.expect.previousSnapshot);
  expectRequired(observation.changes[0], vector.expect.firstChange);

  const second = document.commit(cloneJSON(vector.nextOperations));
  expectRequired(second, { ok: true });
  expect(document.value).toEqual(vector.expect.afterSecond);
  expect(previousSnapshot).toEqual(vector.expect.previousSnapshot);
  expectRequired(observation.changes[0], vector.expect.firstChange);
  expect(observation.changes).toHaveLength(vector.expect.notificationCount);
}

function runNonJSONVector(
  harness: JSONDocumentHarness,
  vector: NonJSONVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const observation = observe(document);
  const hostValue = vector.hostValue === "callable"
    ? () => undefined
    : undefined;
  const operations = [{
    op: "add",
    path: vector.path,
    value: hostValue,
  }] as unknown as ReadonlyArray<JSONPatchOperation>;

  const probe = document.validatePatch(operations);
  expectRequired(probe, vector.expect.probe);
  const commit = document.commit(operations);
  expectRequired(commit, vector.expect.commit);
  if (!probe.ok && !commit.ok) expect(commit.code).toBe(probe.code);
  expect(document.value).toEqual(vector.expect.value);
  expectNotifications(observation.changes, vector.expect.notifications);
}

function commitOptions(
  metadata: JSONDocumentMetadata | undefined,
): JSONDocumentCommitOptions | undefined {
  return metadata === undefined
    ? undefined
    : { metadata: cloneJSON(metadata) };
}

function runReentrantNotificationVector(
  harness: JSONDocumentHarness,
  vector: ReentrantNotificationVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const firstSubscriber: JSONDocumentChange[] = [];
  const secondSubscriber: JSONDocumentChange[] = [];
  let nestedResult: JSONDocumentCommitResult | undefined;

  document.subscribe((change) => {
    firstSubscriber.push(change);
    if (firstSubscriber.length === 1) {
      nestedResult = document.commit(
        cloneJSON(vector.nested.operations),
        commitOptions(vector.nested.metadata),
      );
    }
  });
  document.subscribe((change) => {
    secondSubscriber.push(change);
  });

  const outerResult = document.commit(
    cloneJSON(vector.outer.operations),
    commitOptions(vector.outer.metadata),
  );

  expectRequired(outerResult, vector.expect.outer);
  expectRequired(nestedResult, vector.expect.nested);
  expectNotifications(
    firstSubscriber,
    vector.expect.firstSubscriber,
  );
  expectNotifications(
    secondSubscriber,
    vector.expect.secondSubscriber,
  );
  expect(document.value).toEqual(vector.expect.value);
}

function runSubscriberErrorVector(
  harness: JSONDocumentHarness,
  vector: SubscriberErrorVector,
): void {
  const document = harness.create("json", cloneJSON(manifest.initial));
  const delivered: JSONDocumentChange[] = [];
  let commitResult: JSONDocumentCommitResult | undefined;

  document.subscribe(() => {
    throw new Error("subscriber failed");
  });
  document.subscribe((change) => {
    delivered.push(change);
  });

  expect(() => {
    commitResult = document.commit(
      cloneJSON(vector.operations),
      commitOptions(vector.metadata),
    );
  }).not.toThrow();
  expectRequired(commitResult, vector.expect.commit);
  expectNotifications(delivered, vector.expect.delivered);
  expect(document.value).toEqual(vector.expect.value);
}

function runVector(
  harness: JSONDocumentHarness,
  vector: JSONDocumentVector,
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
    case "unsubscribe-during-notification":
      runUnsubscribeDuringNotificationVector(harness, vector);
      return;
    case "isolation":
      runIsolationVector(harness, vector);
      return;
    case "non-json":
      runNonJSONVector(harness, vector);
      return;
    case "reentrant-notification":
      runReentrantNotificationVector(harness, vector);
      return;
    case "subscriber-error":
      runSubscriberErrorVector(harness, vector);
  }
}

export function runJSONDocumentConformance(
  harness: JSONDocumentHarness,
): void {
  describe("json-document v3 JSONDocument black-box conformance", () => {
    for (const vector of manifest.vectors) {
      test(`[${vector.id}]`, () => runVector(harness, vector));
    }
  });
}
