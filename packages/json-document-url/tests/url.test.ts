import { expect, test } from "vitest";
import { resolveDocumentURL, type DocumentURLPolicy } from "../src/index.js";
const link: DocumentURLPolicy = {schemes:["http","https","mailto","tel"],relative:"any",controlCharacters:"ignore-for-scheme"};
const strict: DocumentURLPolicy = {...link,relative:"explicit",controlCharacters:"reject"};
const image: DocumentURLPolicy = {...link,schemes:["http","https"]};
test.each([
  ["https://example.test/a",true,true,true], ["HTTP://example.test",true,true,true],
  ["mailto:a@example.test",true,true,false], ["tel:123",true,true,false],
  ["notes/page",true,false,true], ["./notes",true,true,true], ["../notes",true,true,true],
  ["/notes",true,true,true], ["//example.test",true,true,true], ["#part",true,true,true], ["?q=1",true,true,true],
  ["https://example.test/a b",true,true,true], [" https://example.test",true,false,true],
  ["https:\n//example.test",true,false,true], ["java\tscript:alert(1)",false,false,false],
  ["javascript:alert(1)",false,false,false], ["data:text/html,x",false,false,false],
  ["ftp://example.test",false,false,false], ["custom+scheme:value",false,false,false],
  ["",false,false,false], [null,false,false,false], [undefined,false,false,false],
] as const)("preserves source and target policy for %s", (value, markdown, richText, picture) => {
  for (const [policy, allowed] of [[link,markdown],[strict,richText],[image,picture]] as const)
    expect(resolveDocumentURL(value,policy)).toBe(allowed ? value : undefined);
});
