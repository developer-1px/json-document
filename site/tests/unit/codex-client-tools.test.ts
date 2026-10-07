// @vitest-environment node
import { EventEmitter } from "node:events";
import { createServer, type ServerResponse } from "node:http";
import { expect, test } from "vitest";
import { requestClientTool, receiveClientTool } from "../../config/codex-client-tools";

test("client tool results resolve only their live request and cannot be replayed", async () => {
  const connection = new EventEmitter() as ServerResponse;
  let token = "";
  let result: unknown;
  requestClientTool(connection, event => { token = (event as { value: { token: string } }).value.token; }, "edit_document", { before: "a", after: "b" }, value => { result = value; });
  const server = createServer((req, res) => receiveClientTool(req, res, req.url!.slice(1)));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const post = (key: string, body: string) => fetch(`http://127.0.0.1:${address.port}/${key}`, { method: "POST", body });
  try {
    expect((await post("unknown", "{}")).status).toBe(404);
    expect(result).toBeUndefined();
    expect((await post(token, "invalid")).status).toBe(400);
    expect((await post(token, '{"ok":false,"code":"text.stale-source"}')).status).toBe(200);
    expect(result).toEqual({ ok: false, code: "text.stale-source" });
    expect((await post(token, "{}")).status).toBe(404);
    expect(connection.listenerCount("close")).toBe(0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("disconnect resolves and releases a pending client tool", () => {
  const connection = new EventEmitter() as ServerResponse;
  let result: unknown;
  requestClientTool(connection, () => {}, "read_document", {}, value => { result = value; });
  connection.emit("close");
  expect(result).toEqual({ ok: false, code: "tool.disconnected" });
  expect(connection.listenerCount("close")).toBe(0);
});
