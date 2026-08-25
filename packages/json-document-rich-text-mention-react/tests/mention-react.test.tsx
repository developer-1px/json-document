import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { RichTextMentionAtom } from "../src/index.js";

afterEach(cleanup);

describe("Rich Text mention React projection", () => {
  test("projects canonical mention data without product styling", () => {
    render(<RichTextMentionAtom node={{ id: "mention", type: "os.interactive/mention", attrs: { entityId: "alpha", label: "Alpha" } }} className="product-mention" />);
    const mention = screen.getByText("@Alpha");
    expect(mention.className).toBe("product-mention");
    expect(mention.dataset).toMatchObject({ richTextMention: "", richTextNodeId: "mention" });
    expect(mention.getAttribute("contenteditable")).toBe("false");
  });
});
