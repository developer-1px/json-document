import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("package boundary", () => {
  test("exports only the package root", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    expect(Object.keys(manifest.exports)).toEqual(["."]);
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.peerDependencies).toBeUndefined();
  });

  test("source has no platform or document dependency", () => {
    const source = sourceFiles(join(packageRoot, "src"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    for (const forbidden of [
      "HTMLElement", "MouseEvent", "KeyboardEvent", "PointerEvent", "getBoundingClientRect",
      "from \"react\"", "@interactive-os/json-document",
    ]) expect(source).not.toContain(forbidden);
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}
