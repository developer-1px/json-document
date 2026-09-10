import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { createPlaneSelectProfile, deleteAffordance, selectAllAffordance } from "@interactive-os/json-document-affordance";
import { canvasCreationStyle } from "../../src/shared/demo-workbench/canvas-demo-document";
import { CanvasHand } from "@interactive-os/json-document-canvas";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { DocumentDemoRoute } from "../../src/routes/document-demo/DocumentDemoRoute";

afterEach(cleanup);

test.each(["metaKey", "ctrlKey"] as const)("Canvas preserves %s modifier facts for selection and deletion", (modifier) => {
  const editor = createObjectEditor({ profile: "canvas/1", width: 1280, height: 720, objects: [
    { id: "a", kind: "rectangle", label: "A", color: "blue", x: 100, y: 100, width: 100, height: 100 },
    { id: "b", kind: "rectangle", label: "B", color: "green", x: 300, y: 100, width: 100, height: 100 },
  ] });
  render(<CanvasHand editor={editor} creationStyle={canvasCreationStyle} selectProfile={createPlaneSelectProfile()} />);
  const canvas = screen.getByRole("group", { name: "Canvas slide" });
  const objects = () => canvas.querySelectorAll("[data-canvas-object]");
  const selected = () => editor.snapshot.selection.keys;
  const count = objects().length;
  expect(count).toBeGreaterThan(1);
  const initialSelection = selected().length;
  for (const extra of [{ altKey: true }, { shiftKey: true }, { altKey: true, shiftKey: true }]) {
    expect(fireEvent.keyDown(canvas, { key: "a", [modifier]: true, ...extra })).toBe(true);
    expect(selected().length).toBe(initialSelection);
  }
  expect(fireEvent.keyDown(canvas, { key: "a", [modifier]: true })).toBe(false);
  const selectionCount = selected().length;
  expect(selectionCount).toBeGreaterThan(0);
  fireEvent.keyDown(canvas, { key: "a", [modifier]: true });
  expect(selected().length).toBe(selectionCount);
  expect(fireEvent.keyDown(canvas, { key: "Backspace", [modifier]: true })).toBe(true);
  expect(objects().length).toBe(count);
  expect(selected().length).toBe(selectionCount);
  expect(fireEvent.keyDown(canvas, { key: "Backspace" })).toBe(false);
  expect(objects().length).toBe(count - selectionCount);
});

test("Document select-all preserves its scope, repetition, and native input ownership", () => {
  render(<DocumentDemoRoute />);
  const document = screen.getByLabelText("Editable document");
  const surface = document.querySelector<HTMLElement>('[tabindex="0"]')!;
  const selected = () => document.querySelectorAll('article[data-block-id][data-selected="true"]');
  const initial = selected().length;
  expect(fireEvent.keyDown(surface, { key: "a", ctrlKey: true, altKey: true })).toBe(true);
  expect(selected().length).toBe(initial);
  const input = document.querySelector("input, textarea")!;
  expect(input).not.toBeNull();
  expect(fireEvent.keyDown(input, { key: "a", ctrlKey: true })).toBe(true);
  expect(selected().length).toBe(initial);
  expect(fireEvent.keyDown(surface, { key: "a", ctrlKey: true })).toBe(false);
  const count = document.querySelectorAll("article[data-block-id]").length;
  expect(selected().length).toBe(count);
  fireEvent.keyDown(surface, { key: "a", ctrlKey: true });
  expect(selected().length).toBe(count);
});

test("native KeyboardEvent properties reach the public Affordance APIs", () => {
  expect(deleteAffordance(new KeyboardEvent("keydown", { key: "Backspace", ctrlKey: true })).hand).toBeNull();
  expect(deleteAffordance(new KeyboardEvent("keydown", { key: "Backspace" })).hand).toEqual({ type: "delete" });
  expect(selectAllAffordance(new KeyboardEvent("keydown", { key: "a", metaKey: true, altKey: true }), { allSelected: false }).hand).toBeNull();
  expect(selectAllAffordance(new KeyboardEvent("keydown", { key: "a", metaKey: true }), { allSelected: false }).hand).toEqual({ type: "select-all" });
});
