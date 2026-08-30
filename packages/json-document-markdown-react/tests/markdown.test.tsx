import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MarkdownRenderer, projectStreamingMarkdown } from "../src/index.js";

describe("streaming Markdown", () => {
  test("repairs incomplete inline markup and fences without changing canonical source", () => {
    const inline = projectStreamingMarkdown("**hello", true);
    const fence = projectStreamingMarkdown("```ts\nconst value = 1", true);
    expect(inline).toMatchObject({ source: "**hello", markdown: "**hello**", repair: "**" });
    expect(fence.source).toBe("```ts\nconst value = 1");
    expect(fence.markdown.endsWith("\n```")).toBe(true);
  });

  test("renders GFM and accepts custom component renderers", () => {
    render(<MarkdownRenderer content={"- [x] done\n\n**bold"} streaming components={{ strong: ({ children }) => <mark>{children}</mark> }} />);
    expect(screen.getByRole("checkbox").hasAttribute("checked")).toBe(true);
    expect(screen.getByText("bold").tagName).toBe("MARK");
    expect(screen.getByText("bold").closest("[data-markdown-streaming=true]")).toBeTruthy();
  });
});
