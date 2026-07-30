import { describe, expect, test } from "vitest";

import {
  createCollaborationRuntime,
  type CollaborationControl,
  type CollaborationReplica,
  type CollaborationSnapshot,
  type ReplicaStatus,
} from "../src/index.js";
import {
  createCollaborationHistoryRuntime,
  createHistoryRuntime,
  type CollaborationHistorySnapshot,
  type HistoryStatus,
} from "../src/history-index.js";
import {
  createCollaborationTextRuntime,
  createTextRuntime,
  type CollaborationTextSelection,
  type TextSelection,
} from "../src/text-index.js";

const options = {
  actorId: "compatibility",
  epochId: "naming-compatibility/v1",
  ruleset: { id: "naming-compatibility", digest: "sha256:naming-compatibility" },
};

describe("deprecated naming compatibility", () => {
  test("canonical and compatibility runtime names share one implementation", () => {
    expect(createCollaborationHistoryRuntime).toBe(createHistoryRuntime);
    expect(createCollaborationTextRuntime).toBe(createTextRuntime);

    const runtime = createCollaborationRuntime({}, options);
    expect(runtime.collaboration).toBe(runtime.replica);
    const current = runtime.collaboration.current;
    const status = runtime.replica.status;
    expect(current()).toEqual(status());
  });

  test("compatibility types are structural aliases", () => {
    const replica = null as unknown as CollaborationReplica;
    replica satisfies CollaborationControl;

    const status = null as unknown as ReplicaStatus;
    status satisfies CollaborationSnapshot;

    const historyStatus = null as unknown as HistoryStatus;
    historyStatus satisfies CollaborationHistorySnapshot;

    const selection = null as unknown as TextSelection;
    selection satisfies CollaborationTextSelection;
  });
});
