import { afterEach, expect, test, vi } from "vitest";
import { createTextProjectionDOMAdapter, plainTextDOMAdapter, restoreTextDOMSelection, type TextDOMAdapter } from "../src/index.js";

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.replaceChildren(); });
function fixture() {
  const root = document.createElement("div"); document.body.append(root);
  const marker = document.createElement("span"); marker.textContent = "[[key]]";
  const separator = document.createElement("span"); separator.textContent = " "; separator.hidden = true;
  const body = document.createTextNode("😀본문");
  root.append(marker, separator, body);
  const base: TextDOMAdapter = {...plainTextDOMAdapter, render() {}};
  const adapter = createTextProjectionDOMAdapter(base, () => [{from:0, to:7, following:8, element:marker}]);
  return {root, marker, body, adapter};
}

test("projection navigation skips a source interval without changing its text or deletion units", () => {
  const {root, adapter} = fixture();
  const move = (focus: number, direction: "backward" | "forward") => adapter.resolveHorizontalSelection!(root, {anchor:focus, focus}, direction, false);
  expect(move(8, "backward")).toEqual({anchor:7, focus:7});
  expect(move(7, "backward")).toEqual({anchor:0, focus:0});
  expect(move(0, "forward")).toEqual({anchor:7, focus:7});
  expect(move(7, "forward")).toEqual({anchor:8, focus:8});
  expect(move(8, "forward")).toBeNull();
  expect(adapter.resolveHorizontalSelection!(root, {anchor:8, focus:7}, "backward", true)).toEqual({anchor:8, focus:0});
  expect(adapter.resolveHorizontalSelection!(root, {anchor:8, focus:0}, "forward", false)).toEqual({anchor:8, focus:8});
  expect(adapter.observe(root).value).toBe("[[key]] 😀본문");
});

test("visual caret uses marker edges and exits to the native body position with one restore", () => {
  const {root, marker, body, adapter} = fixture();
  adapter.restoreSelection(root, {anchor:0, focus:0});
  expect(marker.getAttribute("data-text-projection-edge")).toBe("before");
  adapter.restoreSelection(root, {anchor:7, focus:7});
  expect(marker.getAttribute("data-text-projection-edge")).toBe("after");
  const writes = vi.spyOn(document.getSelection()!, "setBaseAndExtent");
  adapter.restoreSelection(root, {anchor:8, focus:8});
  expect(writes).toHaveBeenCalledTimes(1);
  expect(document.getSelection()!.focusNode).toBe(body);
  expect(root.hasAttribute("data-text-projection-caret")).toBe(false);
  adapter.restoreSelection(root, {anchor:8, focus:8});
  expect(writes).toHaveBeenCalledTimes(1);
  adapter.restoreSelection(root, {anchor:8, focus:0});
  expect(adapter.observe(root).selection).toEqual({anchor:8, focus:0});
  expect(marker.hasAttribute("data-text-projection-edge")).toBe(false);
  adapter.render(root, "[[key]] 😀본문", null);
  expect(root.hasAttribute("data-text-projection-caret")).toBe(false);
  writes.mockRestore();
});

test("canonical restoration can choose either text node at the same source boundary", () => {
  const {root, body} = fixture();
  restoreTextDOMSelection(root, {anchor:8, focus:8});
  expect(document.getSelection()!.focusNode).not.toBe(body);
  restoreTextDOMSelection(root, {anchor:8, focus:8}, {affinity: () => "forward"});
  expect(document.getSelection()!.focusNode).toBe(body);
  expect(plainTextDOMAdapter.observe(root).selection).toEqual({anchor:8, focus:8});
});

test("adjacent projections share one caret and navigate across the shared boundary", () => {
  const root = document.createElement("div"); document.body.append(root);
  const first = document.createElement("span"); first.textContent = "ab";
  const second = document.createElement("span"); second.textContent = "CD";
  root.append(first, second);
  const adapter = createTextProjectionDOMAdapter(plainTextDOMAdapter, () => [
    {from:0, to:2, element:first}, {from:2, to:4, element:second},
  ]);
  adapter.restoreSelection(root, {anchor:2, focus:2});
  expect(root.querySelectorAll("[data-text-projection-edge]")).toHaveLength(1);
  expect(first.getAttribute("data-text-projection-edge")).toBe("after");
  expect(adapter.resolveHorizontalSelection!(root, {anchor:2, focus:2}, "backward", false)).toEqual({anchor:0, focus:0});
  expect(adapter.resolveHorizontalSelection!(root, {anchor:2, focus:2}, "forward", false)).toEqual({anchor:4, focus:4});
});
