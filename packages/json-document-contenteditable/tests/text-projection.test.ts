import { afterEach, expect, test, vi } from "vitest";
import { createTextProjectionDOMAdapter, createTextNavigationDOMAdapter, plainTextDOMAdapter, restoreTextDOMSelection, type TextDOMAdapter } from "../src/index.js";

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

test("projection deletion retains source graphemes and selected ranges instead of deleting a whole marker", () => {
  const {root, adapter} = fixture();
  expect(adapter.resolveDeletionSelection!(root, {anchor:8, focus:8}, "backward")).toEqual({anchor:7, focus:8});
  expect(adapter.resolveDeletionSelection!(root, {anchor:7, focus:7}, "backward")).toEqual({anchor:6, focus:7});
  expect(adapter.resolveDeletionSelection!(root, {anchor:8, focus:8}, "forward")).toEqual({anchor:8, focus:10});
  expect(adapter.resolveDeletionSelection!(root, {anchor:8, focus:0}, "backward")).toEqual({anchor:8, focus:0});
  expect(adapter.resolveDeletionSelection!(root, {anchor:10, focus:10}, "backward")).toBeNull();
});

test("atomic projections delete the whole unit and separator from either edge or a partial selection", () => {
  const {root, marker} = fixture();
  const adapter = createTextProjectionDOMAdapter(plainTextDOMAdapter, () => [{from:0, to:7, following:8, atomic:true, element:marker}]);
  for (const focus of [1, 7, 8]) {
    expect(adapter.resolveDeletionSelection!(root, {anchor:focus, focus}, "backward")).toEqual({anchor:0, focus:8});
  }
  expect(adapter.resolveDeletionSelection!(root, {anchor:0, focus:0}, "forward")).toEqual({anchor:0, focus:8});
  expect(adapter.resolveDeletionSelection!(root, {anchor:10, focus:3}, "backward")).toEqual({anchor:0, focus:10});
  expect(adapter.resolveDeletionSelection!(root, {anchor:8, focus:8}, "forward")).toEqual({anchor:8, focus:10});
});

test("restoration preserves live DOM sides at equivalent source offsets unless affinity is explicit", () => {
  const root = document.createElement("div"); document.body.append(root);
  const before = document.createTextNode("first\n");
  const marker = document.createElement("span"); marker.textContent = "> ";
  const body = document.createTextNode("body");
  root.append(before, marker, body);
  const selection = document.getSelection()!;
  selection.setBaseAndExtent(marker.firstChild!, 0, body, 2);
  const writes = vi.spyOn(selection, "setBaseAndExtent");
  restoreTextDOMSelection(root, {anchor:6, focus:10});
  expect(writes).not.toHaveBeenCalled();
  expect(selection.anchorNode).toBe(marker.firstChild);
  restoreTextDOMSelection(root, {anchor:6, focus:10}, {affinity: offset => offset === 6 ? "backward" : undefined});
  expect(selection.anchorNode).toBe(before);
  expect(selection.focusNode).toBe(body);
  expect(writes).toHaveBeenCalledTimes(1);
  // A stale, removed endpoint must still be restored into the current source DOM.
  root.replaceChildren(document.createTextNode("first\n> body"));
  restoreTextDOMSelection(root, {anchor:6, focus:10});
  expect(plainTextDOMAdapter.observe(root).selection).toEqual({anchor:6, focus:10});
  writes.mockRestore();
});

test("projection restoration does not impose backward affinity on native block entry", () => {
  const {root, marker, adapter} = fixture();
  const before = document.createTextNode(""); root.prepend(before);
  const selection = document.getSelection()!;
  selection.setBaseAndExtent(marker.firstChild!, 0, marker.firstChild!, 0);
  const writes = vi.spyOn(selection, "setBaseAndExtent");
  adapter.restoreSelection(root, {anchor:0, focus:0});
  expect(writes).not.toHaveBeenCalled();
  expect(selection.focusNode).toBe(marker.firstChild);
  writes.mockRestore();
});

test("visual navigation keeps native fallback when layout measurement is unavailable", () => {
  const {root, adapter} = fixture();
  root.style.writingMode = "horizontal-tb";
  expect(createTextNavigationDOMAdapter(adapter).resolveVerticalSelection!(root, {anchor:0, focus:0}, "forward", false)).toBeNull();
});

test("plain source rendering retains the live text node when only selection changes", () => {
  const root = document.createElement("div"); document.body.append(root);
  plainTextDOMAdapter.render(root, "one\ntwo\n");
  const text = root.firstChild;
  const selection = document.getSelection()!;
  selection.setBaseAndExtent(text!, 2, text!, 5);
  plainTextDOMAdapter.render(root, "one\ntwo\n");
  expect(root.firstChild).toBe(text);
  expect(plainTextDOMAdapter.observe(root).selection).toEqual({anchor:2,focus:5});
  plainTextDOMAdapter.render(root, "changed");
  expect(root.textContent).toBe("changed");
});


test("selection highlights the visible projection and clears it when collapsed", () => {
  const {root,marker,adapter} = fixture();
  adapter.render(root,"[[key]] 😀본문",{anchor:0,focus:7});
  expect(marker.hasAttribute("data-text-projection-selected")).toBe(true);
  expect(marker.hasAttribute("data-text-projection-edge")).toBe(false);
  adapter.render(root,"[[key]] 😀본문",{anchor:7,focus:7});
  expect(marker.hasAttribute("data-text-projection-selected")).toBe(false);
  expect(marker.getAttribute("data-text-projection-edge")).toBe("after");
});
