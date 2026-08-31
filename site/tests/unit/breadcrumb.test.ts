import { describe, expect, test } from "vitest";
import siteRoutes from "../../site-routes.json";
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
    expect(trail("/docs")).toEqual(["Overview:/", "Introduce:/docs"]);
    expect(trail("/docs/concepts")).toEqual(["Overview:/", "Introduce:/docs", "Concept Map:/docs/concepts"]);
    expect(trail("/docs/foundation")).toEqual(["Overview:/", "Foundation:/docs/foundation"]);
    expect(trail("/docs/collaboration/replica")).toEqual([
      "Overview:/", "Foundation:/docs/foundation", "Collaboration:/docs/collaboration", "Replica:/docs/collaboration/replica",
    ]);
    expect(trail("/docs/selection")).toEqual([
      "Overview:/", "Foundation:/docs/foundation", "Editing:/docs/intent-guide", "Selection:/docs/selection",
    ]);
    expect(trail("/docs/connector-zod-validate")).toEqual([
      "Overview:/", "Building Blocks:/docs/adapters", "Ecosystem Connectors:/docs/connectors",
      "Zod:/docs/connector-zod", "Validate:/docs/connector-zod-validate",
    ]);
    expect(trail("/docs/order")).toEqual(["Overview:/", "Hands:/editors", "Order:/docs/order"]);
    expect(trail("/viewer")).toEqual(["Overview:/", "Artifact:/viewer"]);
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
