import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(process.cwd(), "../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function exists(path: string): boolean {
  return existsSync(join(root, path));
}

function markdownFiles(dir = "."): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (["archive", "node_modules", "dist", "build", "coverage"].includes(entry.name)) return [];

    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && path.endsWith(".md") ? [path] : [];
  });
}

const publicDocs = {
  overview: read("docs/public/overview.md"),
  quickstart: read("docs/public/quickstart.md"),
  api: read("docs/public/api.md"),
};
const docs = {
  rootReadme: read("README.md"),
  readme: read("packages/json-document/README.md"),
  profile: read("docs/standard/v2-projection-profile.md"),
  llms: read("llms.txt"),
  site: Object.values(publicDocs).join("\n\n"),
  ...publicDocs,
};
const publicContract = JSON.parse(read("packages/json-document/public-contract.json")) as {
  root: { values: string[]; types: string[] };
};
const siteRoutes = JSON.parse(read("apps/site/src/site-routes.json")) as Array<{
  path: string;
  label: string;
  group: string;
}>;

describe("public docs consistency", () => {
  test("uses the three core documents as the official site source", () => {
    expect(readdirSync(join(root, "docs/public")).sort()).toEqual([
      "api.md",
      "overview.md",
      "quickstart.md",
    ]);
    expect(readdirSync(join(root, "docs/standard")).sort()).toEqual([
      "v2-projection-profile.md",
      "v2-public-surface.json",
    ]);

    expect(exists("apps/site/src/docs/json-document-concepts.md")).toBe(false);
    expect(exists("apps/site/src/docs/json-document-tutorial.md")).toBe(false);
    expect(exists("apps/site/src/docs/json-document-api.md")).toBe(false);
    expect(exists("docs/public/extensions.md")).toBe(false);
    expect(exists("docs/public/recipes.md")).toBe(false);
    expect(exists("docs/standard/json-document-spec.md")).toBe(false);
  });

  test("keeps the active site on the v2 core routes", () => {
    expect(siteRoutes.map((route) => route.path)).toEqual([
      "/",
      "/docs",
      "/docs/tutorial",
      "/docs/api",
    ]);
    expect(siteRoutes.every((route) => route.group === "Start")).toBe(true);
    expect(siteRoutes.map((route) => route.label)).toEqual([
      "Overview",
      "Docs",
      "Quickstart",
      "API reference",
    ]);

    const activeSite = [
      read("apps/site/package.json"),
      read("apps/site/src/App.tsx"),
      read("apps/site/src/routes/Docs.tsx"),
      read("apps/site/src/routes/Home.tsx"),
    ].join("\n");
    expect(activeSite).not.toMatch(/json-document-(?:outliner|mobile-cms)/);
    expect(activeSite).not.toMatch(/@interactive-os\/json-document\/(?:session|react)/);
    expect(activeSite).not.toMatch(/\/playground|\/docs\/extensions|\/docs\/recipes/);
  });

  test("keeps non-README markdown under docs", () => {
    const offenders = markdownFiles().filter((path) => {
      const name = path.split("/").pop();
      return !path.startsWith("docs/") && name !== "README.md";
    });

    expect(offenders).toEqual([]);
  });

  test("keeps maintainer history out of external docs", () => {
    for (const [name, source] of Object.entries({ ...publicDocs, llms: docs.llms })) {
      expect(source, name).not.toMatch(/관리자 메모/);
      expect(source, name).not.toMatch(/docs:evaluate/);
      expect(source, name).not.toMatch(/release:check/);
      expect(source, name).not.toMatch(/prepublishOnly/);
      expect(source, name).not.toMatch(/evaluation-loop|public-api-foundation|api-usage-gaps/);
      expect(source, name).not.toMatch(/\d+\s*\/\s*100\s*(?:loops complete|루프 완료)/);
    }
  });

  test("keeps core usage and project understanding in public docs", () => {
    expect(docs.rootReadme).toMatch(/## 문서 지도/);
    expect(docs.rootReadme).toMatch(/docs\/public\/overview\.md/);
    expect(docs.rootReadme).toMatch(/## 코드 지도/);
    expect(docs.rootReadme).toMatch(/packages\/json-document/);
    expect(docs.overview).toMatch(/## 배경/);
    expect(docs.overview).toMatch(/## 핵심 개념/);
    expect(docs.overview).toMatch(/검색: JSONPath -> Pointer\[\]/);
    expect(docs.quickstart).toMatch(/튜토리얼: 작은 카드 편집기 만들기/);
    expect(docs.api).toMatch(/## 작업별 진입점/);
    expect(docs.api).toMatch(/ReadResult/);
    expect(docs.readme).toMatch(/npm install @interactive-os\/json-document@2\.0\.0/);
    expect(docs.readme).toMatch(/provider-neutral/);
    expect(docs.llms).toMatch(/2\.0\.0.*Stable/);
  });

  test("keeps JSONPath scoped to search and JSON Pointer scoped to mutation", () => {
    expect(docs.readme).toMatch(/query\(jsonPath\).*Pointer 배열/);
    expect(docs.profile).toMatch(/JSONPath를 mutation target으로 받아들이면 안 되며/);
    expect(docs.site).toMatch(/JSONPath는 변경 언어가 아닙니다/);
    expect(docs.llms).toMatch(/JSONPath는 검색 전용/);
  });

  test("keeps internal source paths out of public docs", () => {
    for (const [name, source] of Object.entries(docs)) {
      for (const token of [
        "src/index.ts",
        "src/react.ts",
        "application/document",
        "domain/schema",
        "domain/selection",
        "domain/pointer",
        "foundation/patch",
        "foundation/json",
        "foundation/jsonpath",
        "foundation/pointer",
      ]) {
        expect(source, `${name} includes internal source path ${token}`).not.toContain(token);
      }
    }
  });

  test("locks the documented v2 root contract", () => {
    expect(Object.keys(publicContract)).toEqual(["root"]);
    expect(publicContract.root.values).toEqual([
      "appendSegment",
      "applyPatch",
      "buildPointer",
      "createJSONDocument",
      "parentPointer",
      "parsePointer",
      "trackPointer",
      "tryParsePointer",
    ]);
    expect(publicContract.root.types).toEqual([
      "JSONAppliedChange",
      "JSONCapabilityResult",
      "JSONChangeMetadata",
      "JSONDocument",
      "JSONDocumentCommitOptions",
      "JSONDocumentCommitResult",
      "JSONPatchOperation",
      "JSONPatchResult",
      "JSONValue",
      "Pointer",
      "QueryResult",
      "ReadResult",
    ]);

    for (const member of ["value", "at", "query", "canPatch", "commit", "subscribe"]) {
      expect(docs.api).toContain(member);
    }
    expect(docs.api).toMatch(/applyPatch[\s\S]*RFC 6902/);
    expect(docs.api).toMatch(/JSONPath.*query 전용/);
    expect(docs.api).toMatch(/mutation target은 JSON Pointer/);
  });
});
