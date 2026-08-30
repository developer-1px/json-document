import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Plugin } from "vite";
import { EventType, RunAgentInputSchema, type BaseEvent } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { codexNotificationToAgUi, type CodexAgUiState, type CodexNotification } from "./codex-ag-ui";

const CODEX_PATH = "/api/llm-agent";

export function codexAppServer(): Plugin {
  return {
    name: "codex-app-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(CODEX_PATH, (req, res) => {
        const sessionMatch = req.url?.match(/^\/sessions\/([^?]+)/);
        if (req.method === "GET" && sessionMatch) {
          return readCodexThread(decodeURIComponent(sessionMatch[1]!), res);
        }
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
          const input = RunAgentInputSchema.parse(JSON.parse(body));
          const userMessage = [...input.messages].reverse().find((message) => message.role === "user");
          const prompt = typeof userMessage?.content === "string" ? userMessage.content : "";
          streamCodex(prompt, input.threadId || undefined, input.runId, res);
        });
      });
    },
  };
}

function streamCodex(prompt: string, sessionId: string | undefined, requestedRunId: string, res: import("node:http").ServerResponse) {
  const child = spawn("codex", ["app-server", "--stdio"], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);

  const encoder = new EventEncoder({ accept: String(res.req.headers.accept ?? "text/event-stream") });
  const emit = (event: BaseEvent) => res.write(encoder.encode(event));
  let mappingState: CodexAgUiState | undefined;
  res.setHeader("Content-Type", encoder.getContentType());
  res.setHeader("Cache-Control", "no-store");

  lines.on("line", (line) => {
    const message = JSON.parse(line) as { id?: number; method?: string; result?: { thread?: { id: string } }; error?: { message?: string }; params?: { threadId?: string; turnId?: string; itemId?: string; delta?: string; turn?: { id: string; status: string; error?: { message?: string } | null } } };
    if (message.id === 1) {
      send({ method: "initialized" });
      send(sessionId
        ? { method: "thread/resume", id: 2, params: { threadId: sessionId, cwd: process.cwd(), approvalPolicy: "never", sandbox: "read-only", excludeTurns: true } }
        : { method: "thread/start", id: 2, params: { cwd: process.cwd(), approvalPolicy: "never", sandbox: "read-only", ephemeral: false } });
    } else if (message.id === 2 && message.result?.thread) {
      const threadId = message.result.thread.id;
      mappingState = { threadId, runId: requestedRunId };
      send({ method: "turn/start", id: 3, params: { threadId, input: [{ type: "text", text: prompt, text_elements: [] }] } });
    } else if (message.id === 2 && message.error) {
      emit({ type: EventType.RUN_ERROR, message: message.error.message ?? "Codex thread를 열 수 없습니다." });
      res.end();
      child.kill();
    } else if (mappingState && message.method) {
      const mapped = codexNotificationToAgUi(mappingState, message as CodexNotification);
      mappingState = mapped.state;
      for (const event of mapped.events) emit(event);
      if (mapped.completed) {
        res.end();
        child.kill();
      }
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

function readCodexThread(threadId: string, res: import("node:http").ServerResponse) {
  const child = spawn("codex", ["app-server", "--stdio"], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);
  lines.on("line", (line) => {
    const message = JSON.parse(line) as { id?: number; result?: { thread?: { turns?: Array<{ items?: Array<Record<string, unknown>> }> } }; error?: { message?: string } };
    if (message.id === 1) {
      send({ method: "initialized" });
      send({ method: "thread/read", id: 2, params: { threadId, includeTurns: true } });
    } else if (message.id === 2) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (message.error) res.statusCode = 500;
      const items = message.result?.thread?.turns?.flatMap((turn) => turn.items ?? []) ?? [];
      res.end(JSON.stringify(message.error ? { error: message.error.message } : { messages: items.flatMap(toChatMessage) }));
      child.kill();
    }
  });
  child.on("error", (error) => { res.statusCode = 500; res.end(JSON.stringify({ error: error.message })); });
  res.on("close", () => child.kill());
  send({ method: "initialize", id: 1, params: { clientInfo: { name: "json-document-dev", title: "JSON Document Dev", version: "0.1.0" }, capabilities: { experimentalApi: true, requestAttestation: false } } });
}

function toChatMessage(item: Record<string, unknown>): Array<{ id: string; role: "user" | "assistant"; text: string }> {
  if (item.type === "agentMessage" && typeof item.id === "string" && typeof item.text === "string") return [{ id: item.id, role: "assistant", text: item.text }];
  if (item.type !== "userMessage" || typeof item.id !== "string" || !Array.isArray(item.content)) return [];
  const text = item.content.flatMap((content) => typeof content === "object" && content && "text" in content && typeof content.text === "string" ? [content.text] : []).join("\n");
  return text ? [{ id: item.id, role: "user", text }] : [];
}
