import { describe, expect, test } from "vitest";

import type {
  JSONPatchOperation,
  JSONValue,
  JSONDocumentValidation,
  JSONDocumentChange,
  JSONDocumentHarness,
  JSONDocumentMetadata,
} from "./json-document.js";
import rawVectors from "../vectors/pressure.json" with { type: "json" };

type ExpectedObject = Readonly<Record<string, unknown>>;

interface PressureStep {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONDocumentMetadata;
  readonly expect: {
    readonly probe: ExpectedObject;
    readonly commit: ExpectedObject;
    readonly value: JSONValue;
    readonly notificationCount: number;
  };
}

interface PressureVertical {
  readonly id: string;
  readonly requirements: ReadonlyArray<string>;
  readonly validation: JSONDocumentValidation;
  readonly initial: JSONValue;
  readonly steps: ReadonlyArray<PressureStep>;
  readonly replay?: boolean;
  readonly reads?: ReadonlyArray<{
    readonly pointer: string;
    readonly expect: ExpectedObject;
  }>;
  readonly queries?: ReadonlyArray<{
    readonly jsonPath: string;
    readonly expect: ExpectedObject;
  }>;
}

interface PressureManifest {
  readonly verticals: ReadonlyArray<PressureVertical>;
}

const manifest = rawVectors as unknown as PressureManifest;

export function runPressureConformance(
  harness: JSONDocumentHarness,
): void {
  describe("json-document v3 pressure verticals", () => {
    for (const vertical of manifest.verticals) {
      test(`[${vertical.id}]`, () => runVertical(harness, vertical));
    }
  });
}

function runVertical(
  harness: JSONDocumentHarness,
  vertical: PressureVertical,
): void {
  const initial = cloneJSON(vertical.initial);
  const document = harness.create(vertical.validation, initial);
  const changes: JSONDocumentChange[] = [];
  document.subscribe((change) => {
    changes.push(cloneJSON(change));
  });

  for (const step of vertical.steps) {
    const operations = cloneJSON(step.operations);
    const metadata = step.metadata === undefined
      ? undefined
      : cloneJSON(step.metadata);
    const probe = document.validatePatch(operations);
    expect(probe).toMatchObject(step.expect.probe);
    const committed = document.commit(
      operations,
      metadata === undefined ? undefined : { metadata },
    );
    expect(committed).toMatchObject(step.expect.commit);
    expect(document.value).toEqual(step.expect.value);
    expect(changes).toHaveLength(step.expect.notificationCount);
  }

  for (const read of vertical.reads ?? []) {
    expect(document.at(read.pointer)).toMatchObject(read.expect);
  }
  for (const query of vertical.queries ?? []) {
    expect(document.query(query.jsonPath)).toMatchObject(query.expect);
  }

  if (vertical.replay === true) {
    const replay = harness.create(vertical.validation, cloneJSON(vertical.initial));
    for (const change of changes) {
      const result = replay.commit(
        cloneJSON(change.applied),
        change.metadata === undefined
          ? undefined
          : { metadata: cloneJSON(change.metadata) },
      );
      expect(result).toMatchObject({ ok: true });
    }
    expect(replay.value).toEqual(document.value);
  }
}

function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
