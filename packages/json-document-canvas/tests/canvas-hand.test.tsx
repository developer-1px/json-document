import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";
import { CanvasHand } from "../src/index.js";

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
afterEach(cleanup);

function setup(document = blank) {
  const source = createJSONDocument(document);
  const commits = vi.fn(); source.subscribe(commits);
  let id = 0;
  const editor = createObjectEditor(source, { createId: () => `object-${++id}` });
  const view = render(<CanvasHand editor={editor} creationStyle={style} />);
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

test("every toolbar control shares icon, accessible name and canonical tooltip without losing state", () => {
  const { svg } = setup();
  const toolbar = within(screen.getByRole("toolbar", { name: "Canvas tools" }));
  const labels = ["선택", "글자", "사각형", "타원", "그리기", "실행 취소", "다시 실행", "삭제", "JSON"];
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
