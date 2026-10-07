// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { createLocalMarkdownFiles } from "../../config/local-markdown-files";

const directories: string[] = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
function fixture() { const dir = mkdtempSync(join(tmpdir(), "bear-files-")); directories.push(dir); return { dir, store: createLocalMarkdownFiles(dir) }; }

test("creates, lists, opens and updates a real Markdown file", () => {
  const { dir, store } = fixture();
  const first = store.save("한글 글.md", "# 글\n\n초안", null);
  expect(readFileSync(join(dir, first.name), "utf8")).toBe(first.source);
  expect(store.list().files).toEqual(["한글 글.md"]);
  expect(store.read(first.name)).toEqual(first);
  const next = store.save(first.name, "# 수정된 글", first.version);
  expect(next.version).not.toBe(first.version);
  expect(store.read(first.name).source).toBe("# 수정된 글");
});

test("refuses existing names and changes made outside the app", () => {
  const { dir, store } = fixture();
  const first = store.save("글.md", "원문", null);
  expect(() => store.save("글.md", "덮어쓰기", null)).toThrow("이미 존재");
  writeFileSync(join(dir, "글.md"), "외부 편집");
  expect(() => store.save("글.md", "덮어쓰기", first.version)).toThrow("밖에서 변경");
  expect(store.read("글.md").source).toBe("외부 편집");
});

test("refuses traversal, symlinks and non-Markdown files", () => {
  const { dir, store } = fixture();
  for (const name of ["../escape.md", "a/b.md", "a\\b.md", ".hidden.md", "notes.txt"]) expect(() => store.save(name, "x", null)).toThrow();
  writeFileSync(join(dir, "actual.md"), "keep");
  symlinkSync(join(dir, "actual.md"), join(dir, "link.md"));
  expect(() => store.read("link.md")).toThrow("일반 Markdown");
  expect(() => store.save("link.md", "overwrite", null)).toThrow("일반 Markdown");
  expect(store.list().files).toEqual(["actual.md"]);
});
