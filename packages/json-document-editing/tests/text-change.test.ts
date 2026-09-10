import { expect, test } from "vitest";
import { diffText } from "../src/index.js";

test("derives the smallest UTF-16 replacement from full source values", () => {
  expect(diffText("A **한글** B", "A **입력** B")).toEqual({ from: 4, to: 6, insert: "입력" });
  expect(diffText("same", "same")).toBeNull();
  for (const [before, after] of [["", "한글"], ["😀", "😄"], ["a\r\nb", "a\nb"], ["abc", ""]]) {
    const change = diffText(before!, after!)!;
    expect(before!.slice(0, change.from) + change.insert + before!.slice(change.to)).toBe(after);
  }
});
