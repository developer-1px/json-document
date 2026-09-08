/** @vitest-environment jsdom */
import { afterEach, expect, it } from "vitest";
import { isWebEditingHostTarget } from "../src/index.js";

afterEach(() => document.body.replaceChildren());

it("keeps root and inherited text targets, excluding every nested input boundary", () => {
  const root = document.createElement("div");
  root.contentEditable = "true";
  root.innerHTML =
    '<p>outer <span contenteditable="inherit">inherited</span></p>';
  document.body.append(root);
  expect(isWebEditingHostTarget(root, root)).toBe(true);
  expect(
    isWebEditingHostTarget(root, root.querySelector("p")!.firstChild),
  ).toBe(true);
  expect(
    isWebEditingHostTarget(root, root.querySelector("span")!.firstChild),
  ).toBe(true);
  for (const markup of [
    "<input>",
    "<textarea>x</textarea>",
    "<select><option>x</option></select>",
    "<div contenteditable>x</div>",
    '<div contenteditable="true">x</div>',
    '<div contenteditable="plaintext-only">x</div>',
    '<div contenteditable="false">x</div>',
  ]) {
    const container = document.createElement("div");
    container.innerHTML = markup;
    root.append(container);
    const control = container.firstElementChild!;
    expect(isWebEditingHostTarget(root, control)).toBe(false);
    if (control.firstChild)
      expect(isWebEditingHostTarget(root, control.firstChild)).toBe(false);
  }
  expect(isWebEditingHostTarget(root, document.body)).toBe(false);
  expect(isWebEditingHostTarget(root, null)).toBe(false);
  expect(isWebEditingHostTarget({}, root)).toBe(false);
});

it("uses the root's owner-document realm", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const root = frame.contentDocument!.createElement("div");
  root.innerHTML = "<span>text</span><input>";
  frame.contentDocument!.body.append(root);
  expect(isWebEditingHostTarget(root, root.firstChild!.firstChild)).toBe(true);
  expect(isWebEditingHostTarget(root, root.lastChild)).toBe(false);
});
