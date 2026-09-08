import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ANNOTATION_PROFILE_V1, createAnnotationEditor, type AnnotationDocument } from "@interactive-os/json-document-editing";
import { AnnotationHand, annotationTools } from "../src/index.js";

const document: AnnotationDocument = { profile: ANNOTATION_PROFILE_V1, id: "test", sources: [{ id: "image", src: "/image.png", width: 100, height: 80 }], annotations: [] };
const rasterStyle = { stroke: "red", fill: "red", lineWidth: 2, labelFont: "12px sans-serif" };

afterEach(cleanup);

describe("AnnotationHand", () => {
  test("publishes one descriptor for every default tool", () => {
    expect(annotationTools.map(({ id, shortcut }) => [id, shortcut])).toEqual([["select", "V"], ["comment", "C"], ["draw", "D"], ["arrow", "A"], ["like", "L"], ["dislike", "K"]]);
  });

  test("renders the canonical canvas and configurable tool set", () => {
    render(<AnnotationHand editor={createAnnotationEditor(document)} sourceUrl="/image.png" createId={() => "next"} tool="comment" onToolChange={() => {}} rasterStyle={rasterStyle} enabledTools={["select", "comment"]} />);
    expect(screen.getByRole("application", { name: "Raster annotation canvas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Draw" })).toBeNull();

  });
});


test("the Host controls tools; modified keys and IME do not invoke ordinary commands", () => {
  const editor = createAnnotationEditor(document);
  const onToolChange = vi.fn();
  const undo = vi.spyOn(editor, "undo"), redo = vi.spyOn(editor, "redo"), dispatch = vi.spyOn(editor, "dispatch");
  const props = { editor, sourceUrl: "/image.png", createId: () => "next", rasterStyle, onToolChange };
  const view = render(<AnnotationHand {...props} tool="comment" />);
  const canvas = screen.getByRole("application");
  fireEvent.click(screen.getByRole("button", { name: "Draw" }));
  expect(onToolChange).toHaveBeenLastCalledWith("draw");
  expect(canvas.getAttribute("data-tool")).toBe("comment");
  view.rerender(<AnnotationHand {...props} tool="draw" />);
  expect(canvas.getAttribute("data-tool")).toBe("draw");
  onToolChange.mockClear(); dispatch.mockClear();
  for (const modifiers of [{ altKey: true }, { ctrlKey: true }, { shiftKey: true }, { isComposing: true }]) fireEvent.keyDown(canvas, { key: "c", ...modifiers });
  expect(onToolChange).not.toHaveBeenCalled();
  fireEvent.keyDown(canvas, { key: "c" });
  expect(onToolChange).toHaveBeenLastCalledWith("comment");
  fireEvent.keyDown(canvas, { key: "z", metaKey: true });
  fireEvent.keyDown(canvas, { key: "Z", ctrlKey: true, shiftKey: true });
  expect(undo).toHaveBeenCalledTimes(1); expect(redo).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(canvas, { key: "z", ctrlKey: true, altKey: true });
  fireEvent.keyDown(canvas, { key: "z", metaKey: true, isComposing: true });
  expect(undo).toHaveBeenCalledTimes(1);
});
