import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { useVirtualSelectionScope } from "../src/index.js";

describe("useVirtualSelectionScope", () => {
  test("binds a callback ref and reads the latest model text after rerender", () => {
    function Fixture() {
      const [text, setText] = useState("first model");
      const ref = useVirtualSelectionScope({ activation: "fallback", readAllText: () => text });
      return <><button onClick={() => setText("latest model")}>update</button><section ref={ref}>mounted</section></>;
    }
    const view = render(<Fixture />);
    fireEvent.click(screen.getByText("update"));
    fireEvent.keyDown(document.body, { ctrlKey: true, key: "a" });
    const clipboard = clipboardEvent();
    fireEvent(document.body, clipboard.event);
    expect(clipboard.setData).toHaveBeenCalledWith("text/plain", "latest model");

    view.unmount();
    document.getSelection()?.removeAllRanges();
    fireEvent.keyDown(document.body, { ctrlKey: true, key: "a" });
    expect(document.getSelection()?.rangeCount).toBe(0);
  });

  test("rebinds when the callback ref receives a replacement element", () => {
    function Fixture() {
      const [replacement, setReplacement] = useState(false);
      const ref = useVirtualSelectionScope({ activation: "fallback", readAllText: () => "complete model" });
      return <><button onClick={() => setReplacement(true)}>replace</button>{replacement
        ? <article ref={ref}>replacement mounted</article>
        : <section ref={ref}>initial mounted</section>}</>;
    }
    render(<Fixture />);
    fireEvent.click(screen.getByText("replace"));
    fireEvent.keyDown(document.body, { ctrlKey: true, key: "a" });
    expect(document.getSelection()?.toString()).toBe("replacement mounted");
  });
});

function clipboardEvent() {
  const event = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
  const setData = vi.fn();
  Object.defineProperty(event, "clipboardData", { value: { setData } });
  return { event, setData };
}
