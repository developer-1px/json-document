import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";
import { CanvasHand } from "../src/index.js";
import { createPlaneSelectProfile } from "@interactive-os/json-document-affordance";
import * as web from "@interactive-os/json-document-web";

const blank: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };
const style = { color: "#abcdef", textColor: "#123456", fontSize: 32, strokeWidth: 3 };
beforeAll(() => {
  class Pointer extends MouseEvent { readonly pointerId: number; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; } }
  vi.stubGlobal("PointerEvent", Pointer);
  const captures = new WeakMap<Element, number>();
  Element.prototype.setPointerCapture = function (id) { captures.set(this, id); };
  Element.prototype.hasPointerCapture = function (id) { return captures.get(this) === id; };
  Element.prototype.releasePointerCapture = function () { captures.delete(this); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup(document = blank, selectProfile = createPlaneSelectProfile()) {
  const source = createJSONDocument(document);
  const commits = vi.fn(); source.subscribe(commits);
  let id = 0;
  const editor = createObjectEditor(source, { createId: () => `object-${++id}` });
  const view = render(<CanvasHand editor={editor} creationStyle={style} selectProfile={selectProfile} />);
  const svg = screen.getByRole("group", { name: "Canvas slide" });
  Object.defineProperty(svg, "viewBox", { value: { baseVal: { x: 0, y: 0, width: 1280, height: 720 } } });
  svg.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360, toJSON() {} });
  const value = () => editor.snapshot.value as CanvasDocument;
  return { ...view, svg, editor, source, commits, value };
}
function event(x: number, y: number, pointerId = 1) { return { clientX: x, clientY: y, pointerId, button: 0, bubbles: true }; }
function rectangle(svg: Element) {
  fireEvent.click(screen.getByRole("button", { name: "사각형" }));
  fireEvent.pointerDown(svg, event(40, 50)); fireEvent.pointerMove(svg, event(140, 100)); fireEvent.pointerUp(svg, event(140, 100));
}

const populated: CanvasDocument = { ...blank, objects: [
  { id: "a", kind: "text", label: "Title", fontSize: 24, color: "black", x: 100, y: 100, width: 100, height: 100 },
  { id: "b", kind: "rectangle", label: "Box", color: "blue", x: 300, y: 100, width: 100, height: 100 },
  { id: "c", kind: "ellipse", label: "Circle", color: "green", x: 600, y: 100, width: 100, height: 100 },
] };
function pick(container: HTMLElement, key: string, shiftKey = false) {
  const target = container.querySelector(`[data-canvas-object="${key}"]`)!;
  fireEvent.pointerDown(target, { ...event(70, 70), shiftKey });
  fireEvent.pointerUp(window, { ...event(70, 70), shiftKey });
}

function clipboardData() {
  const data = new Map<string, string>();
  return { get types() { return [...data.keys()]; }, getData: (format: string) => data.get(format) ?? "", setData: (format: string, value: string) => { data.set(format, value); } };
}
function clipboardEvent(target: Element, operation: "copy" | "cut" | "paste", data: ReturnType<typeof clipboardData> | null) {
  const event = new Event(operation, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: data });
  fireEvent(target, event);
  return event;
}

test("Alt+Shift drag previews originals and copies, switches live modifiers, then commits the set once", () => {
  const { container, svg, editor, value, commits } = setup(populated);
  pick(container, "b", true);
  const before = value(), target = container.querySelector('[data-canvas-object="a"]')!;
  fireEvent.pointerDown(target, { ...event(70, 70), altKey: true, shiftKey: true });
  fireEvent.pointerMove(window, { ...event(120, 90), altKey: true, shiftKey: true });
  expect(value()).toBe(before); expect(commits).not.toHaveBeenCalled();
  expect(container.querySelectorAll("[data-canvas-copy-original]")).toHaveLength(2);
  expect(container.querySelector('[data-canvas-copy-original="a"] foreignObject')?.getAttribute("x")).toBe("100");
  expect(container.querySelector('[data-canvas-copy-preview] foreignObject')?.getAttribute("x")).toBe("200");
  expect(target.getAttribute("y")).toBe("100"); expect((target as SVGElement).style.cursor).toBe("copy");
  fireEvent.keyUp(svg, { key: "Alt", shiftKey: true });
  expect(container.querySelector("[data-canvas-copy-preview]")).toBeNull();
  fireEvent.keyDown(svg, { key: "Alt", altKey: true, shiftKey: true });
  expect(container.querySelector("[data-canvas-copy-preview]")).not.toBeNull();
  fireEvent.pointerUp(window, { ...event(120, 90), altKey: true, shiftKey: true });
  expect(value().objects.slice(0, 3)).toEqual(populated.objects);
  expect(value().objects.slice(3).map((object) => [object.id, object.x, object.y])).toEqual([["object-1", 200, 100], ["object-2", 400, 100]]);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["object-1", "object-2"], primaryKey: "object-1" });
  expect(commits).toHaveBeenCalledOnce();
  fireEvent.keyDown(svg, { key: "z", metaKey: true }); expect(value()).toEqual(before);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["a", "b"], primaryKey: "a" });
});

test("external text paste is literal, repeated placement is visible, and editing retains the native field boundary", () => {
  const { svg, container, value } = setup();
  const data = clipboardData(); data.setData("text/plain", "<b>한글</b>\nSecond line");
  expect(clipboardEvent(svg, "paste", data).defaultPrevented).toBe(true);
  clipboardEvent(svg, "paste", data);
  expect(value().objects.map((object) => [object.kind, object.x, object.y])).toEqual([["text", 24, 24], ["text", 48, 48]]);
  expect(container.querySelector("foreignObject b")).toBeNull();
  const text = container.querySelector('[data-canvas-object="object-2"]')!;
  fireEvent.doubleClick(text);
  const input = screen.getByRole("textbox", { name: "Canvas text" });
  expect(clipboardEvent(input, "paste", data).defaultPrevented).toBe(false);
  expect(value().objects).toHaveLength(2);
});

test("image paste reaches the SVG renderer and existing duplication, Undo, and JSON reopening", async () => {
  const png = "data:image/png;base64,AQID";
  vi.spyOn(web, "readWebRasterFile").mockResolvedValue({ ok: true, dataURL: png, width: 1600, height: 800 });
  const { svg, container, value } = setup();
  const data = { ...clipboardData(), files: [{ name: "picture.png", type: "image/png", size: 3 }] };
  await act(async () => { clipboardEvent(svg, "paste", data); });
  expect(container.querySelector("image")?.getAttribute("href")).toBe(png);
  expect(value().objects[0]).toMatchObject({ kind: "image", width: 960, height: 480 });
  fireEvent.keyDown(svg, { key: "d", metaKey: true }); expect(container.querySelectorAll("image")).toHaveLength(2);
  fireEvent.keyDown(svg, { key: "z", metaKey: true }); expect(container.querySelectorAll("image")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  const json = screen.getByRole("textbox", { name: "Canvas JSON document" }) as HTMLTextAreaElement;
  expect(JSON.parse(json.value).objects[0].source).toBe(png);
  fireEvent.click(screen.getByRole("button", { name: "JSON 열기" }));
  expect(container.querySelector("image")?.getAttribute("href")).toBe(png);
});

test.each(["Escape", "tool", "selection", "unmount"])("pending image paste is cancelled by %s and cannot arrive after the action", async (reason) => {
  let resolve!: (result: web.WebRasterSourceResult) => void;
  const read = vi.spyOn(web, "readWebRasterFile").mockImplementation(() => new Promise((done) => { resolve = done; }));
  const { svg, editor, unmount, value, commits } = setup(populated);
  const data = { ...clipboardData(), files: [{ name: "picture.png", type: "image/png", size: 3 }] };
  clipboardEvent(svg, "paste", data);
  expect(svg.getAttribute("aria-busy")).toBe("true"); expect(screen.getByRole("status").textContent).toContain("Escape");
  if (reason === "Escape") fireEvent.keyDown(svg, { key: "Escape" });
  else if (reason === "tool") fireEvent.click(screen.getByRole("button", { name: "사각형" }));
  else if (reason === "selection") act(() => { editor.dispatch({ type: "selection.set", objectIds: ["b"] }); });
  else unmount();
  expect(read.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  await act(async () => { resolve({ ok: true, dataURL: "data:image/png;base64,AQID", width: 100, height: 100 }); });
  expect(value()).toEqual(populated); expect(commits).not.toHaveBeenCalled();
  if (reason === "Escape") expect(editor.snapshot.selection.keys).toEqual(["a"]);
  if (reason !== "unmount") expect(screen.queryByRole("status")).toBeNull();
});

test.each(["Escape", "pointercancel"])("cancelled Alt duplication (%s) does not allocate IDs or commit", (reason) => {
  const { container, svg, editor, value, commits } = setup(populated);
  const target = container.querySelector('[data-canvas-object="a"]')!;
  fireEvent.pointerDown(target, { ...event(70, 70), altKey: true });
  fireEvent.pointerMove(window, { ...event(120, 90), altKey: true });
  if (reason === "Escape") fireEvent.keyDown(svg, { key: "Escape" }); else fireEvent.pointerCancel(window, event(120, 90));
  fireEvent.pointerUp(window, { ...event(120, 90), altKey: true });
  expect(container.querySelector("[data-canvas-copy-preview]")).toBeNull();
  expect(value()).toEqual(populated); expect(commits).not.toHaveBeenCalled();
  fireEvent.keyDown(svg, { key: "d", ctrlKey: true });
  expect(editor.snapshot.selection.keys).toEqual(["object-1"]);
});

test("duplicate keyboard/toolbar and nudge reuse Editing with selection-preserving Undo", () => {
  const { container, svg, editor, value } = setup(populated);
  pick(container, "b", true);
  fireEvent.keyDown(svg, { key: "d", metaKey: true });
  expect(editor.snapshot.selection.keys).toEqual(["object-1", "object-2"]);
  expect(value().objects[3]!.x).toBe(124);
  fireEvent.click(screen.getByRole("button", { name: "복제" }));
  expect(editor.snapshot.selection.keys).toEqual(["object-3", "object-4"]);
  expect(value().objects[5]!.x).toBe(148);
  fireEvent.keyDown(svg, { key: "ArrowRight" }); fireEvent.keyDown(svg, { key: "ArrowUp", shiftKey: true });
  expect(value().objects[5]).toMatchObject({ x: 149, y: 138 });
  expect(value().objects[6]).toMatchObject({ x: 349, y: 138 });
  fireEvent.keyDown(svg, { key: "z", metaKey: true });
  expect(value().objects[5]).toMatchObject({ x: 149, y: 148 });
  expect(editor.snapshot.selection.keys).toEqual(["object-3", "object-4"]);
});

test("native structured copy/cut/paste crosses Hand instances with text and primary, and one Undo per edit", () => {
  const first = setup(populated);
  act(() => { first.editor.dispatch({ type: "selection.set", objectIds: ["a", "c"], primaryKey: "a" }); });
  const data = clipboardData();
  expect(clipboardEvent(first.svg, "copy", data).defaultPrevented).toBe(true);
  expect(data.getData("text/plain")).toBe("Title\nCircle"); expect(first.commits).not.toHaveBeenCalled();
  expect(clipboardEvent(first.svg, "cut", data).defaultPrevented).toBe(true);
  expect(first.value().objects.map((object) => object.id)).toEqual(["b"]); expect(first.commits).toHaveBeenCalledOnce();
  act(() => { first.editor.undo(); }); expect(first.value()).toEqual(populated);
  first.unmount();
  const second = setup();
  expect(clipboardEvent(second.svg, "paste", data).defaultPrevented).toBe(true);
  expect(second.value().objects.map((object) => [object.id, object.kind, object.x])).toEqual([["object-1", "text", 124], ["object-2", "ellipse", 624]]);
  expect(second.editor.snapshot.selection).toMatchObject({ keys: ["object-1", "object-2"], primaryKey: "object-1" });
  expect(second.commits).toHaveBeenCalledOnce();
  act(() => { second.editor.undo(); }); expect(second.value()).toEqual(blank);
});

test("failed cut and invalid paste are observable and cannot delete or partially insert objects", () => {
  const { svg, value, commits } = setup(populated);
  const refused = { ...clipboardData(), setData() { throw new Error("write refused"); } };
  expect(clipboardEvent(svg, "cut", refused).defaultPrevented).toBe(true);
  expect(screen.getByRole("alert").textContent).toBe("write refused");
  const data = clipboardData(); data.setData("application/vnd.interactive-os.objects+json", "{}");
  clipboardEvent(svg, "paste", data);
  expect(screen.getByRole("alert").textContent).toBe("clipboard.invalid");
  expect(value()).toEqual(populated); expect(commits).not.toHaveBeenCalled();
});

test("native clipboard chords, text input, JSON input and IME are not stolen by object editing", () => {
  const { svg, value, commits } = setup(populated);
  for (const key of ["c", "x", "v"]) expect(fireEvent.keyDown(svg, { key, metaKey: true })).toBe(true);
  fireEvent.keyDown(svg, { key: "d", ctrlKey: true, isComposing: true });
  fireEvent.keyDown(svg, { key: "F2" });
  const text = screen.getByRole("textbox", { name: "Canvas text" });
  for (const operation of ["copy", "cut", "paste"] as const) expect(clipboardEvent(text, operation, clipboardData()).defaultPrevented).toBe(false);
  fireEvent.keyDown(text, { key: "d", metaKey: true }); fireEvent.keyDown(text, { key: "ArrowRight" });
  fireEvent.keyDown(text, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  const json = screen.getByRole("textbox", { name: "Canvas JSON document" });
  expect(clipboardEvent(json, "cut", clipboardData()).defaultPrevented).toBe(false);
  expect(value()).toEqual(populated); expect(commits).not.toHaveBeenCalled();
});

test("Canvas consumes an injected profile for click/Shift/keyboard while focus remains independent", () => {
  const profile = createPlaneSelectProfile();
  const begin = vi.spyOn(profile, "begin"), keyDown = vi.spyOn(profile, "keyDown");
  const { container, svg, editor, value, commits } = setup(populated, profile);
  pick(container, "c", true); expect(editor.snapshot.selection.keys).toEqual(["a", "c"]);
  pick(container, "a", true); expect(editor.snapshot.selection.keys).toEqual(["c"]);
  pick(container, "b"); expect(editor.snapshot.selection.keys).toEqual(["b"]);
  expect(begin).toHaveBeenCalledTimes(3);
  const a = container.querySelector('[data-canvas-object="a"]')!;
  fireEvent.focus(a); expect(editor.snapshot.selection.keys).toEqual(["b"]);
  fireEvent.keyDown(a, { key: " ", shiftKey: true }); expect(editor.snapshot.selection.keys).toEqual(["a", "b"]);
  expect(editor.snapshot.selection.primaryKey).toBe("a");
  for (let i = 0; i < 2; i++) fireEvent.keyDown(svg, { key: "a", metaKey: true });
  expect(editor.snapshot.selection.keys).toEqual(["a", "b", "c"]); expect(editor.snapshot.selection.primaryKey).toBe("a");
  expect(keyDown).toHaveBeenCalled();
  expect(container.querySelectorAll('[aria-pressed="true"][data-canvas-object]')).toHaveLength(3);
  fireEvent.pointerDown(svg, event(500, 300)); fireEvent.pointerUp(svg, event(500, 300));
  expect(editor.snapshot.selection.keys).toEqual([]); expect(value()).toEqual(populated);
  expect(commits).not.toHaveBeenCalled(); expect(editor.snapshot.canUndo).toBe(false);
});

test("Enter activates the focused object instead of editing an unrelated primary", () => {
  const { container, editor } = setup(populated);
  const box = container.querySelector('[data-canvas-object="b"]')!;
  fireEvent.focus(box); fireEvent.keyDown(box, { key: "Enter" });
  expect(editor.snapshot.selection.keys).toEqual(["b"]);
  expect(screen.queryByRole("textbox", { name: "Canvas text" })).toBeNull();
  const text = container.querySelector('[data-canvas-object="a"]')!;
  fireEvent.focus(text); fireEvent.keyDown(text, { key: "Enter" });
  expect(editor.snapshot.selection.keys).toEqual(["a"]);
  expect(screen.getByRole("textbox", { name: "Canvas text" })).toBeTruthy();
});

test("marquee previews replace and Shift-add from the base without committing the document", () => {
  const { container, svg, editor, value, commits } = setup(populated);
  pick(container, "c");
  fireEvent.pointerDown(svg, event(20, 20)); fireEvent.pointerMove(svg, event(210, 110));
  expect(editor.snapshot.selection.keys).toEqual(["c"]);
  expect(container.querySelectorAll("[data-selection-outline]")).toHaveLength(2);
  expect(container.querySelector("[data-canvas-marquee]")).not.toBeNull();
  fireEvent.pointerUp(svg, event(210, 110)); expect(editor.snapshot.selection.keys).toEqual(["a", "b"]);
  expect(container.querySelector("[data-canvas-marquee]")).toBeNull();
  fireEvent.pointerDown(svg, { ...event(280, 20), shiftKey: true });
  fireEvent.pointerMove(svg, event(360, 110)); fireEvent.pointerUp(svg, event(360, 110));
  expect(editor.snapshot.selection.keys).toEqual(["a", "b", "c"]);
  expect(value()).toEqual(populated); expect(commits).not.toHaveBeenCalled();
});

test("dragging a selected hit moves the set once; one Undo restores the set and Delete removes it atomically", () => {
  const { container, svg, editor, value, commits } = setup(populated);
  pick(container, "b", true);
  const before = value(), target = container.querySelector('[data-canvas-object="a"]')!;
  fireEvent.pointerDown(target, event(70, 70)); fireEvent.pointerMove(window, event(100, 100));
  expect(value()).toBe(before); expect(commits).not.toHaveBeenCalled();
  expect(container.querySelector('[data-canvas-object="b"]')?.getAttribute("x")).toBe("360");
  fireEvent.pointerUp(window, event(100, 100));
  expect(value().objects.map((object) => object.x)).toEqual([160, 360, 600]);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["a", "b"], primaryKey: "a" });
  expect(commits).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(svg, { key: "z", metaKey: true }); expect(value()).toEqual(before);
  expect(editor.snapshot.canUndo).toBe(false); expect(editor.snapshot.selection.keys).toEqual(["a", "b"]);
  fireEvent.keyDown(svg, { key: "z", metaKey: true, shiftKey: true });
  const moved = value(); commits.mockClear();
  fireEvent.keyDown(svg, { key: "Delete" }); expect(value().objects.map((object) => object.id)).toEqual(["c"]);
  expect(commits).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(svg, { key: "z", metaKey: true }); expect(value()).toEqual(moved);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["a", "b"], primaryKey: "a" });
});

test.each(["Escape", "pointercancel", "lostpointercapture"])("%s cancels marquee before clearing the base selection", (reason) => {
  const { container, svg, editor, value, commits } = setup(populated);
  fireEvent.pointerDown(svg, event(20, 20)); fireEvent.pointerMove(svg, event(220, 110));
  if (reason === "Escape") fireEvent.keyDown(svg, { key: reason });
  else if (reason === "pointercancel") fireEvent.pointerCancel(svg, event(220, 110));
  else fireEvent.lostPointerCapture(svg, event(220, 110));
  fireEvent.pointerUp(svg, event(220, 110));
  expect(container.querySelector("[data-canvas-marquee]")).toBeNull();
  expect(editor.snapshot.selection.keys).toEqual(["a"]); expect(value()).toEqual(populated);
  expect(commits).not.toHaveBeenCalled(); expect(editor.snapshot.canUndo).toBe(false);
  fireEvent.keyDown(svg, { key: "Escape" }); expect(editor.snapshot.selection.keys).toEqual([]);
});

test("only primary resizes and edits text while retaining the selected set", () => {
  const { container, svg, editor, value, commits } = setup(populated);
  act(() => { editor.dispatch({ type: "selection.set", objectIds: ["a", "b"], primaryKey: "a" }); });
  expect(container.querySelectorAll("[data-resize-edge]")).toHaveLength(4);
  const handle = container.querySelector('[data-resize-edge="se"]')!;
  fireEvent.pointerDown(handle, event(100, 100)); fireEvent.pointerMove(window, event(120, 115)); fireEvent.pointerUp(window, event(120, 115));
  expect(value().objects[0]!.width).toBeCloseTo(140); expect(value().objects[0]!.height).toBeCloseTo(130);
  expect(value().objects[1]).toEqual(populated.objects[1]);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["a", "b"], primaryKey: "a" });
  expect(commits).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(svg, { key: "F2" });
  const input = screen.getByRole("textbox", { name: "Canvas text" });
  fireEvent.keyDown(input, { key: "a", metaKey: true }); expect(editor.snapshot.selection.keys).toEqual(["a", "b"]);
  fireEvent.change(input, { target: { value: "Primary only" } });
  fireEvent.keyDown(input, { key: "Enter", metaKey: true });
  expect(value().objects[0]!.label).toBe("Primary only"); expect(value().objects[1]).toEqual(populated.objects[1]);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["a", "b"], primaryKey: "a" });
  expect(commits).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(svg, { key: "z", metaKey: true }); expect(value().objects[0]!.label).toBe("Title");
});

test("external document replacement cancels marquee and stale release cannot select removed targets", () => {
  const { container, svg, source, editor, value } = setup(populated);
  fireEvent.pointerDown(svg, event(20, 20)); fireEvent.pointerMove(svg, event(220, 110));
  act(() => { source.commit([{ op: "remove", path: "/objects/1" }]); });
  fireEvent.pointerUp(svg, event(220, 110));
  expect(container.querySelector("[data-canvas-marquee]")).toBeNull();
  expect(editor.snapshot.selection.keys).toEqual(["a"]);
  expect(value().objects.map((object) => object.id)).toEqual(["a", "c"]);
});

test("external selection changes supersede a pending preview without a stale selection commit", () => {
  const { container, svg, editor, commits } = setup(populated);
  fireEvent.pointerDown(svg, event(20, 20)); fireEvent.pointerMove(svg, event(220, 110));
  act(() => { editor.dispatch({ type: "selection.set", objectIds: ["c"] }); });
  fireEvent.pointerUp(svg, event(220, 110));
  expect(container.querySelector("[data-canvas-marquee]")).toBeNull();
  expect(editor.snapshot.selection.keys).toEqual(["c"]); expect(commits).not.toHaveBeenCalled();
});

test("every toolbar control shares icon, accessible name and canonical tooltip without losing state", () => {
  const { svg } = setup();
  const toolbar = within(screen.getByRole("toolbar", { name: "Canvas tools" }));
  const labels = ["선택", "글자", "사각형", "타원", "그리기", "실행 취소", "다시 실행", "복제", "삭제", "JSON"];
  expect(toolbar.getAllByRole("button")).toHaveLength(labels.length);
  for (const label of labels) {
    const button = toolbar.getByRole("button", { name: label });
    expect(button.textContent).toBe("");
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(button.getAttribute("data-ui-presentation")).toBe("icon");
    expect(button.getAttribute("aria-describedby")).toBe(toolbar.getByRole("tooltip", { name: label }).id);
    expect(button.hasAttribute("title")).toBe(false);
  }
  expect(toolbar.getByRole("button", { name: "선택" }).getAttribute("aria-pressed")).toBe("true");
  expect((toolbar.getByRole("button", { name: "삭제" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(toolbar.getByRole("button", { name: "그리기" }));
  expect(svg.getAttribute("data-tool")).toBe("path");
  expect(toolbar.getByRole("button", { name: "그리기" }).getAttribute("aria-pressed")).toBe("true");
  expect(toolbar.getByRole("button", { name: "선택" }).getAttribute("aria-pressed")).toBe("false");
});

test("creation is transient until release, scales coordinates and selects the result with one undo step", () => {
  const { svg, value, editor, commits } = setup();
  fireEvent.click(screen.getByRole("button", { name: "사각형" }));
  fireEvent.pointerDown(svg, event(40, 50));
  fireEvent.pointerMove(svg, event(140, 100));
  expect(value()).toEqual(blank); expect(commits).not.toHaveBeenCalled();
  fireEvent.pointerUp(svg, event(140, 100));
  expect(value().objects[0]).toMatchObject({ kind: "rectangle", x: 80, y: 100, width: 200, height: 100 });
  expect(editor.snapshot.selection.keys).toEqual(["object-1"]);
  expect(svg.getAttribute("data-tool")).toBe("select");
  expect(commits).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "실행 취소" })); expect(value()).toEqual(blank);
  fireEvent.click(screen.getByRole("button", { name: "다시 실행" })); expect(value().objects).toHaveLength(1);
});

test.each(["escape", "pointercancel", "lostpointercapture"])("%s cancels creation without a commit or history", (reason) => {
  const { svg, value, editor } = setup();
  fireEvent.click(screen.getByRole("button", { name: "타원" }));
  fireEvent.pointerDown(svg, event(40, 50)); fireEvent.pointerMove(svg, event(140, 100));
  if (reason === "escape") fireEvent.keyDown(svg, { key: "Escape" });
  else if (reason === "pointercancel") fireEvent.pointerCancel(svg, event(140, 100));
  else fireEvent.lostPointerCapture(svg, event(140, 100));
  fireEvent.pointerUp(svg, event(140, 100));
  expect(value()).toEqual(blank); expect(editor.snapshot.canUndo).toBe(false);
});

test("move and resize share preview geometry, cancel safely and commit exactly once", () => {
  const { svg, value, commits, container } = setup(); rectangle(svg);
  const target = container.querySelector("[data-canvas-object]")!;
  const before = value(); commits.mockClear();
  fireEvent.pointerDown(target, event(70, 70)); fireEvent.pointerMove(window, event(100, 100));
  expect(value()).toBe(before);
  fireEvent.keyDown(svg, { key: "Escape" }); fireEvent.pointerUp(window, event(100, 100));
  expect(value()).toBe(before); expect(commits).not.toHaveBeenCalled();
  fireEvent.pointerDown(target, event(70, 70)); fireEvent.pointerMove(window, event(100, 100)); fireEvent.pointerUp(window, event(100, 100));
  expect(value().objects[0]).toMatchObject({ x: 140, y: 160 }); expect(commits).toHaveBeenCalledTimes(1);
  const handle = container.querySelector('[data-resize-edge="se"]')!;
  fireEvent.pointerDown(handle, event(170, 130)); fireEvent.pointerMove(window, event(200, 160));
  expect(value().objects[0]).toMatchObject({ width: 200, height: 100 });
  fireEvent.pointerUp(window, event(200, 160));
  expect(value().objects[0]).toMatchObject({ width: 260, height: 160 }); expect(commits).toHaveBeenCalledTimes(2);
});

test("text draft supports IME, cancellation and one commit without capturing native editing shortcuts", () => {
  const { svg, value, commits, container } = setup();
  fireEvent.click(screen.getByRole("button", { name: "글자" }));
  fireEvent.pointerDown(svg, event(40, 50)); fireEvent.pointerUp(svg, event(40, 50));
  const input = screen.getByRole("textbox", { name: "Canvas text" });
  fireEvent.change(input, { target: { value: "안녕하세요\nSlide" } });
  fireEvent.keyDown(input, { key: "Enter", ctrlKey: true, isComposing: true });
  expect(value().objects[0]!.label).toBe("Text");
  fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
  expect(value().objects[0]!.label).toBe("안녕하세요\nSlide"); expect(commits).toHaveBeenCalledTimes(2);
  fireEvent.doubleClick(container.querySelector("[data-canvas-object]")!);
  fireEvent.change(screen.getByRole("textbox", { name: "Canvas text" }), { target: { value: "Discard" } });
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Canvas text" }), { key: "Escape" });
  expect(value().objects[0]!.label).toBe("안녕하세요\nSlide"); expect(commits).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(svg, { key: "z", metaKey: true }); expect(value().objects[0]!.label).toBe("Text");
});

test("drawing samples are transient and a foreign pointer cannot finish the gesture", () => {
  const { svg, value, commits } = setup();
  fireEvent.click(screen.getByRole("button", { name: "그리기" }));
  fireEvent.pointerDown(svg, event(20, 20));
  fireEvent.pointerMove(svg, event(40, 60)); fireEvent.pointerMove(svg, event(100, 70));
  fireEvent.pointerUp(svg, event(120, 80, 9)); expect(value().objects).toHaveLength(0);
  fireEvent.pointerUp(svg, event(120, 80));
  expect(value().objects[0]).toMatchObject({ kind: "path", x: 40, y: 40, width: 200, height: 120 }); expect(commits).toHaveBeenCalledTimes(1);
});

test("invalid JSON leaves document/history intact; reopening the saved JSON restores the slide", () => {
  const { svg, value, editor } = setup(); rectangle(svg);
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  const field = screen.getByRole("textbox", { name: "Canvas JSON document" });
  const saved = (field as HTMLTextAreaElement).value, before = editor.snapshot;
  fireEvent.change(field, { target: { value: '{"profile":"canvas/1","objects":[]}' } });
  fireEvent.click(screen.getByRole("button", { name: "JSON 열기" }));
  expect(screen.getByRole("alert")).toBeTruthy(); expect(editor.snapshot).toEqual(before);
  fireEvent.click(screen.getByRole("button", { name: "삭제" })); expect(value().objects).toHaveLength(0);
  fireEvent.change(field, { target: { value: saved } });
  fireEvent.click(screen.getByRole("button", { name: "JSON 열기" }));
  expect(value()).toEqual(JSON.parse(saved)); expect(editor.snapshot.selection.keys).toEqual([]);
});

test("external replacement cancels an in-flight transform and unmount releases pointer continuation", () => {
  const { svg, container, source, value, unmount, commits } = setup(); rectangle(svg);
  fireEvent.pointerDown(container.querySelector("[data-canvas-object]")!, event(70, 70));
  fireEvent.pointerMove(window, event(90, 90));
  act(() => { source.commit([{ op: "replace", path: "/objects/0/x", value: 999 }]); });
  fireEvent.pointerUp(window, event(100, 100)); expect(value().objects[0]!.x).toBe(999);
  fireEvent.pointerDown(container.querySelector("[data-canvas-object]")!, event(70, 70));
  commits.mockClear(); unmount();
  const end = new PointerEvent("pointerup", { ...event(100, 100) });
  const observer = vi.fn(); window.addEventListener("pointerup", observer);
  window.dispatchEvent(end); window.removeEventListener("pointerup", observer);
  expect(observer).toHaveBeenCalled(); expect(commits).not.toHaveBeenCalled();
});
