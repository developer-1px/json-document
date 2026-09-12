import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { documentationMap, modulePositions } from "../../src/app/documentation-map";
import { pageDescriptors, pageDescriptor } from "../../src/app/page-descriptors";
import { siteSections } from "../../src/app/site-layers";

const root = resolve(import.meta.dirname, "../../..");
const modules = pageDescriptors.filter(page => page.module);

describe("documentation ownership and discovery", () => {
  test("covers each real workspace package once with an API, role and real usage", () => {
    const packages = readdirSync(resolve(root, "packages")).filter(name => existsSync(resolve(root, "packages", name, "package.json")));
    expect(modules.map(page => page.module!.sourceDirectory).sort()).toEqual(packages.map(name => `packages/${name}`).sort());
    for (const page of modules) {
      const module = page.module!;
      const manifest = JSON.parse(readFileSync(resolve(root, module.sourceDirectory, "package.json"), "utf8"));
      expect(Object.keys(manifest.exports).length).toBeGreaterThan(0);
      expect(existsSync(resolve(root, page.documentSource!))).toBe(true);
      expect(modulePositions(page).every(group => siteSections.some(section => section.groups.includes(group)))).toBe(true);
      expect(module.usagePaths.length).toBeGreaterThan(0);
      for (const path of module.usagePaths) expect(pageDescriptor(path)).toBeDefined();
    }
  });

  test("renders both directions of observed product composition and multiple responsibilities", () => {
    for (const application of pageDescriptors.filter(page => page.modulePaths)) {
      for (const path of application.modulePaths!) {
        expect(pageDescriptor(path).module).toBeDefined();
        expect(documentationMap(pageDescriptor(path))).toContain(`](${application.path})`);
      }
    }
    expect(documentationMap(pageDescriptor("/docs/document-types"))).toContain("](/docs/api/editing)");
    expect(documentationMap(pageDescriptor("/docs/api/editing"))).toContain("소유권 감사");
    expect(documentationMap(pageDescriptor("/docs/api/markdown-react"))).toContain("](/demo/markdown-caret)");
    expect(documentationMap(pageDescriptor("/docs/api/markdown-react"))).toContain("](/demo/markdown)");
  });

  test("the architecture map includes every module without treating a product as a module", () => {
    const map = documentationMap(pageDescriptor("/docs/architecture"));
    for (const page of modules) expect(map).toContain(`](${page.path})`);
    expect(map).toContain("전체 의존성 목록이 아닙니다");
    expect(pageDescriptor("/applications/bear").module).toBeUndefined();
  });
});
