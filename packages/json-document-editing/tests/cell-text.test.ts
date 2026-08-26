import { describe, expect, it } from "vitest";
import { jsonCellText } from "../src/index.js";

describe("jsonCellText", () => {
  it("projects canonical cell values into one plain-text contract", () => {
    expect(jsonCellText(undefined)).toBe("");
    expect(jsonCellText(null)).toBe("");
    expect(jsonCellText("ready")).toBe("ready");
    expect(jsonCellText(3)).toBe("3");
    expect(jsonCellText(false)).toBe("false");
    expect(jsonCellText({ status: "ready" })).toBe('{"status":"ready"}');
  });
});
