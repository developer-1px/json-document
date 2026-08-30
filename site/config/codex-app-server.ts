import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Plugin } from "vite";

const CODEX_PATH = "/api/llm-agent";

export function codexAppServer(): Plugin {
  return {
    name: "codex-app-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(CODEX_PATH, (req, res) => {
        if (req.method === "GET" && req.url?.startsWith("/sessions")) {
          return listCodexThreads(res);
        }
        if (req.method !== "POST" || !req.url?.startsWith("/turn")) {
          res.statusCode = 405;
          return res.end();
        }

        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          const request = JSON.parse(body) as { prompt?: unknown; sessionId?: unknown };
          streamCodex(String(request.prompt ?? ""), typeof request.sessionId === "string" ? request.sessionId : undefined, res);
        });
      });
    },
  };
}

function streamCodex(prompt: string, sessionId: string | undefined, res: import("node:http").ServerResponse) {
  const child = spawn("codex", ["app-server", "--stdio"], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  lines.on("line", (line) => {
    const message = JSON.parse(line) as { id?: number; method?: string; result?: { thread?: { id: string } }; error?: { message?: string }; params?: { delta?: string } };
    if (message.id === 1) {
      send({ method: "initialized" });
      send(sessionId
        ? { method: "thread/resume", id: 2, params: { threadId: sessionId, cwd: process.cwd(), approvalPolicy: "never", sandbox: "read-only", excludeTurns: true } }
        : { method: "thread/start", id: 2, params: { cwd: process.cwd(), approvalPolicy: "never", sandbox: "read-only", ephemeral: false } });
    } else if (message.id === 2 && message.result?.thread) {
      const threadId = message.result.thread.id;
      res.setHeader("X-Codex-Thread-Id", threadId);
      send({ method: "turn/start", id: 3, params: { threadId, input: [{ type: "text", text: prompt, text_elements: [] }] } });
    } else if (message.id === 2 && message.error) {
      res.statusCode = 400;
      res.end(message.error.message ?? "Codex thread를 열 수 없습니다.");
      child.kill();
    } else if (message.method === "item/agentMessage/delta" && message.params?.delta) {
      res.write(message.params.delta);
    } else if (message.method === "turn/completed") {
      res.end();
      child.kill();
    }
  });

  child.on("error", (error) => {
    res.statusCode = 500;
    res.end(error.message);
  });
  res.on("close", () => child.kill());

  send({ method: "initialize", id: 1, params: { clientInfo: { name: "json-document-dev", title: "JSON Document Dev", version: "0.1.0" }, capabilities: { experimentalApi: true, requestAttestation: false } } });
}

function listCodexThreads(res: import("node:http").ServerResponse) {
  const child = spawn("codex", ["app-server", "--stdio"], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);
  lines.on("line", (line) => {
    const message = JSON.parse(line) as { id?: number; result?: { data?: Array<{ id: string; preview: string; updatedAt: number }> }; error?: { message?: string } };
    if (message.id === 1) {
      send({ method: "initialized" });
      send({ method: "thread/list", id: 2, params: { limit: 30, sortKey: "updated_at", sortDirection: "desc", cwd: process.cwd() } });
    } else if (message.id === 2) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (message.error) res.statusCode = 500;
      res.end(JSON.stringify(message.error ? { error: message.error.message } : { threads: message.result?.data ?? [] }));
      child.kill();
    }
  });
  child.on("error", (error) => { res.statusCode = 500; res.end(JSON.stringify({ error: error.message })); });
  res.on("close", () => child.kill());
  send({ method: "initialize", id: 1, params: { clientInfo: { name: "json-document-dev", title: "JSON Document Dev", version: "0.1.0" }, capabilities: { experimentalApi: true, requestAttestation: false } } });
}
