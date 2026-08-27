import { describe, expect, it } from "vitest";
import { richTextPlainText } from "../src/index.js";

describe("richTextPlainText", () => {
  it("projects nested model text and hard breaks without DOM knowledge", () => {
    expect(richTextPlainText([{
      id: "paragraph",
      type: "paragraph",
      content: [
        { id: "a", type: "text", text: "const a = 1;", marks: [] },
        { id: "break", type: "hardBreak" },
        { id: "b", type: "text", text: "return a;", marks: [] },
      ],
    }])).toBe("const a = 1;\nreturn a;");
  });
});
