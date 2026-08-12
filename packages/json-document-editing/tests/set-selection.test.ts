import { describe, expect, test } from "vitest";
import { selectSetItems } from "../src/set-selection.js";

describe("shared set selection state transitions", () => {
  test("replaces, adds, and toggles while preserving a valid primary", () => {
    let selection = selectSetItems(
      { selectedIds: [], primaryId: null },
      ["a", "b", "a"],
      "replace",
    );
    expect(selection).toEqual({ selectedIds: ["a", "b"], primaryId: "b" });

    selection = selectSetItems(selection, ["c", "b"], "add");
    expect(selection).toEqual({ selectedIds: ["a", "b", "c"], primaryId: "b" });

    selection = selectSetItems(selection, ["b", "d"], "toggle");
    expect(selection).toEqual({ selectedIds: ["a", "c", "d"], primaryId: "d" });

    selection = selectSetItems(selection, ["d"], "toggle");
    expect(selection).toEqual({ selectedIds: ["a", "c"], primaryId: "c" });
  });
});
