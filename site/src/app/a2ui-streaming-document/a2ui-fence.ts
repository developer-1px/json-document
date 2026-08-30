import { A2uiMessageSchema, type A2uiMessage } from "@a2ui/web_core/v0_9";

export type A2uiFenceProjection = Readonly<{
  markdown: string;
  messages: ReadonlyArray<A2uiMessage>;
  errors: ReadonlyArray<string>;
}>;

/** Projects accumulated assistant Markdown into visible prose and complete A2UI JSONL messages. */
export function projectA2uiFences(source: string, complete = false): A2uiFenceProjection {
  const lines = source.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];
  const markdown: string[] = [];
  const messages: A2uiMessage[] = [];
  const errors: string[] = [];
  let inside = false;

  for (const [index, line] of lines.entries()) {
    const hasNewline = line.endsWith("\n");
    const value = line.replace(/\r?\n$/, "");
    if (!inside && /^```a2ui\s*$/.test(value)) { inside = true; continue; }
    if (!inside && !hasNewline && "```a2ui".startsWith(value.trim())) continue;
    if (inside && /^```\s*$/.test(value)) { inside = false; continue; }
    if (!inside) { markdown.push(line); continue; }
    if (!value.trim() || (!hasNewline && !complete && index === lines.length - 1)) continue;
    try {
      messages.push(A2uiMessageSchema.parse(JSON.parse(value)));
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : "A2UI JSONL을 해석하지 못했습니다.");
    }
  }

  return { markdown: markdown.join(""), messages, errors };
}
