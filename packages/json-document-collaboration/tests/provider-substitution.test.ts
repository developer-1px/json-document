import {
  createJSONDocument,
  type JSONAppliedChange,
  type JSONDocument,
  type JSONValue,
} from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";

import { createCollaborationRuntime } from "../src/index.js";
import {
  createTaskBoardHost,
  taskBoardInitialValue,
} from "./support/task-board-host.js";

const ruleset = {
  id: "test/task-board-host",
  digest: "test/task-board-host/v1",
} as const;

describe("provider-neutral task-board host", () => {
  test("runs the same product commands against local and collaborative documents", () => {
    const local = exerciseSingleProvider(
      createJSONDocument(taskBoardInitialValue()),
    );
    const collaborative = exerciseSingleProvider(
      createCollaborationRuntime(taskBoardInitialValue(), {
        actorId: "single-collaborative",
        epochId: "task-board-provider-substitution/v1",
        ruleset,
      }).document,
    );

    expect(collaborative).toEqual(local);
  });

  test("preserves a card edit across a concurrent structural move", () => {
    const leftRuntime = createCollaborationRuntime(taskBoardInitialValue(), {
      actorId: "left",
      epochId: "task-board-multi/v1",
      ruleset,
    });
    const rightRuntime = createCollaborationRuntime(taskBoardInitialValue(), {
      actorId: "right",
      epochId: "task-board-multi/v1",
      ruleset,
    });
    const left = createTaskBoardHost(leftRuntime.document);
    const right = createTaskBoardHost(rightRuntime.document);

    expect(left.moveCard("base", "doing")).toMatchObject({ ok: true });
    expect(right.updateCardText("base", "Edited on the other replica"))
      .toMatchObject({ ok: true });
    const leftBundle = leftRuntime.replica.exportBundle();
    const rightBundle = rightRuntime.replica.exportBundle();
    expect(leftRuntime.replica.ingest(rightBundle))
      .toMatchObject({ ok: true, pending: [] });
    expect(rightRuntime.replica.ingest(leftBundle))
      .toMatchObject({ ok: true, pending: [] });

    expect(rightRuntime.document.value).toEqual(leftRuntime.document.value);
    expect(rightRuntime.replica.status()).toEqual(
      leftRuntime.replica.status(),
    );
    expect(left.card("base")).toEqual({
      id: "base",
      text: "Edited on the other replica",
      done: false,
    });
    expect(
      left.snapshot().lanes.find((lane) => lane.id === "doing")?.cards,
    ).toContainEqual(left.card("base"));
  });
});

function exerciseSingleProvider(document: JSONDocument): {
  readonly value: JSONValue;
  readonly changes: ReadonlyArray<JSONAppliedChange>;
} {
  const host = createTaskBoardHost(document);
  const changes: JSONAppliedChange[] = [];
  const unsubscribe = host.subscribe((change) => {
    changes.push(change);
  });

  expect(host.renameBoard("Stable board")).toMatchObject({ ok: true });
  expect(host.addCard("todo", {
    id: "single-1",
    text: "Exercise the host",
    done: false,
  })).toMatchObject({ ok: true });
  expect(host.updateCardText("single-1", "Exercise both providers"))
    .toMatchObject({ ok: true });
  expect(host.toggleCard("single-1")).toMatchObject({ ok: true });
  expect(host.moveCard("single-1", "done")).toMatchObject({ ok: true });
  unsubscribe();

  expect(host.laneIds()).toEqual(["todo", "doing", "done"]);
  expect(host.cardIds()).toEqual(["base", "single-1"]);
  expect(host.card("single-1")).toEqual({
    id: "single-1",
    text: "Exercise both providers",
    done: true,
  });

  return {
    value: document.value,
    changes,
  };
}
