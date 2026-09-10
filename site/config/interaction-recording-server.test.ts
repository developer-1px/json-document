import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInteractionRecordingMiddleware } from "./interaction-recording-server.ts";

test("archive persists recordings, refuses foreign origins and cannot regress a final recording", async () => {
  const directory = mkdtempSync(join(tmpdir(), "interaction-recordings-"));
  const middleware = createInteractionRecordingMiddleware(directory, { worktree: "test" });
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const endpoint = `http://127.0.0.1:${port}/__interaction-recordings`;
  const recording = { version: 1, id: "12345678-1234-1234-1234-123456789012", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), records: [{ sequence: 1, kind: "input" }] };
  const post = (data: unknown, origin?: string) => fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(data) });
  try {
    assert.equal((await post(recording, "https://foreign.example")).status, 403);
    assert.equal((await post({ ...recording, id: "../outside" })).status, 400);
    assert.equal((await post(recording)).status, 200);
    assert.equal((await post({ ...recording, endedAt: null, records: [] })).status, 200);
    const saved = JSON.parse(readFileSync(join(directory, recording.id + ".json"), "utf8"));
    assert.equal(saved.records.length, 1);
    assert.equal(saved.endedAt, recording.endedAt);
    assert.deepEqual(saved.server, { worktree: "test" });
    const index = await (await fetch(endpoint)).json() as { recordings: unknown[] };
    assert.equal(index.recordings.length, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
