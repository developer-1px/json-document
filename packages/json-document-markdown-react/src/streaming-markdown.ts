type Delimiter = "*" | "**" | "_" | "__" | "~~" | "`";

export type StreamingMarkdownProjection = Readonly<{ markdown: string; repair: string; source: string }>;

/** Repairs only the render projection. The canonical streamed source stays untouched. */
export function projectStreamingMarkdown(source: string, streaming = false): StreamingMarkdownProjection {
  const fence = openCodeFence(source) ? "\n```" : "";
  const repair = streaming ? fence || inlineRepair(source) : "";
  return { markdown: source + repair, repair, source };
}

function openCodeFence(source: string): boolean {
  return source.split(/\r?\n/u).filter((line) => /^ {0,3}```/u.test(line)).length % 2 === 1;
}

function inlineRepair(source: string): string {
  const open: Delimiter[] = [];
  let brackets = 0;
  let destinations = 0;
  let fenced = false;
  let lineStart = true;
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character === "\n" || character === "\r") { lineStart = true; index += character === "\r" && source[index + 1] === "\n" ? 2 : 1; continue; }
    if (lineStart && source.slice(index).match(/^ {0,3}```/u)) { fenced = !fenced; index += 3; lineStart = false; continue; }
    lineStart = false;
    if (fenced || character === "\\") { index += character === "\\" ? 2 : 1; continue; }
    if (open.at(-1) !== "`" && destinations > 0) { if (character === "(") destinations += 1; else if (character === ")") destinations -= 1; index += 1; continue; }
    if (open.at(-1) !== "`" && source.slice(index, index + 2) === "](") { brackets = Math.max(0, brackets - 1); destinations = 1; index += 2; continue; }
    if (open.at(-1) !== "`" && character === "[") { brackets += 1; index += 1; continue; }
    if (open.at(-1) !== "`" && character === "]") { brackets = Math.max(0, brackets - 1); index += 1; continue; }
    const delimiter = delimiterAt(source, index);
    if (!delimiter) { index += 1; continue; }
    if (open.at(-1) === delimiter) open.pop(); else if (open.at(-1) !== "`" || delimiter === "`") open.push(delimiter);
    index += delimiter.length;
  }
  return ")".repeat(destinations) + "](about:blank)".repeat(brackets) + open.reverse().join("");
}

function delimiterAt(source: string, index: number): Delimiter | null {
  const pair = source.slice(index, index + 2);
  if (pair === "**" || pair === "__" || pair === "~~") return pair;
  const marker = source[index];
  return marker === "*" || marker === "_" || marker === "`" ? marker : null;
}
