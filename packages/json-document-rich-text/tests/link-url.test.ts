import { expect, test } from "vitest";
import { RICH_TEXT_PROFILE_V1, renderRichText, resolveRichTextLinkURL, type RichTextDocument, type RichTextRenderAdapter } from "../src/index.js";
const adapter: RichTextRenderAdapter<string> = {
  document: (_node,children) => children.join(""), node: (_node,children) => children.join(""),
  text: node => node.text, mark: (_mark,children) => `link(${children.join("")})`, unknown: () => "",
};
test.each([["../notes",true],["https://example.test",true],["notes",false],["https:\n//example.test",false],["javascript:alert(1)",false]] as const)("renderer uses the public link contract for %s", (href, allowed) => {
  const doc: RichTextDocument = {id:"doc",type:"doc",profile:RICH_TEXT_PROFILE_V1,content:[{id:"p",type:"paragraph",content:[{id:"t",type:"text",text:"label",marks:[{type:"link",attrs:{href}}]}]}]};
  const result = renderRichText(doc,adapter);
  expect(resolveRichTextLinkURL(href)).toBe(allowed ? href : undefined);
  expect(result.output).toBe(allowed ? "link(label)" : "label");
  expect(result.diagnostics).toHaveLength(allowed ? 0 : 1);
});
