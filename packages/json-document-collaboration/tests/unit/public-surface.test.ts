import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { createCollaborationRuntime } from "../../src/index.js";
import { createHistoryRuntime } from "../../src/history-index.js";
import { createTextRuntime } from "../../src/text-index.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(relativePath: string): string {
  return readFileSync(resolve(packageRoot, relativePath), "utf8");
}

function validOptions(actorId: string) {
  return {
    actorId,
    epochId: "shared-document/v1",
    ruleset: {
      id: "test/json-tree",
      digest: "test/json-tree/v1",
    },
  };
}

describe("public collaboration surface", () => {
  test("createCollaborationRuntime exposes the given initial JSON as document.value", () => {
    const initial = {
      title: "health-board",
      items: [{ id: "a", done: false }],
    };
    const runtime = createCollaborationRuntime(initial, validOptions("actor-a"));
    expect(runtime.document.value).toEqual(initial);
  });

  test("history and text factories keep the same initial document.value", () => {
    const initial = { note: "same-value" };
    const history = createHistoryRuntime(initial, validOptions("actor-b"));
    const text = createTextRuntime(initial, validOptions("actor-c"));
    expect(history.document.value).toEqual(initial);
    expect(text.document.value).toEqual(initial);
  });

  test("package export paths stay the three public entrypoints", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      exports: Record<string, { import?: string; types?: string }>;
    };
    expect(Object.keys(pkg.exports).sort()).toEqual([".", "./history", "./text"]);
    expect(pkg.exports["."]?.import).toBe("./dist/index.js");
    expect(pkg.exports["./history"]?.import).toBe("./dist/history-index.js");
    expect(pkg.exports["./text"]?.import).toBe("./dist/text-index.js");
  });

  test("each independent change reason has one owner module", () => {
    const owners = {
      assembly: "src/create.ts",
      epoch: "src/epoch.ts",
      digest: "src/digest.ts",
      localAuthoring: "src/document-runtime.ts",
      ingest: "src/replica-runtime.ts",
      history: "src/history-runtime.ts",
      text: "src/text-runtime.ts",
    } as const;
    const sources = Object.fromEntries(
      Object.entries(owners).map(([reason, path]) => [reason, readSrc(path)]),
    ) as Record<keyof typeof owners, string>;

    expect(sources.assembly).toMatch(/export function createCollaborationRuntime/);
    expect(sources.assembly).toMatch(/createDocumentRuntime/);
    expect(sources.assembly).toMatch(/createReplicaRuntime/);
    expect(sources.assembly).not.toMatch(/function sha256\(/);
    expect(sources.assembly).not.toMatch(/export function checkEpoch\(/);
    expect(sources.assembly).not.toMatch(/export function createEpoch\(/);
    expect(sources.assembly).not.toMatch(/function prepareLocal\(/);
    expect(sources.assembly).not.toMatch(/ingest\(/);

    expect(sources.epoch).toMatch(/export function createEpoch\(/);
    expect(sources.epoch).toMatch(/export function checkEpoch\(/);
    expect(sources.epoch).toMatch(/export function validateOptions\(/);
    expect(sources.epoch).not.toMatch(/function sha256\(/);
    expect(sources.epoch).not.toMatch(/function prepareLocal\(/);

    expect(sources.digest).toMatch(/export function fingerprintJSON\(/);
    expect(sources.digest).toMatch(/export function canonicalStringify\(/);
    expect(sources.digest).toMatch(/function sha256\(/);
    expect(sources.digest).not.toMatch(/export function checkEpoch\(/);

    expect(sources.localAuthoring).toMatch(/export function createDocumentRuntime\(/);
    expect(sources.localAuthoring).not.toMatch(/export function checkEpoch\(/);
    expect(sources.localAuthoring).not.toMatch(/function sha256\(/);

    expect(sources.ingest).toMatch(/ingest\(/);
    expect(sources.ingest).not.toMatch(/function sha256\(/);
    expect(sources.ingest).not.toMatch(/export function createEpoch\(/);

    expect(sources.history).toMatch(/undo\(/);
    expect(sources.history).toMatch(/redo\(/);
    expect(sources.history).not.toMatch(/function sha256\(/);

    expect(sources.text).toMatch(/capture\(/);
    expect(sources.text).toMatch(/plan\(/);
    expect(sources.text).not.toMatch(/function sha256\(/);
    expect(sources.text).not.toMatch(/export function checkEpoch\(/);
  });
});
