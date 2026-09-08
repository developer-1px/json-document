import { describe, expect, test } from "vitest";
import { contextualAffordance } from "../src/index.js";

const capabilities = [
  { id: "create", phases: ["approach"] },
  { id: "remove", phases: ["selected"] },
  { id: "title", phases: ["editing"] },
] as const;

describe("contextualAffordance", () => {
  test("keeps controls absent while content rests", () => {
    expect(contextualAffordance({ capabilities })).toEqual({ phase: "rest", visible: [] });
  });

  test("treats pointer approach and keyboard focus as the same reveal phase", () => {
    expect(contextualAffordance({ approached: true, capabilities })).toEqual({
      phase: "approach",
      visible: ["create"],
    });
    expect(contextualAffordance({ focused: true, capabilities })).toEqual({
      phase: "approach",
      visible: ["create"],
    });
  });

  test("keeps selected controls available without hover and gives editing precedence", () => {
    expect(contextualAffordance({ selected: true, capabilities })).toEqual({
      phase: "selected",
      visible: ["remove"],
    });
    expect(contextualAffordance({ approached: true, selected: true, editing: true, capabilities })).toEqual({
      phase: "editing",
      visible: ["title"],
    });
  });
});
