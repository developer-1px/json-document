import { afterEach, expect, test } from "vitest";
import { clampTextSelection } from "@interactive-os/json-document-editing";
import { createMarkdownDOMAdapter } from "../src/index.js";

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.replaceChildren(); });
const sources = [
  "# **제목😀**\r\n\r\nSetext\r\n======\r\n",
  "> one\n> two\n>\n> - *nested*\n>   1. list\n\n- [x] done\n- [ ] next",
  "~~~js\nconst x = '**literal**';\n~~~\n\n    indented\n\n`one  two`",
  "[label](https://example.com) ![alt](/image.png)\n\n[ref][a] ![ref][a]\n\n[a]: /path",
  "| Left | Right |\n| :--- | ---: |\n| *one* | **two** |",
  "\\*literal* &amp; &#x1f600;  \nhard\\\nbreak\n\n---\n\n~~strike~~",
  "| a | b |\n| - | - |\n| c |",
  "Note[^n]\n\n[^n]: footnote\n\n<script>alert(1)</script>",
];

test.each(sources)("every source offset survives rendering and reverse selection: %s", source => {
  const root = document.createElement("div"); document.body.append(root);
  const dom = createMarkdownDOMAdapter(); dom.render(root, source);
  expect(root.textContent).toBe(source);
  expect(dom.observe(root).value).toBe(source);
  for (let offset = 0; offset <= source.length; offset++) {
    const selection = { anchor: offset, focus: offset % 3 === 0 ? source.length - offset : offset };
    expect(dom.restoreSelection(root, selection)).toBe(true);
    expect(dom.observe(root)).toEqual({ value: source, selection: clampTextSelection(source, selection) });
  }
  const before = root.innerHTML;
  dom.render(root, source + "\n\n# new", {anchor: source.length, focus: 0});
  dom.render(root, source);
  expect(dom.observe(root).value).toBe(source);
  expect(root.querySelector("script")).toBeNull();
  expect(before).not.toBe("");
});

test("links and images never activate unsafe URL schemes or raw HTML", () => {
  const root = document.createElement("div"); document.body.append(root);
  const source = '[x](javascript:alert) ![x](data:text/html,x) [safe](https://example.com) <img src=x onerror=alert(1)>';
  const dom = createMarkdownDOMAdapter(); dom.render(root, source);
  expect(root.querySelectorAll("a[href]")).toHaveLength(1);
  expect(root.querySelector("a[href]")?.getAttribute("href")).toBe("https://example.com");
  expect(root.querySelector("img, script, [onerror]")).toBeNull();
  expect(dom.observe(root).value).toBe(source);
});

test("heading syntax stays concealed while editing; table source reveals as a unit", () => {
  const root = document.createElement("div"); document.body.append(root);
  const source = "# title\n\n| a | b |\n| - | - |\n| c | d |";
  const dom = createMarkdownDOMAdapter(); dom.render(root, source);
  const heading = root.querySelector('[role="heading"]')!;
  expect(heading.getAttribute("aria-level")).toBe("1");
  expect(heading.querySelector("[data-markdown-heading-marker]")?.getAttribute("aria-hidden")).toBe("true");
  dom.restoreSelection(root, {anchor: 3, focus: 3});
  expect(heading.querySelector("[data-markdown-heading-marker]")?.getAttribute("aria-hidden")).toBe("true");
  dom.restoreSelection(root, {anchor: source.indexOf("c"), focus: source.indexOf("c")});
  expect(root.querySelector('[role="table"]')?.getAttribute("data-markdown-active")).toBe("true");
  expect(dom.observe(root).value).toBe(source);
});

test("heading marker navigation uses source positions and restores the shared boundary in the body", () => {
  const root = document.createElement("div"); document.body.append(root);
  const dom = createMarkdownDOMAdapter(); dom.render(root, "### 😀제목\n\n본문");
  expect(dom.resolveHorizontalSelection!(root, {anchor:4, focus:4}, "backward", false)).toEqual({anchor:3, focus:3});
  expect(dom.resolveHorizontalSelection!(root, {anchor:4, focus:3}, "backward", true)).toEqual({anchor:4, focus:0});
  expect(dom.resolveHorizontalSelection!(root, {anchor:4, focus:0}, "forward", false)).toEqual({anchor:4, focus:4});
  expect(dom.resolveHorizontalSelection!(root, {anchor:4, focus:4}, "forward", false)).toBeNull();
  dom.restoreSelection(root, {anchor:4, focus:4});
  const body = document.createTreeWalker(root.querySelector('[data-markdown-kind="text"]')!, NodeFilter.SHOW_TEXT).nextNode();
  expect(document.getSelection()!.focusNode).toBe(body);
  expect(document.getSelection()!.focusOffset).toBe(0);
  dom.restoreSelection(root, {anchor:4, focus:0});
  expect(dom.observe(root).selection).toEqual({anchor:4, focus:0});
  expect(document.getSelection()!.anchorNode).toBe(body);
});

test.each(["  ##    제목  ", "###\t \t제목\t  ###  ", "##   ", "제목  \n---  "])("heading whitespace stays visible and source-addressable: %s", source => {
  const root = document.createElement("div"); document.body.append(root);
  const dom = createMarkdownDOMAdapter(); dom.render(root, source);
  expect(root.querySelector('[role="heading"]')).not.toBeNull();
  const visible = () => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text = "";
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node.parentElement?.closest('[hidden], [data-text-projection-source]'))) text += node.textContent;
    }
    return text;
  };
  expect(visible().replace(/\S/g, "")).toBe(source.replace(/\S/g, ""));
  for (let offset = 0; offset <= source.length; offset++) {
    dom.restoreSelection(root, {anchor:offset, focus:offset});
    expect(dom.observe(root)).toEqual({value:source, selection:{anchor:offset, focus:offset}});
    expect(visible().replace(/\S/g, "")).toBe(source.replace(/\S/g, ""));
  }
});

test("code contents and words beside entities remain normal editable text", () => {
  const root=document.createElement("div");document.body.append(root);
  const source="one \\* &amp; end `two  words`";
  const dom=createMarkdownDOMAdapter();dom.render(root,source);
  expect(root.querySelector('[data-markdown-marker="entity"]')?.getAttribute("data-markdown-label")).toBe("&");
  expect(root.querySelectorAll('[data-markdown-marker="source"]')).toHaveLength(0);
  for (const word of ["one","end","two","words"]) {
    const offset=source.indexOf(word)+1;
    dom.restoreSelection(root,{anchor:offset,focus:offset});
    expect(dom.resolveHorizontalSelection!(root,{anchor:offset,focus:offset},"forward",false)).toBeNull();
    expect(dom.observe(root)).toEqual({value:source,selection:{anchor:offset,focus:offset}});
  }
});
