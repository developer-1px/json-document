import { describe, expect, test } from "vitest";
import {
  createKeySelectionFamily,
  emptyKeySelection,
  type KeySelectionContext,
} from "../src/index.js";

const context: KeySelectionContext = {
  keys: ["a", "b", "c", "d"],
  universe: "visible:v1",
  universeMismatch: "clear",
};

describe("key selection family", () => {
  test("normalizes explicit commands in host order without mutating input", () => {
    const family = createKeySelectionFamily();
    const before = emptyKeySelection();
    const frozen = Object.freeze(before);
    const result = family.transition(frozen, {
      type: "replace",
      keys: ["c", "a", "c", "missing"],
      primaryKey: "c",
    }, context);

    expect(result).toEqual({
      state: { kind: "explicit", keys: ["a", "c"], primaryKey: "c" },
      changed: true,
      change: { lifecycle: "transition" },
    });
    expect(before).toEqual({ kind: "explicit", keys: [], primaryKey: null });
  });

  test("keeps symbolic all and updates exclusions without materializing state", () => {
    const family = createKeySelectionFamily();
    let state = family.transition(emptyKeySelection(), {
      type: "select-all",
      universe: "visible:v1",
    }, context).state;
    state = family.transition(state, { type: "subtract", keys: ["b", "d"] }, context).state;
    state = family.transition(state, { type: "toggle", keys: ["b", "c"] }, context).state;

    expect(state).toEqual({
      kind: "all",
      universe: "visible:v1",
      excludedKeys: ["c", "d"],
      primaryKey: "a",
    });
    expect(family.targets(state, context)).toEqual(["a", "b"]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  test("requires an explicit universe mismatch policy", () => {
    const family = createKeySelectionFamily();
    const all = {
      kind: "all" as const,
      universe: "visible:v1",
      excludedKeys: ["b"],
      primaryKey: "c",
    };
    expect(family.reconcile(all, { ...context, universe: "visible:v2" }).state)
      .toEqual(emptyKeySelection());
    expect(family.reconcile(all, {
      ...context,
      universe: "visible:v2",
      universeMismatch: "retarget",
    }).state).toEqual({
      kind: "all",
      universe: "visible:v2",
      excludedKeys: ["b"],
      primaryKey: "c",
    });
  });

  test("maps removed and renamed keys before reconciliation", () => {
    const family = createKeySelectionFamily();
    const state = { kind: "explicit" as const, keys: ["a", "b", "c"], primaryKey: "b" };
    const result = family.map(state, {
      mapKey(key) {
        if (key === "a") return null;
        return key === "b" ? "d" : key;
      },
    }, context);
    expect(result.state).toEqual({ kind: "explicit", keys: ["c", "d"], primaryKey: "d" });
    expect(family.reconcile(result.state, context).changed).toBe(false);
  });
});
