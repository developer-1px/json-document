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
    if (["node_modules", "dist", "build", "coverage"].includes(entry.name)) return [];

    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && path.endsWith(".md") ? [path] : [];
  });
}

const publicDocs = {
  overview: read("docs/public/overview.md"),
  quickstart: read("docs/public/quickstart.md"),
  api: read("docs/public/api.md"),
  extensions: read("docs/public/extensions.md"),
};
const generatedExtensionsCatalog = read("docs/generated/extensions-catalog.md");
const generatedRepoCatalog = JSON.parse(read("docs/generated/repo-catalog.json")) as {
  officialExtensions: { name: string; path: string; publicExports: string[] }[];
  labExtensions: { name: string; path: string; publicExports: string[] }[];
  totals: { officialExtensions: number; labExtensions: number };
};
const docs = {
  rootReadme: read("README.md"),
  readme: read("packages/json-document/README.md"),
  spec: read("docs/standard/json-document-spec.md"),
  llms: read("llms.txt"),
  site: [...Object.values(publicDocs), generatedExtensionsCatalog].join("\n\n"),
  ...publicDocs,
  generatedExtensionsCatalog,
};
const publicContract = JSON.parse(read("packages/json-document/public-contract.json")) as {
  root: { values: string[]; types: string[] };
  session: { values: string[]; types: string[] };
  react: { values: string[]; types: string[] };
};

function officialExtensionNames(): string[] {
  return readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "json-document")
    .map((entry) => JSON.parse(read(`packages/${entry.name}/package.json`)) as { name: string })
    .map((pkg) => pkg.name)
    .filter((name) => name.startsWith("@interactive-os/json-document-"))
    .sort();
}

describe("public docs consistency", () => {
  test("uses docs/public as the official markdown source", () => {
    expect(exists("docs/public/overview.md")).toBe(true);
    expect(exists("docs/public/quickstart.md")).toBe(true);
    expect(exists("docs/public/api.md")).toBe(true);
    expect(exists("docs/public/extensions.md")).toBe(true);

    expect(exists("apps/site/src/docs/json-document-concepts.md")).toBe(false);
    expect(exists("apps/site/src/docs/json-document-tutorial.md")).toBe(false);
    expect(exists("apps/site/src/docs/json-document-api.md")).toBe(false);
  });

  test("keeps non-README markdown under docs", () => {
    const offenders = markdownFiles().filter((path) => {
      const name = path.split("/").pop();
      return !path.startsWith("docs/") && name !== "README.md";
    });

    expect(offenders).toEqual([]);
  });

  test("keeps maintainer history out of external docs", () => {
    for (const [name, source] of Object.entries({
      readme: docs.readme,
      llms: docs.llms,
      overview: docs.overview,
      quickstart: docs.quickstart,
      api: docs.api,
      extensions: docs.extensions,
    })) {
      expect(source, name).not.toMatch(/관리자 메모/);
      expect(source, name).not.toMatch(/docs:evaluate/);
      expect(source, name).not.toMatch(/release:check/);
      expect(source, name).not.toMatch(/prepublishOnly/);
      expect(source, name).not.toMatch(/evaluation-loop|public-api-foundation|api-usage-gaps/);
      expect(source, name).not.toMatch(/\d+\s*\/\s*100\s*(?:loops complete|루프 완료)/);
    }
  });

  test("keeps usage and project understanding in public docs", () => {
    expect(docs.rootReadme).toMatch(/## 문서 지도/);
    expect(docs.rootReadme).toMatch(/docs\/public\/overview\.md/);
    expect(docs.rootReadme).toMatch(/## 코드 지도/);
    expect(docs.rootReadme).toMatch(/packages\/json-document/);
    expect(docs.overview).toMatch(/## 배경/);
    expect(docs.overview).toMatch(/## 핵심 개념/);
    expect(docs.overview).toMatch(/검색: JSONPath -> Pointer\[\]/);
    expect(docs.overview).toMatch(/## 자주 쓰는 작업/);
    expect(docs.quickstart).toMatch(/튜토리얼: 작은 카드 편집기 만들기/);
    expect(docs.api).toMatch(/## 작업별 진입점/);
    expect(docs.api).toMatch(/ReadResult/);
    expect(docs.extensions).toMatch(/@interactive-os\/json-document-collection/);
    expect(docs.extensions).toMatch(/@interactive-os\/json-document-clipboard-web/);
    expect(docs.generatedExtensionsCatalog).toMatch(/Generated extension catalog/);
    expect(docs.generatedExtensionsCatalog).toMatch(/Official extensions: \d+/);
    expect(docs.readme).toMatch(/npm install @interactive-os\/json-document@2\.0\.0-rc\.0/);
    expect(docs.readme).toMatch(/provider-neutral/);
    expect(docs.llms).toMatch(/2\.0\.0-rc\.0.*Candidate/);
  });

  test("keeps generated repo catalog aligned with package directories", () => {
    const generatedOfficialNames = generatedRepoCatalog.officialExtensions.map((item) => item.name).sort();
    const packageOfficialNames = officialExtensionNames();

    expect(generatedOfficialNames).toEqual(packageOfficialNames);
    expect(generatedRepoCatalog.totals.officialExtensions).toBe(packageOfficialNames.length);
    expect(generatedRepoCatalog.totals.labExtensions).toBeGreaterThan(0);

    for (const name of packageOfficialNames) {
      expect(generatedExtensionsCatalog).toContain(`\`${name}\``);
    }
  });

  test("describe paste targets without legacy target aliases", () => {
    for (const [name, source] of Object.entries(docs)) {
      if (name !== "llms") {
        expect(source, name).not.toMatch(/zod-crud/);
        expect(source, name).not.toMatch(/@json-document\//);
      }
      expect(source, name).not.toMatch(/\{\s*at\s*:/);
      expect(source, name).not.toMatch(/JSONDocumentPasteMode|PasteMode/);
      expect(source, name).not.toMatch(/\bUseJSONDocumentOptions\b|\bUseSelectionOptions\b/);
      expect(source, name).not.toMatch(/\bPasteOptions\b|\bPasteTarget\b/);
      expect(source, name).not.toMatch(/\bSelectionAction\b/);
      expect(source, name).not.toMatch(/\bCopyOk\b|\bCopyError\b|\bCutOk\b|\bCutError\b|\bDuplicateOk\b|\bDuplicateError\b|\bPasteError\b|\bPasteDiscriminatorMismatch\b/);
    }

    expect(docs.api).toMatch(/mutation target은 JSON Pointer/);
    expect(docs.llms).toMatch(/Array append는 `\/items\/-`/);
    expect(docs.llms).toMatch(/공개 Root는 정확히 다음 20개 symbol/);
    expect(docs.llms).toMatch(/`value`는 항상\s+`JSONValue`/);
    expect(docs.llms).toMatch(/Root `JSONDocument`의 subtype이라고 가정하지 않는다/);
  });

  test("keep JSONPath scoped to search and JSON Pointer scoped to mutation", () => {
    expect(docs.readme).toMatch(/query\(jsonPath\).*Pointer 배열/);
    expect(docs.spec).toMatch(/JSONPath는 검색 언어/);
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

  test("keeps the documented API model complete enough for users", () => {
    expect(publicContract.root.values).toContain("createJSONDocument");
    expect(publicContract.react.values).toContain("useJSONDocument");
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
    expect(publicContract.root.types).toHaveLength(12);
    expect(publicContract.session.values).toContain("createJSONDocument");
    expect(docs.api).toContain("canFind");

    expect(docs.api).toMatch(/violations\[\]\.path/);
    expect(docs.api).toMatch(/schema-slot/);
    expect(docs.api).toMatch(/document-result/);
    expect(docs.api).toMatch(/applyPatch[\s\S]*외부 JSON 경계/);
    expect(docs.api).toMatch(/신뢰된 document state/);
    expect(docs.api).toMatch(/구조만 가진 Zod schema/);
    expect(docs.api).toMatch(/전체 루트 schema 검증/);
  });
});
