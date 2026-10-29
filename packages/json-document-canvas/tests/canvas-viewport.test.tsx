import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { CanvasHand } from "../src/index.js";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
test("wheel navigation batches the camera without document layout, measurement or commits", () => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
  const source = createJSONDocument({ profile: "canvas/1", width: 1280, height: 720, objects: [] });
  const editor = createObjectEditor(source);
  const layout = vi.spyOn(editor, "layoutDocument");
  const commit = vi.fn(); source.subscribe(commit);
  render(<CanvasHand workspace editor={editor} creationStyle={{ color: "red", textColor: "black", fontSize: 24, strokeWidth: 2 }} />);
  act(() => vi.advanceTimersByTime(150));
  const svg = screen.getByRole("group", { name: "Canvas slide" });
  const before = svg.getAttribute("viewBox");
  layout.mockClear();
  for (let i = 0; i < 30; i++) fireEvent.wheel(svg, { deltaX: 3, deltaY: 4 });
  act(() => vi.advanceTimersByTime(20));
  expect(svg.getAttribute("viewBox")).not.toBe(before);
  expect(layout).not.toHaveBeenCalled();
  expect(commit).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(150));
  expect(layout).not.toHaveBeenCalled();
  expect(svg.hasAttribute("data-canvas-navigating")).toBe(false);
});
