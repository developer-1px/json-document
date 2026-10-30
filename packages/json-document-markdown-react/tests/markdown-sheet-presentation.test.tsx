import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { markdownSheetPresentation } from "../src/index.js";

afterEach(cleanup);
test("cell display and draft preserve inline Markdown without a paragraph wrapper", () => {
  const display = render(<div>{markdownSheetPresentation.renderCell("**bold**")}</div>);
  expect(display.container.querySelector("strong")?.textContent).toBe("bold");
  expect(display.container.querySelector("p")).toBeNull();
  display.unmount();
  const marks = render(<div>{markdownSheetPresentation.renderCell("_a_ ~~b~~ `c` [d](https://e.f) g")}</div>);
  expect(marks.container.innerHTML).toBe('<div><em>a</em> <s>b</s> <code>c</code> <a href="https://e.f" rel="noopener noreferrer">d</a> g</div>');
  marks.unmount();
  render(markdownSheetPresentation.renderEditor({label:"cell",value:"**bold**",style:{},onValueChange:vi.fn(),onKeyDown:vi.fn(),onBlur:vi.fn()}));
  expect(screen.getByRole("textbox").querySelector("strong")?.textContent).toBe("**bold**");
});
