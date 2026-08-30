import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Plugin } from "vite";

const CODEX_PATH = "/__dev/codex";

export function codexAppServer(): Plugin {
  return {
    name: "codex-app-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(CODEX_PATH, (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }

        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => streamCodex(String(JSON.parse(body).prompt ?? ""), res));
      });
    },
  };
}

function streamCodex(prompt: string, res: import("node:http").ServerResponse) {
  const child = spawn("codex", ["app-server", "--stdio"], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  lines.on("line", (line) => {
    const message = JSON.parse(line) as { id?: number; method?: string; result?: { thread?: { id: string } }; params?: { delta?: string } };
    if (message.id === 1) {
      send({ method: "initialized" });
      send({ method: "thread/start", id: 2, params: { cwd: process.cwd(), approvalPolicy: "never", sandbox: "read-only", ephemeral: true } });
    } else if (message.id === 2 && message.result?.thread) {
      send({ method: "turn/start", id: 3, params: { threadId: message.result.thread.id, input: [{ type: "text", text: prompt, text_elements: [] }] } });
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
