import {afterEach, expect, test, vi} from "vitest";
import {revealTextCaret} from "../src/dom/caret-visibility.js";

afterEach(() => {vi.restoreAllMocks(); document.body.replaceChildren();});

test("caret visibility reads DOMRect getters and scrolls only the clipping ancestor", () => {
  const root = document.createElement("div"); root.style.overflowX="auto"; root.style.overflowY="auto"; document.body.append(root);
  vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(20,20,300,100));
  vi.spyOn(root, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(root, "clientWidth", "get").mockReturnValue(300);
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024);
  const scroll = vi.fn((options: ScrollToOptions) => {root.scrollTop += options.top ?? 0;});
  Object.defineProperty(root, "scrollBy", {value:scroll, configurable:true});
  const windowScroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  revealTextCaret(root, new DOMRect(40,150,1,20));
  expect(scroll).toHaveBeenCalledWith({left:0, top:50, behavior:"instant"});
  expect(windowScroll).not.toHaveBeenCalled();
});
