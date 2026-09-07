import { createJSONDocument } from "@interactive-os/json-document";
import { afterEach, expect, it, vi } from "vitest";
import { createContentEditableBinding } from "../src/index.js";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it.each(["timer", "trailing-input"])(
  "publishes the latest model when composition tail ends via %s",
  (ending) => {
    vi.useFakeTimers();
    const json = createJSONDocument({ title: "ab" });
    const root = document.createElement("div");
    root.contentEditable = "true";
    document.body.append(root);
    const binding = createContentEditableBinding({
      document: json,
      pointer: "/title",
      root,
    });
    const unbind = binding.bind();
    try {
      root.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
      root.textContent = "ab한";
      root.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
      );
      expect(json.at("/title")).toMatchObject({ ok: true, value: "ab한" });
      json.commit([{ op: "replace", path: "/title", value: "latest" }]);
      if (ending === "timer") vi.runAllTimers();
      else
        root.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertFromComposition",
            data: "한",
          }),
        );
      expect(root.textContent).toBe("latest");
      root.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: "!",
        }),
      );
      root.textContent += "!";
      root.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: "!",
        }),
      );
      expect(json.at("/title")).toMatchObject({ ok: true, value: "latest!" });
    } finally {
      unbind();
    }
  },
);
