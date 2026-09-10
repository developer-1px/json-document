import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const endpoint = "/__interaction-recordings";
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createInteractionRecordingMiddleware(directory: string, context: Record<string, string> = {}) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathname = req.url?.split("?")[0] ?? "";
    if (pathname !== endpoint && !pathname.startsWith(endpoint + "/")) return next();
    const reply = (status: number, value: unknown) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(JSON.stringify(value));
    };
    const host = req.headers.host ?? "";
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)
      || (req.headers.origin && req.headers.origin !== `http://${host}`)
      || req.headers["sec-fetch-site"] === "cross-site") return reply(403, { error: "Local same-origin access only" });
    try {
      if (req.method === "GET") {
        if (pathname !== endpoint) {
          const id = pathname.slice(endpoint.length + 1);
          if (!idPattern.test(id)) return reply(400, { error: "Invalid recording ID" });
          try { return reply(200, JSON.parse(readFileSync(join(directory, `${id}.json`), "utf8"))); }
          catch { return reply(404, { error: "Recording not found" }); }
        }
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        const recordings = readdirSync(directory).filter(name => idPattern.test(name.replace(/\.json$/, "")) && name.endsWith(".json"))
          .map(name => {
            const data = JSON.parse(readFileSync(join(directory, name), "utf8"));
            return { id: data.id, startedAt: data.startedAt, endedAt: data.endedAt, reason: data.reason,
              records: data.records.length, path: join(directory, name) };
          }).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        return reply(200, { recordings });
      }
      if (req.method !== "POST" || pathname !== endpoint) return reply(405, { error: "Method not allowed" });
      if (req.headers["content-type"]?.split(";")[0] !== "application/json") return reply(415, { error: "JSON required" });
      let size = 0;
      const chunks: Buffer[] = [];
      req.on("data", chunk => {
        size += chunk.length;
        if (size > 12_000_000) { if (!res.writableEnded) reply(413, { error: "Recording too large" }); return; }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (res.writableEnded) return;
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (data.version !== 1 || !idPattern.test(data.id) || !Array.isArray(data.records)
            || typeof data.startedAt !== "string" || !Number.isFinite(Date.parse(data.startedAt))
            || !(data.endedAt === null || typeof data.endedAt === "string")
            || data.records.some((record: { sequence?: number }, index: number) => record?.sequence !== index + 1)) {
            return reply(400, { error: "Invalid recording" });
          }
          mkdirSync(directory, { recursive: true, mode: 0o700 });
          const path = join(directory, `${data.id}.json`);
          let previous;
          try { previous = JSON.parse(readFileSync(path, "utf8")); } catch { /* First checkpoint. */ }
          // A late checkpoint must never replace a longer or finalized recording.
          if (!previous || (!previous.endedAt && previous.records.length <= data.records.length)) {
            const temporary = path + ".tmp";
            writeFileSync(temporary, JSON.stringify({ ...data, server: context }, null, 2) + "\n", { mode: 0o600 });
            renameSync(temporary, path);
          }
          reply(200, { id: data.id, path });
        } catch (error) {
          reply(error instanceof SyntaxError ? 400 : 500, { error: error instanceof Error ? error.message : "Archive failed" });
        }
      });
    } catch (error) { reply(500, { error: error instanceof Error ? error.message : "Archive failed" }); }
  };
}

export function interactionRecordingServer(): Plugin {
  return {
    name: "interaction-recording-archive", apply: "serve",
    configureServer(server) {
      const worktree = resolve(server.config.root, "..");
      const git = (args: string[]) => {
        try { return execFileSync("git", args, { cwd: worktree, encoding: "utf8" }).trim(); }
        catch { return "unknown"; }
      };
      server.middlewares.use(createInteractionRecordingMiddleware(
        resolve(worktree, ".artifacts/interaction-recordings"),
        { worktree, branch: git(["branch", "--show-current"]), head: git(["rev-parse", "HEAD"]) },
      ));
    },
  };
}
