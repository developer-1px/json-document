import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { markdownSheetPresentation } from "../src/index.js";

afterEach(cleanup);
test("cell display and draft preserve inline Markdown without a paragraph wrapper", () => {
  const display = render(<div>{markdownSheetPresentation.renderCell("**bold**")}</div>);
  expect(display.container.querySelector("strong")?.textContent).toBe("bold");
  expect(display.container.querySelector("p")).toBeNull();
  display.unmount();
  render(markdownSheetPresentation.renderEditor({label:"cell",value:"**bold**",style:{},onValueChange:vi.fn(),onKeyDown:vi.fn(),onBlur:vi.fn()}));
  expect(screen.getByRole("textbox").querySelector("strong")?.textContent).toBe("**bold**");
});
