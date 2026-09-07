import { describe, expect, test } from "vitest";
import { createKeySelectionFamily, emptyKeySelection, type KeySelectionContext } from "../../src/index.js";

describe("EG-SELECT / KeySelection semantic select-all", () => {
  test.each([{ keys: [] }, { keys: ["a"] }, { keys: ["c", "a", "b"] }])("repeated select-all is idempotent in universe $keys", ({ keys }) => {
    const context: KeySelectionContext = { keys, universe: "visible:v1", universeMismatch: "clear" };
    const family = createKeySelectionFamily();
    const command = { type: "select-all" as const, universe: context.universe };
    const first = family.transition(emptyKeySelection(), command, context);
    const repeated = family.transition(first.state, command, context);
    expect(repeated.state).toEqual(first.state);
    expect(repeated.changed).toBe(false);
    expect(family.targets(repeated.state, context)).toEqual(keys);
  });

  test("select-all restores excluded targets; it does not mean toggle-all", () => {
    const context: KeySelectionContext = { keys: ["a", "b"], universe: "visible:v1", universeMismatch: "clear" };
    const family = createKeySelectionFamily();
    const command = { type: "select-all" as const, universe: context.universe };
    const all = family.transition(emptyKeySelection(), command, context).state;
    const partial = family.transition(all, { type: "subtract", keys: ["b"] }, context).state;
    const restored = family.transition(partial, command, context).state;
    expect(family.targets(restored, context)).toEqual(["a", "b"]);
    expect(family.transition(restored, command, context).changed).toBe(false);
  });
});
