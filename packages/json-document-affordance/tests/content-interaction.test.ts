import { describe, expect, test } from "vitest";
import { contentInteractionAffordance } from "../src/index.js";

describe("contentInteractionAffordance", () => {
  test("keeps selection persistent while active and dragging phases change", () => {
    expect(contentInteractionAffordance({ role: "content", selected: true })).toEqual({
      role: "content", phase: "rest", selected: true, elevated: false,
    });
    expect(contentInteractionAffordance({ role: "content", selected: true, active: true })).toEqual({
      role: "content", phase: "active", selected: true, elevated: false,
    });
    expect(contentInteractionAffordance({ role: "content", selected: true, active: true, dragging: true })).toEqual({
      role: "content", phase: "dragging", selected: true, elevated: true,
    });
  });

  test("keeps insertion and drop targets distinct from selected content", () => {
    expect(contentInteractionAffordance({ role: "insertion", active: true })).toEqual({
      role: "insertion", phase: "active", selected: false, elevated: false,
    });
    expect(contentInteractionAffordance({ role: "drop-target", active: true })).toEqual({
      role: "drop-target", phase: "active", selected: false, elevated: false,
    });
  });
});
