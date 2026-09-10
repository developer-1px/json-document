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

  test("edits one source run without replacing the surrounding or edited text nodes", () => {
    const { root, dom } = setup("A **one** B __two__ C");
    const nodes = Array.from(root.childNodes);
    const text = root.querySelector("strong")!.firstChild;
    dom.render(root, "A **changed** B __two__ C", { anchor: 7, focus: 7 });
    expect(Array.from(root.childNodes)).toEqual(nodes);
    expect(root.querySelector("strong")!.firstChild).toBe(text);
    expect(dom.observe(root).value).toBe("A **changed** B __two__ C");
    dom.restoreSelection(root, { anchor: 21, focus: 4 });
    expect(dom.observe(root).selection).toEqual({ anchor: 21, focus: 4 });
  });

  test("preserves a matching suffix when syntax inserts new source runs", () => {
    const { root, dom } = setup("A **one** B __two__ C");
    const tail = Array.from(root.childNodes).slice(1);
    dom.render(root, "**new** A **one** B __two__ C");
    expect(Array.from(root.childNodes).slice(-tail.length)).toEqual(tail);
    expect(dom.observe(root).value).toBe("**new** A **one** B __two__ C");
  });

  test("selection changes do not serialize the entire surface", () => {
    const { root, dom } = setup("A **one** B __two__ C");
    Object.defineProperty(root, "innerHTML", { get() { throw new Error("full DOM serialization"); } });
    dom.render(root, "A **one** B __two__ C", { anchor: 5, focus: 5 });
    dom.restoreSelection(root, { anchor: 5, focus: 5 });
    expect(dom.observe(root).selection).toEqual({ anchor: 5, focus: 5 });
  });

  test("repairs native mutations even after selection reveal and observer delivery", async () => {
    const source = "A **one** B";
    const { root, dom } = setup(source);
    root.querySelector("strong")!.innerHTML = "<em>one</em>";
    root.firstElementChild!.setAttribute("style", "font-weight: bold");
    await Promise.resolve();
    dom.restoreSelection(root, { anchor: 5, focus: 5 });
    dom.render(root, source, { anchor: 5, focus: 5 });
    expect(root.querySelector("em, [style]")).toBeNull();
    expect(dom.observe(root).value).toBe(source);
  });

  test("preserves nested strong boundaries while editing and undoing syntax", () => {
    const source = "**outer __inner__ tail**";
    const { root, dom } = setup(source);
    expect(Array.from(root.querySelectorAll("strong")).map(node => node.textContent)).toEqual(["outer ", "inner", " tail"]);
    expect(root.querySelectorAll("[data-markdown-delimiter]")).toHaveLength(4);
    dom.render(root, "**outer __inner tail**");
    expect(dom.observe(root).value).toBe("**outer __inner tail**");
    dom.render(root, source);
    for (let offset = 0; offset <= source.length; offset++) {
      dom.restoreSelection(root, { anchor: offset, focus: offset });
      expect(dom.observe(root).selection).toEqual({ anchor: offset, focus: offset });
    }
  });
  test("incremental block runs match fresh DOM after inline, block and reference edits", () => {
    const initial = "Before **one**\n\nMiddle __two__ text\n\nAfter **three**";
    const { root, dom } = setup(initial);
    const sources = [
      initial.replace("two", "*changed*"),
      initial.replace("two", "한글"),
      initial.replace("Middle __two__ text", "Plain paragraph"),
      initial.replace("Middle", "- Middle"),
      initial + "\n\n[a][**b**]",
      initial + "\n\n[a][**b**]\n\n[**b**]: /target",
      initial.replaceAll("\n", "\r\n"),
      initial + " tail한글\n다음\n", "", initial,
    ];
    for (const source of [...sources, ...[...sources].reverse()]) {
      const selection = { anchor: source.length, focus: Math.floor(source.length / 2) };
      dom.render(root, source, selection);
      const fresh = setup(source);
      fresh.dom.render(fresh.root, source, selection);
      expect(root.innerHTML, source).toBe(fresh.root.innerHTML);
      expect(dom.observe(root).value).toBe(source);
      expect(dom.restoreSelection(root, selection)).toBe(true);
      expect(dom.observe(root).selection).toEqual(selection);
      fresh.root.remove();
    }
  });

});
