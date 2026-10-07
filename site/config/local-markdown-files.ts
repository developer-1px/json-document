import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const maxBytes = 2 * 1024 * 1024;
class FileError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** Development-only Markdown file store. Filenames never resolve outside its directory. */
export function createLocalMarkdownFiles(directory: string) {
  mkdirSync(directory, { recursive: true });
  const path = (name: string) => {
    if (!name.endsWith(".md") || name.startsWith(".") || /[\\/\x00-\x1f]/.test(name) || name.length > 180) throw new FileError("올바른 .md 파일 이름을 입력하세요.", 400);
    const value = join(directory, name);
    if (existsSync(value) && !lstatSync(value).isFile()) throw new FileError("일반 Markdown 파일만 열 수 있습니다.", 400);
    return value;
  };
  const version = (source: string) => createHash("sha256").update(source).digest("hex");
  const read = (name: string) => {
    const target = path(name);
    if (!existsSync(target)) throw new FileError("파일을 찾지 못했습니다.", 404);
    if (lstatSync(target).size > maxBytes) throw new FileError("2MB 이하의 문서만 열 수 있습니다.", 413);
    const source = readFileSync(target, "utf8");
    return { name, source, version: version(source) };
  };
  return {
    list: () => ({ directory, files: readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith(".")).map(entry => entry.name).sort() }),
    read,
    save(name: string, source: string, expectedVersion: string | null) {
      const target = path(name);
      if (Buffer.byteLength(source) > maxBytes) throw new FileError("2MB 이하의 문서만 저장할 수 있습니다.", 413);
      const current = existsSync(target) ? read(name).version : null;
      if (current !== expectedVersion) throw new FileError("파일이 이미 존재하거나 밖에서 변경되었습니다. 다시 불러오거나 다른 이름으로 저장하세요.", 409);
      const temp = join(directory, `.${randomUUID()}.tmp`);
      try { writeFileSync(temp, source, { encoding: "utf8", flag: "wx" }); renameSync(temp, target); }
      finally { if (existsSync(temp)) unlinkSync(temp); }
      return { name, source, version: version(source) };
    },
  };
}

export function localMarkdownFiles(): Plugin {
  return {
    name: "local-markdown-files", apply: "serve",
    configureServer(server) {
      const store = createLocalMarkdownFiles(process.env.BEAR_DOCUMENTS_DIR || fileURLToPath(new URL("../../.local/bear/", import.meta.url)));
      server.middlewares.use("/api/local-markdown", (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        const fail = (error: unknown) => { res.statusCode = error instanceof FileError ? error.status : 500; res.end(JSON.stringify({ error: error instanceof FileError ? error.message : "파일 작업에 실패했습니다." })); };
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return fail(new FileError("같은 개발 서버에서만 파일을 열 수 있습니다.", 403));
        let name: string;
        try { name = decodeURIComponent((req.url ?? "/").split("?")[0]!.slice(1)); }
        catch { return fail(new FileError("파일 이름이 올바르지 않습니다.", 400)); }
        if (req.method === "GET") {
          try { res.end(JSON.stringify(name ? store.read(name) : store.list())); } catch (error) { fail(error); }
          return;
        }
        if (req.method !== "PUT" || !req.headers["content-type"]?.startsWith("application/json")) return fail(new FileError("JSON 저장 요청만 지원합니다.", 400));
        let body = "", bytes = 0;
        req.setEncoding("utf8");
        req.on("data", chunk => {
          bytes += Buffer.byteLength(chunk);
          if (bytes <= maxBytes * 2) body += chunk;
        });
        req.on("end", () => {
          if (bytes > maxBytes * 2) return fail(new FileError("요청이 너무 큽니다.", 413));
          try {
            let value: { source?: unknown; version?: unknown };
            try { value = JSON.parse(body); } catch { throw new FileError("JSON 형식이 올바르지 않습니다.", 400); }
            if (!value || typeof value.source !== "string" || !(value.version === null || typeof value.version === "string")) throw new FileError("본문과 파일 버전이 필요합니다.", 400);
            res.end(JSON.stringify(store.save(name, value.source, value.version)));
          } catch (error) { fail(error); }
        });
      });
    },
  };
}
