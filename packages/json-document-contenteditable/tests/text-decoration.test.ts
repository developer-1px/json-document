import {expect, test} from "vitest";
import {plainTextDOMAdapter} from "../src/index.js";
test("UI islands cannot contaminate source or source selections", () => {
 const root = document.createElement("div");
 root.innerHTML = '<span>before</span><span data-text-decoration contenteditable="false"><div>toolbar</div><table><tbody><tr><td>UI label</td></tr></tbody></table></span><span>after</span>';
 expect(plainTextDOMAdapter.observe(root).value).toBe("beforeafter");
 root.querySelector("td")!.textContent = "changed";
 expect(plainTextDOMAdapter.observe(root).value).toBe("beforeafter");
 root.querySelector('[data-text-decoration]')!.removeAttribute('data-text-decoration');
 expect(plainTextDOMAdapter.observe(root).value).toContain("changed");
});
