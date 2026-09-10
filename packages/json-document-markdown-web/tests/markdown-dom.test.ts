import { afterEach, describe, expect, test } from "vitest";
import { createMarkdownDOMAdapter } from "../src/index.js";

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.replaceChildren(); });

function setup(source: string) {
  const root = document.createElement("div");
  document.body.append(root);
  const dom = createMarkdownDOMAdapter();
  dom.render(root, source);
  return { root, dom };
}

describe("source-preserving Markdown DOM", () => {
  test("round-trips every source offset through concealed and revealed syntax", () => {
    const source = "A **한글** and __raw__  \r\n";
    const { root, dom } = setup(source);
    for (let anchor = 0; anchor <= source.length; anchor++) {
      for (const focus of [anchor, 0, source.length]) {
        expect(dom.restoreSelection(root, { anchor, focus })).toBe(true);
        expect(dom.observe(root)).toEqual({ value: source, selection: { anchor, focus } });
      }
    }
  });

  test("reveals only intersecting syntax without rebuilding source nodes", () => {
    const { root, dom } = setup("A **one** B __two__ C");
    const nodes = Array.from(root.childNodes);
    const hidden = () => Array.from(root.querySelectorAll<HTMLElement>("[data-markdown-delimiter]")).map(node => node.hidden);
    expect(hidden()).toEqual([true, true, true, true]);
    dom.render(root, root.textContent!, { anchor: 5, focus: 5 });
    expect(hidden()).toEqual([false, false, true, true]);
    dom.render(root, root.textContent!, { anchor: 15, focus: 5 });
    expect(hidden()).toEqual([false, false, false, false]);
    dom.render(root, root.textContent!, null);
    expect(hidden()).toEqual([true, true, true, true]);
    expect(Array.from(root.childNodes)).toEqual(nodes);
  });

  test("HTML is literal text and unclosed syntax is directly editable", () => {
    const source = "<img src=x onerror=alert(1)> **unfinished";
    const { root, dom } = setup(source);
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("strong")).toBeNull();
    expect(dom.observe(root).value).toBe(source);
  });

  test("recovers native markup changes even when text has not changed", () => {
    const source = "A **raw**";
    const { root, dom } = setup(source);
    root.firstElementChild!.innerHTML = "<em>A </em>";
    expect(root.textContent).toBe(source);
    dom.render(root, source);
    expect(root.querySelector("em")).toBeNull();
    expect(root.querySelector("strong")?.textContent).toBe("raw");
    expect(dom.observe(root).value).toBe(source);
  });
});
