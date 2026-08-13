import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { ContentEditable } from "../src/index.js";

afterEach(cleanup);

function input(
  type: "beforeinput" | "input",
  inputType: string,
): InputEvent {
  return new InputEvent(type, {
    bubbles: true,
    cancelable: type === "beforeinput",
    inputType,
  });
}

describe("ContentEditable", () => {
  test("mounts a leased root and commits typed text to the document", () => {
    const json = createJSONDocument({ title: "Draft" });

    render(
      <ContentEditable
        aria-label="Title"
        document={json}
        pointer="/title"
      />,
    );

    const root = screen.getByRole("textbox", { name: "Title" });
    expect(root.textContent).toBe("Draft");

    act(() => {
      root.replaceChildren(globalThis.document.createTextNode("Ready"));
      root.dispatchEvent(input("beforeinput", "insertText"));
      root.dispatchEvent(input("input", "insertText"));
    });

    expect(json.value).toEqual({ title: "Ready" });
    expect(root.textContent).toBe("Ready");
  });
});
