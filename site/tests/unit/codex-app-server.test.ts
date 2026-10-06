// @vitest-environment node
import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import { PassThrough, Writable } from "node:stream";
import { afterEach, expect, test, vi } from "vitest";
import type { ViteDevServer } from "vite";

const mocked = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mocked.spawn }));
import { codexAppServer } from "../../config/codex-app-server";

afterEach(() => vi.clearAllMocks());

test("preparation ignores queued notifications after JSON and reuses the connection for a turn", async () => {
  const methods: string[] = [];
  mocked.spawn.mockImplementation(() => {
    const stdout = new PassThrough();
    const child = Object.assign(new EventEmitter(), {
      stdout, stderr: new PassThrough(), killed: false, exitCode: null,
      kill: vi.fn(() => true),
      stdin: new Writable({ write(chunk, _encoding, callback) {
        const message = JSON.parse(String(chunk));
        methods.push(message.method);
        const frames: object[] = [];
        if (message.method === "initialize") frames.push({ id: message.id, result: {} });
        if (message.method === "config/read") frames.push({ id: message.id, result: { config: {} } });
        if (message.method === "thread/start") frames.push(
          { id: message.id, result: { thread: { id: "prepared-thread" } } },
          { method: "thread/started", params: { thread: { id: "prepared-thread" } } },
        );
        if (message.method === "turn/start") frames.push(
          { id: message.id, result: {} },
          { method: "turn/started", params: { threadId: "prepared-thread", turn: { id: "turn" } } },
          { method: "item/agentMessage/delta", params: { itemId: "reply", delta: "OK" } },
          { method: "turn/completed", params: { turn: { id: "turn", status: "completed" } } },
          { method: "thread/tokenUsage/updated", params: {} },
        );
        queueMicrotask(() => { if (frames.length) stdout.write(frames.map(frame => JSON.stringify(frame) + "\n").join("")); });
        callback();
      } }),
    });
    return child;
  });
  const server = createServer();
  const configure = codexAppServer().configureServer;
  if (typeof configure !== "function") throw new Error("Missing configureServer");
  configure({ httpServer: server, middlewares: { use: (_path: string, handler: Parameters<typeof createServer>[1]) => server.on("request", handler!) } } as unknown as ViteDevServer);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing address");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/prepare`, { method: "POST" });
    expect(await response.json()).toEqual({ threadId: "prepared-thread" });
    expect(methods).not.toContain("turn/start");
    const turn = await fetch(`${base}/turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      threadId: "prepared-thread", runId: "run", messages: [{ id: "user", role: "user", content: "hello" }], tools: [], context: [], forwardedProps: { mode: "chat" },
    }) });
    const body = await turn.text();
    expect(body).toContain('"delta":"OK"');
    expect(body).toContain('"type":"RUN_FINISHED"');
    expect(mocked.spawn).toHaveBeenCalledTimes(1);
    expect(methods.filter(method => method === "turn/start")).toHaveLength(1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
