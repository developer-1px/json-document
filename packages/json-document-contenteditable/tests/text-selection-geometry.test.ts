import { describe, expect, it } from "vitest";
import { mergeTextSelectionRects } from "../src/dom/text-selection-geometry.js";

describe("selection fragment union", () => {
  it("aligns a short marker with text and removes overlapping DOM rectangles", () => {
    expect(mergeTextSelectionRects([
      {left: 10, top: 12, width: 18, height: 18},
      {left: 28, top: 10, width: 30, height: 22},
      {left: 40, top: 10, width: 30, height: 22},
    ])).toEqual([{left: 10, top: 10, width: 60, height: 22}]);
  });
  it("retains unselected horizontal gaps, bidi fragments and distinct lines", () => {
    expect(mergeTextSelectionRects([
      {left: 40, top: 10, width: 20, height: 20},
      {left: 10, top: 10, width: 15, height: 20},
      {left: 10, top: 40, width: 20, height: 20},
    ])).toEqual([
      {left: 10, top: 10, width: 15, height: 20},
      {left: 40, top: 10, width: 20, height: 20},
      {left: 10, top: 40, width: 20, height: 20},
    ]);
  });
  it("uses the text line height across inline fonts without coloring the next line", () => {
    expect(mergeTextSelectionRects([
      {left: 10, top: 12, width: 18, height: 18},
      {left: 28, top: 10, width: 30, height: 22, lineHeight: 36, text: true},
      {left: 58, top: 12, width: 20, height: 18, lineHeight: 36, text: true},
      {left: 10, top: 46, width: 30, height: 22, lineHeight: 36, text: true},
    ])).toEqual([
      {left: 10, top: 3, width: 68, height: 36},
      {left: 10, top: 39, width: 30, height: 36},
    ]);
  });
});
