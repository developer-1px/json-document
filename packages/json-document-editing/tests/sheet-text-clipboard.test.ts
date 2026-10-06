import {expect,test} from "vitest";
import {parseSheetClipboardText} from "../src/index.js";
test("external spreadsheet text supports quoted newlines, escaped quotes, CRLF and rectangular padding",()=>{
 expect(parseSheetClipboardText('a\tb\r\nc\td\r\n')?.cells).toEqual([['a','b'],['c','d']]);
 expect(parseSheetClipboardText('"a\tb"\t"line\nnext"\n"say ""hi"""')?.cells).toEqual([['a\tb','line\nnext'],['say "hi"','']]);
 expect(parseSheetClipboardText('"unfinished')).toBeNull();
});
