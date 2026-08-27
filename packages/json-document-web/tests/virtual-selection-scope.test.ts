// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import { registerWebVirtualSelectionScope } from "../src/index.js";

afterEach(() => {
  document.body.replaceChildren();
  document.getSelection()?.removeAllRanges();
});

describe("Web virtual selection scope", () => {
  test("shows a native Range for mounted content and copies the complete model text", () => {
    const root = element("section", "mounted first\nmounted last");
    document.body.append(root);
    const allText = Array.from({ length: 5_000 }, (_, index) => `model row ${index}`).join("\n");
    const registration = registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => allText,
      selectionRef: { current: root },
    });

    root.dispatchEvent(shortcut("a"));

    expect(document.getSelection()?.toString()).toBe(root.textContent);
    const clipboard = clipboardEvent();
    root.dispatchEvent(clipboard.event);
    expect(clipboard.setData).toHaveBeenCalledWith("text/plain", allText);
    expect(clipboard.event.defaultPrevented).toBe(true);
    registration.unregister();
  });

  test("prefers the nearest contained scope over the fallback scope", () => {
    const outer = element("section", "outer");
    const inner = element("pre", "inner");
    outer.append(inner);
    document.body.append(outer);
    const fallback = registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => "complete outer model",
      selectionRef: { current: outer },
    });
    const contained = registerWebVirtualSelectionScope(document, {
      activation: "contained",
      readAllText: () => "complete inner model",
      selectionRef: { current: inner },
    });

    inner.dispatchEvent(shortcut("a"));
    const clipboard = clipboardEvent();
    inner.dispatchEvent(clipboard.event);

    expect(document.getSelection()?.toString()).toBe("inner");
    expect(clipboard.setData).toHaveBeenCalledWith("text/plain", "complete inner model");
    contained.unregister();
    fallback.unregister();
  });

  test("keeps editable selection native and clears model copy after a partial selection", () => {
    const root = element("section", "alpha beta");
    const input = element("input", "") as HTMLInputElement;
    root.append(input);
    document.body.append(root);
    const registration = registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => "complete model",
      selectionRef: { current: root },
    });

    expect(input.dispatchEvent(shortcut("a"))).toBe(true);
    expect(document.getSelection()?.rangeCount).toBe(0);

    root.dispatchEvent(shortcut("a"));
    const partial = document.createRange();
    partial.setStart(root.firstChild!, 0);
    partial.setEnd(root.firstChild!, 5);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(partial);
    document.dispatchEvent(new Event("selectionchange"));
    const clipboard = clipboardEvent();
    root.dispatchEvent(clipboard.event);
    expect(clipboard.setData).not.toHaveBeenCalled();
    expect(clipboard.event.defaultPrevented).toBe(false);
    registration.unregister();
  });

  test("remembers a pointer-selected scope for document-level shortcuts and Escape", () => {
    const fallbackRoot = element("section", "fallback mounted");
    const panelRoot = element("section", "panel mounted");
    document.body.append(fallbackRoot, panelRoot);
    const fallback = registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => "fallback model",
      selectionRef: { current: fallbackRoot },
    });
    const contained = registerWebVirtualSelectionScope(document, {
      activation: "contained",
      readAllText: () => "panel model",
      selectionRef: { current: panelRoot },
    });

    panelRoot.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(shortcut("a"));
    expect(document.getSelection()?.toString()).toBe("panel mounted");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }));
    expect(document.getSelection()?.rangeCount).toBe(0);
    contained.unregister();
    fallback.unregister();
  });

  test("allows one fallback and removes document listeners after cleanup", () => {
    const root = element("section", "mounted");
    document.body.append(root);
    const first = registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => "model",
      selectionRef: { current: root },
    });
    expect(() => registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => "other",
      selectionRef: { current: root },
    })).toThrow("only one fallback");
    first.unregister();

    root.dispatchEvent(shortcut("a"));
    expect(document.getSelection()?.rangeCount).toBe(0);
    const replacement = registerWebVirtualSelectionScope(document, {
      activation: "fallback",
      readAllText: () => "replacement",
      selectionRef: { current: root },
    });
    replacement.unregister();
  });
});

function element(tagName: string, text: string): HTMLElement {
  const value = document.createElement(tagName);
  value.textContent = text;
  return value;
}

function shortcut(key: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ctrlKey: true, key });
}

function clipboardEvent() {
  const event = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
  const setData = vi.fn();
  Object.defineProperty(event, "clipboardData", { value: { setData } });
  return { event, setData };
}
