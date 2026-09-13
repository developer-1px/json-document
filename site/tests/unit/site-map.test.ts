import { describe, expect, test } from "vitest";
import { pageDescriptor, pageDescriptors } from "../../src/app/page-descriptors";
import { breadcrumbTrail, routeSection, visibleNavChildren } from "../../src/app/breadcrumb";
import { siteSections, groupLandings } from "../../src/app/site-layers";
import { documentationMap } from "../../src/app/documentation-map";

describe("site map separates available contracts from design status", () => {
  test("provides the agreed five entrances and eight module responsibilities", () => {
    expect(siteSections.map(section => section.label)).toEqual([
      "시작하기", "모듈", "편집 조합 · Hands", "Applications", "설계와 진행 상태",
    ]);
    const modules = siteSections.find(section => section.id === "modules")!;
    expect(modules.groups).toEqual(["JSON Document", "Document Types", "Editing", "Collaboration", "Adapter", "Connector", "Affordance", "UI Primitives"]);
    for (const group of modules.groups) {
      const landing = pageDescriptor(groupLandings[group].path);
      expect(landing.sidebar).not.toBe(false);
      expect(documentationMap(pageDescriptor("/docs/modules"))).toContain(`](${landing.path})`);
    }
  });

  test("keeps goals and all ownership candidates in design while public APIs keep their roles", () => {
    for (const path of ["/viewer", "/docs/official-hands", "/docs/ownership", ...pageDescriptors.filter(page => page.path.startsWith("/docs/document-types/")).map(page => page.path)]) {
      expect(routeSection(pageDescriptor(path), pageDescriptors)?.id).toBe("design");
    }
    expect(routeSection(pageDescriptor("/docs/api/calendar-document"), pageDescriptors)?.id).toBe("modules");
    expect(routeSection(pageDescriptor("/docs/hands-support"), pageDescriptors)?.id).toBe("hands");
    expect(documentationMap(pageDescriptor("/docs/ownership"))).toContain("소유권 확정 · RC");
    expect(breadcrumbTrail(pageDescriptor("/docs/document-types/tree"), pageDescriptors).map(crumb => crumb.path)).toEqual([
      "/", "/docs/design", "/docs/ownership", "/docs/document-types/tree",
    ]);
  });

  test("each visible page has a known section and no hidden or cyclic navigation ancestors", () => {
    for (const page of pageDescriptors.filter(page => page.path !== "/" && page.sidebar !== false)) {
      expect(routeSection(page, pageDescriptors), page.path).toBeDefined();
      const seen = new Set([page.path]);
      let child = page;
      while (child.parentPath) {
        const parent = pageDescriptor(child.parentPath);
        expect(seen.has(parent.path), page.path).toBe(false);
        expect(parent.sidebar, page.path).not.toBe(false);
        expect(visibleNavChildren(parent.path, page.path, pageDescriptors).some(route => route.path === child.path), page.path).toBe(true);
        seen.add(parent.path);
        child = parent;
      }
    }
  });
});
