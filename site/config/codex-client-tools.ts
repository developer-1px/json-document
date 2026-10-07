import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const pending = new Map<string, (result: unknown) => void>();

/** Correlate a browser-owned tool with its live Codex request. */
export function requestClientTool(res: ServerResponse, emit: (event: object) => void, tool: string, args: unknown, reply: (result: unknown) => void) {
  const token = randomUUID();
  const finish = (result: unknown) => {
    if (!pending.delete(token)) return;
    clearTimeout(timer);
    res.off("close", cancel);
    reply(result);
  };
  const cancel = () => finish({ ok: false, code: "tool.disconnected" });
  const timer = setTimeout(() => finish({ ok: false, code: "tool.timeout" }), 30_000);
  pending.set(token, finish);
  res.once("close", cancel);
  emit({ type: "CUSTOM", name: "client-tool", value: { token, tool, arguments: args } });
}

export function receiveClientTool(req: IncomingMessage, res: ServerResponse, token: string) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    const resolve = pending.get(token);
    if (!resolve) { res.statusCode = 404; res.end(); return; }
    try { const result: unknown = JSON.parse(body); resolve(result); res.end(); }
    catch { res.statusCode = 400; res.end(); }
  });
}
