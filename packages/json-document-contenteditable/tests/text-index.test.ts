import { afterEach, describe, expect, test, vi } from "vitest";
import { plainTextDOMAdapter } from "../src/index.js";

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.replaceChildren(); vi.restoreAllMocks(); });

function setup(source: string) {
  const root = document.createElement("div");
  document.body.append(root);
  root.innerHTML = source;
  return root;
}

describe("text DOM position index", () => {
  test.each(["<br><br><br>", "a<br><br>b", "<div>a</div><div><br><br></div><div>b</div>"])("round-trips native line boundaries in %s", markup => {
    const root = setup(markup);
    const source = plainTextDOMAdapter.observe(root).value;
    for (let offset = 0; offset <= source.length; offset++) {
      expect(plainTextDOMAdapter.restoreSelection(root, { anchor: source.length, focus: offset })).toBe(true);
      expect(plainTextDOMAdapter.observe(root).selection).toEqual({ anchor: source.length, focus: offset });
    }
  });

  test("reuses text projection across selection-only observations", () => {
    const root = setup("<span>first</span><strong>한글</strong><span>last</span>");
    const text = root.firstChild!.firstChild as Text;
    const reads = vi.spyOn(text, "data", "get");
    plainTextDOMAdapter.restoreSelection(root, { anchor: 11, focus: 1 });
    const count = reads.mock.calls.length;
    for (let index = 0; index < 20; index++) {
      expect(plainTextDOMAdapter.observe(root)).toEqual({ value: "first한글last", selection: { anchor: 11, focus: 1 } });
    }
    expect(reads).toHaveBeenCalledTimes(count);
    text.data = "changed";
    expect(plainTextDOMAdapter.observe(root).value).toBe("changed한글last");
  });

  test("invalidates for native text, replacement children and caret boundary changes", async () => {
    const root = setup("<span>a</span><div>b<br>c</div>");
    expect(plainTextDOMAdapter.observe(root).value).toBe("a\nb\nc");
    root.lastChild!.textContent = "next";
    await Promise.resolve();
    expect(plainTextDOMAdapter.observe(root).value).toBe("a\nnext");
    root.innerHTML = "x<br data-contenteditable-caret>";
    expect(plainTextDOMAdapter.observe(root).value).toBe("x");
    root.lastElementChild!.removeAttribute("data-contenteditable-caret");
    expect(plainTextDOMAdapter.observe(root).value).toBe("x\n");
  });

  test("does not reset an already matching native selection", () => {
    const root = setup("<span>원문</span>");
    const selection = document.getSelection()!;
    const writes = vi.spyOn(selection, "setBaseAndExtent");
    plainTextDOMAdapter.restoreSelection(root, { anchor: 1, focus: 1 });
    const count = writes.mock.calls.length;
    plainTextDOMAdapter.restoreSelection(root, { anchor: 1, focus: 1 });
    expect(writes).toHaveBeenCalledTimes(count);
  });
});
