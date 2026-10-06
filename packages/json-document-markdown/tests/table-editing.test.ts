import {expect, test} from "vitest";
import {readMarkdownTable, replaceMarkdownTable} from "../src/index.js";
test("table edits preserve surrounding source, alignment, CRLF and escaped pipes", () => {
 const source = "before\r\n\r\n| A | B |\r\n| :--- | ---: |\r\n| x | y |\r\n\r\nafter";
 const table = readMarkdownTable(source, 12)!;
 expect(table.align).toEqual(["left","right"]);
 const next = replaceMarkdownTable(source,table,[["A","B"],["a|b","line\nbreak"]]);
 expect(next).toBe("before\r\n\r\n| A | B |\r\n| :--- | ---: |\r\n| a\\|b | line break |\r\n\r\nafter");
 expect(readMarkdownTable(next,table.from)?.rows[1]).toEqual(["a\\|b","line break"]);
 expect(() => replaceMarkdownTable(source,table,[])).toThrow();
});
