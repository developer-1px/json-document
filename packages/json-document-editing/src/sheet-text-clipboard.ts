import {sheetClipboardFormat, type SheetClipboard} from "./sheet.js";

/** Read tab-separated spreadsheet text, including quoted tabs/newlines and doubled quotes. */
export function parseSheetClipboardText(text: string): SheetClipboard | null {
  if (!text) return null;
  const rows: string[][]=[]; let row: string[]=[],field="",quoted=false;
  for(let i=0;i<text.length;i++) {
    const char=text[i]!;
    if(char === '"') {
      if(quoted && text[i+1] === '"') {field+='"';i++;}
      else if(quoted || field === "") quoted=!quoted;
      else field+=char;
    } else if(!quoted && (char === '\t' || char === '\n' || char === '\r')) {
      row.push(field);field="";
      if(char !== '\t') {rows.push(row);row=[];if(char === '\r' && text[i+1] === '\n') i++;}
    } else field+=char;
  }
  if(quoted) return null;
  if(field || row.length || !rows.length) {row.push(field);rows.push(row);}
  const width=Math.max(...rows.map(row=>row.length));
  return {type:sheetClipboardFormat.mimeType,text,cells:rows.map(row=>Array.from({length:width},(_,i)=>row[i] ?? ""))};
}
