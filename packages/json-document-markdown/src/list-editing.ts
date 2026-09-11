import { assertMarkdownSelection, type MarkdownSourceEdit } from "./source-edit.js";
import { projectMarkdown, type MarkdownProjection } from "./projection.js";
import type { MarkdownNode } from "./nodes.js";

type Selection = MarkdownSourceEdit["selection"];
interface Item {
  node: MarkdownNode; list: MarkdownNode; parent: Item | null; index: number;
  lineFrom: number; quoteEnd: number; markerFrom: number; markerTo: number;
  bodyFrom: number; contentIndent: number; indentColumns: number; taskFrom?: number;
}
const lineStart = (source: string, offset: number) => offset === 0 ? 0 : source.lastIndexOf("\n", offset - 1) + 1;
const lineEnd = (source: string, offset: number) => { const end = source.indexOf("\n", offset); return end < 0 ? source.length : end; };
function columns(value: string): number { let width=0; for(const character of value) width += character === "\t" ? 4-width%4 : 1; return width; }
function items(source: string, projection: MarkdownProjection): Item[] {
  const result: Item[] = [];
  const visit = (nodes: readonly MarkdownNode[], parent: Item | null, list: MarkdownNode | null) => {
    nodes.forEach((node, index) => {
      let owner = parent;
      if (node.kind === "listItem" && list) {
        const start = lineStart(source, node.from), end = lineEnd(source,node.from);
        const marker = projection.markers.find(m => m.kind === "list" && m.from >= node.from && m.to <= end);
        if (marker) {
          const spaces = /^[ \t]*/.exec(source.slice(marker.to,end))![0];
          const body = marker.to + spaces.length;
          const task = projection.markers.find(m => m.kind === "task" && m.from === body && m.to <= end)
            ?? (/^\[[ xX]\][ \t\r]*$/.test(source.slice(body,end)) ? {from:body,to:body+3} : undefined);
          const quote = /^(?:[ \t]*>[ \t]?)+/.exec(source.slice(start,marker.from))?.[0] ?? "";
          owner = {node,list,parent,index,lineFrom:start,quoteEnd:start+quote.length,markerFrom:marker.from,markerTo:marker.to,
            bodyFrom:task ? task.to + (/^[ \t]*/.exec(source.slice(task.to,end))![0].length) : body,
            indentColumns:columns(source.slice(start+quote.length,marker.from)),
            contentIndent:columns(source.slice(start+quote.length,body))-columns(source.slice(start+quote.length,marker.from)) || marker.to-marker.from+1, ...(task ? {taskFrom:task.from} : {})};
          result.push(owner);
        }
      }
      if (node.children) visit(node.children,owner,node.kind === "list" ? node : list);
    });
  };
  visit(projection.nodes,null,null);
  return result;
}
function itemAt(source: string, entries: Item[], offset: number): Item | undefined {
  return entries.filter(item => offset >= item.lineFrom && offset <= lineEnd(source,item.node.to)).at(-1);
}
function insideCode(nodes: readonly MarkdownNode[], offset: number): boolean {
  return nodes.some(node => offset >= node.from && offset <= node.to && (node.kind === "code" || node.kind === "html" || !!node.children && insideCode(node.children,offset)));
}

/** Syntax-owned Enter extension used by insertMarkdownParagraph. */
export function continueMarkdownList(source: string, selection: Selection, projection: MarkdownProjection): MarkdownSourceEdit | null {
  const from = Math.min(selection.anchor,selection.focus), to = Math.max(selection.anchor,selection.focus);
  if (insideCode(projection.nodes,from)) return null;
  const entry = itemAt(source,items(source,projection),from);
  if (!entry || from < entry.bodyFrom) return null;
  const end = lineEnd(source,from), start = lineStart(source,from);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  if (from === to && start === entry.lineFrom && !source.slice(entry.bodyFrom,end).trim()) {
    // Remove only this list prefix; an enclosing quote remains a quote.
    const quote = source.slice(entry.lineFrom,entry.quoteEnd);
    const boundary = entry.lineFrom > 0 && !quote ? newline : "";
    const finish = end - (source[end-1] === "\r" ? 1 : 0);
    const value = source.slice(0,entry.lineFrom) + boundary + quote + source.slice(finish);
    const focus = entry.lineFrom + boundary.length + quote.length;
    return {value,selection:{anchor:focus,focus}};
  }
  let prefix = source.slice(entry.lineFrom,entry.bodyFrom);
  if (entry.taskFrom !== undefined) {
    const at = entry.taskFrom - entry.lineFrom;
    prefix = prefix.slice(0,at) + "[ ]" + prefix.slice(at+3);
  }
  const marker = source.slice(entry.markerFrom,entry.markerTo);
  if (/^\d+[.)]$/.test(marker)) {
    const at = entry.markerFrom - entry.lineFrom;
    const next = String(Number(marker.slice(0,-1))+1);
    // CommonMark list markers have at most nine digits.
    prefix = prefix.slice(0,at) + (next.length <= 9 ? next : "1") + marker.at(-1)! + prefix.slice(at+marker.length);
  }
  const focus = from + newline.length + prefix.length;
  return {value:source.slice(0,from)+newline+prefix+source.slice(to),selection:{anchor:focus,focus}};
}

/** Indent/outdent selected sibling items with their descendants; null outside lists. */
export function indentMarkdownList(source: string, selection: Selection, direction: "indent" | "outdent"): MarkdownSourceEdit | null {
  assertMarkdownSelection(source,selection);
  const projection = projectMarkdown(source), entries = items(source,projection);
  const from = Math.min(selection.anchor,selection.focus), to = Math.max(selection.anchor,selection.focus);
  if (insideCode(projection.nodes,from)) return null;
  const first = itemAt(source,entries,from), last = itemAt(source,entries,to > from ? to-1 : to);
  if (!first || !last) return null;
  let a: Item | null = first, b: Item | null = last;
  const lineage = (item: Item): Item[] => { const path: Item[] = []; for(let next: Item | null=item;next;next=next.parent) path.push(next); return path; };
  for (const left of lineage(first)) {
    const right = lineage(last).find(item => item.list === left.list);
    if (right) { a=left; b=right; break; }
  }
  if (a.list !== b.list) return null;
  const selected = entries.filter(item => item.list === a!.list && item.index >= a!.index && item.index <= b!.index);
  const previous = entries.find(item => item.list === a!.list && item.index === a!.index-1);
  if (direction === "indent" && !previous || direction === "outdent" && !a.parent) return {value:source,selection};
  const width = direction === "indent" ? previous!.contentIndent : a.indentColumns-a.parent!.indentColumns;
  if (width <= 0) return {value:source,selection};
  const edits: Array<{from:number; to:number; insert:string}> = [];
  const firstLine = selected[0]!.lineFrom, lastEnd = selected.at(-1)!.node.to;
  for(let line=firstLine;line<=lastEnd && line<source.length;) {
    const end=lineEnd(source,line), raw=source.slice(line,end);
    const quote=/^(?:[ \t]*>[ \t]?)+/.exec(raw)?.[0] ?? "";
    const at=line+quote.length;
    if(raw.trim()) {
      const leading=/^[ \t]*/.exec(source.slice(at,end))![0];
      const target=Math.max(0,columns(leading)+(direction === "indent" ? width : -width));
      edits.push({from:at,to:at+leading.length,insert:" ".repeat(target)});
    }
    if(end===source.length) break;
    line=end+1;
  }
  // A nested ordered list must start at 1 to interrupt the preceding paragraph.
  // When promoted, number the moved group immediately after its parent item.
  let number = direction === "indent" ? 1 : Number(source.slice(a.parent!.markerFrom,a.parent!.markerTo-1))+1;
  if (!Number.isFinite(number) || number>999999999) number=1;
  for(const item of selected) {
    const marker=source.slice(item.markerFrom,item.markerTo);
    if (/^\d+[.)]$/.test(marker)) edits.push({from:item.markerFrom,to:item.markerTo,insert:String(number++)+marker.at(-1)!});
  }
  edits.sort((left,right) => left.from-right.from || left.to-right.to);
  let value=source;
  for(const edit of [...edits].reverse()) value=value.slice(0,edit.from)+edit.insert+value.slice(edit.to);
  const map=(offset:number) => {
    let delta=0;
    for(const edit of edits) {
      if(offset < edit.from) break;
      if(offset <= edit.to) return edit.from+delta+edit.insert.length;
      delta += edit.insert.length-(edit.to-edit.from);
    }
    return offset+delta;
  };
  return {value,selection:{anchor:map(selection.anchor),focus:map(selection.focus)}};
}
