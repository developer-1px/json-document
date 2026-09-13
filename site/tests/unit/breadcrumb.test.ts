import { describe, expect, test } from "vitest";
import { siteRoutes } from "../../route-registry.mjs";
import { breadcrumbTrail, rootNavRoutes, visibleNavChildren } from "../../src/app/breadcrumb";
import type { SiteRoute } from "../../src/app/router";

const routes = siteRoutes as SiteRoute[];

function trail(path: string) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Missing route ${path}`);
  return breadcrumbTrail(route, routes).map((crumb) => `${crumb.label}:${crumb.path}`);
}

describe("breadcrumbTrail", () => {
  test("places owner groups below the new IA sections", () => {
    expect(trail("/docs")).toEqual(["Overview:/", "시작하기:/docs"]);
    expect(trail("/docs/architecture")).toEqual(["Overview:/", "시작하기:/docs", "Architecture:/docs/architecture"]);
    expect(trail("/docs/modules")).toEqual(["Overview:/", "모듈:/docs/modules"]);
    expect(trail("/docs/collaboration/replica")).toEqual([
      "Overview:/", "모듈:/docs/modules", "Collaboration:/docs/collaboration", "Replica:/docs/collaboration/replica",
    ]);
    expect(trail("/docs/selection")).toEqual([
      "Overview:/", "모듈:/docs/modules", "Editing:/docs/editing", "Selection:/docs/selection",
    ]);
    expect(trail("/docs/connector-zod-validate")).toEqual([
      "Overview:/", "모듈:/docs/modules", "Connector:/docs/connectors",
      "Zod:/docs/connector-zod", "Validate:/docs/connector-zod-validate",
    ]);
    expect(trail("/docs/order")).toEqual(["Overview:/", "편집 조합 · Hands:/editors", "Order:/docs/order"]);
    expect(trail("/viewer")).toEqual(["Overview:/", "설계와 진행 상태:/docs/design", "Artifact · Prototype:/viewer"]);
    expect(trail("/applications/calendar")).toEqual([
      "Overview:/", "Applications:/applications", "Calendar:/applications/calendar",
    ]);
  });

  test("keeps hidden compatibility routes out of root navigation", () => {
    expect(rootNavRoutes(routes).map((route) => route.path)).toEqual([]);
  });

  test("shows nested nav children only on the current branch", () => {
    expect(visibleNavChildren("/docs/collaboration", "/docs", routes).map((route) => route.path)).toEqual([]);
    expect(visibleNavChildren("/docs/collaboration/text", "/docs/collaboration/text/lease", routes).map((route) => route.path)).toEqual([
      "/docs/collaboration/text/lease",
    ]);
    expect(visibleNavChildren("/applications", "/applications/calendar", routes).map((route) => route.path)).toEqual([]);
  });
});
