import { describe, expect, test } from "vitest";

import type {
  JSONPatchOperation,
  JSONValue,
  ProjectionAcceptance,
  ProjectionChange,
  ProjectionHarness,
  ProjectionMetadata,
} from "./projection-suite.js";
import rawVectors from "./pressure-vectors.json" with { type: "json" };

type ExpectedObject = Readonly<Record<string, unknown>>;

interface PressureStep {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: ProjectionMetadata;
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
  readonly acceptance: ProjectionAcceptance;
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
  harness: ProjectionHarness,
): void {
  describe("json-document v2 pressure verticals", () => {
    for (const vertical of manifest.verticals) {
      test(`[${vertical.id}]`, () => runVertical(harness, vertical));
    }
  });
}

function runVertical(
  harness: ProjectionHarness,
  vertical: PressureVertical,
): void {
  const initial = cloneJSON(vertical.initial);
  const projection = harness.create(vertical.acceptance, initial);
  const changes: ProjectionChange[] = [];
  projection.subscribe((change) => {
    changes.push(cloneJSON(change));
  });

  for (const step of vertical.steps) {
    const operations = cloneJSON(step.operations);
    const metadata = step.metadata === undefined
      ? undefined
      : cloneJSON(step.metadata);
    const probe = projection.canPatch(operations);
    expect(probe).toMatchObject(step.expect.probe);
    const committed = projection.commit(
      operations,
      metadata === undefined ? undefined : { metadata },
    );
    expect(committed).toMatchObject(step.expect.commit);
    expect(projection.value).toEqual(step.expect.value);
    expect(changes).toHaveLength(step.expect.notificationCount);
  }

  for (const read of vertical.reads ?? []) {
    expect(projection.at(read.pointer)).toMatchObject(read.expect);
  }
  for (const query of vertical.queries ?? []) {
    expect(projection.query(query.jsonPath)).toMatchObject(query.expect);
  }

  if (vertical.replay === true) {
    const replay = harness.create(vertical.acceptance, cloneJSON(vertical.initial));
    for (const change of changes) {
      const result = replay.commit(
        cloneJSON(change.applied),
        change.metadata === undefined
          ? undefined
          : { metadata: cloneJSON(change.metadata) },
      );
      expect(result).toMatchObject({ ok: true });
    }
    expect(replay.value).toEqual(projection.value);
  }
}

function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
