import { describe, expect, test } from "vitest";
import siteRoutes from "../../site-routes.json";
import { breadcrumbTrail, rootNavRoutes } from "../../src/app/breadcrumb";
import type { SiteRoute } from "../../src/app/router";

const routes = siteRoutes as SiteRoute[];

function trail(path: string) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Missing route ${path}`);
  return breadcrumbTrail(route, routes).map((crumb) => `${crumb.label}:${crumb.path}`);
}

describe("breadcrumbTrail", () => {
  test("uses the same Overview root on every interior page", () => {
    expect(trail("/docs/tutorial")).toEqual(["Overview:/", "Why:/docs", "Quickstart:/docs/tutorial"]);
    expect(trail("/docs")).toEqual(["Overview:/", "Why:/docs"]);
    expect(trail("/docs/concepts")).toEqual(["Overview:/", "Why:/docs", "Concepts:/docs/concepts"]);
    expect(trail("/docs/selection")).toEqual(["Overview:/", "Selection:/docs/selection"]);
    expect(trail("/docs/history")).toEqual(["Overview:/", "History:/docs/history"]);
    expect(trail("/docs/clipboard")).toEqual(["Overview:/", "Clipboard:/docs/clipboard"]);
    expect(trail("/docs/topology")).toEqual(["Overview:/", "Topology:/docs/topology"]);
    expect(trail("/docs/intent")).toEqual(["Overview:/", "Intent:/docs/intent"]);
    expect(trail("/docs/intent-guide")).toEqual(["Overview:/", "Intent guide:/docs/intent-guide"]);
    expect(trail("/docs/api")).toEqual(["Overview:/", "API Reference:/docs/api"]);
    expect(trail("/docs/collaboration")).toEqual(["Overview:/", "Why:/docs", "Collaboration:/docs/collaboration"]);
    expect(trail("/docs/collaboration/text")).toEqual([
      "Overview:/",
      "Why:/docs",
      "Collaboration:/docs/collaboration",
      "Collaborative Text:/docs/collaboration/text",
    ]);
    expect(trail("/docs/collaboration/api")).toEqual(["Overview:/", "Collaboration API:/docs/collaboration/api"]);
    expect(trail("/docs/adapters/contenteditable")).toEqual(["Overview:/", "Collaborative Contenteditable:/docs/adapters/contenteditable"]);
    expect(trail("/demos")).toEqual(["Overview:/", "Examples:/demos"]);
    expect(trail("/demo")).toEqual(["Overview:/", "Examples:/demos", "Document:/demo"]);
    expect(trail("/demo/selection")).toEqual(["Overview:/", "Examples:/demos", "Selection Demo:/demo/selection"]);
    expect(trail("/demo/topology")).toEqual(["Overview:/", "Examples:/demos", "Topology Demo:/demo/topology"]);
    expect(trail("/demo/clipboard")).toEqual(["Overview:/", "Examples:/demos", "Clipboard Demo:/demo/clipboard"]);
    expect(trail("/demo/history")).toEqual(["Overview:/", "Examples:/demos", "History Demo:/demo/history"]);
    expect(trail("/demo/database")).toEqual(["Overview:/", "Examples:/demos", "Database:/demo/database"]);
    expect(trail("/connectors")).toEqual(["Overview:/", "Connectors:/connectors"]);
    expect(trail("/connectors/zod")).toEqual(["Overview:/", "Connectors:/connectors", "Zod:/connectors/zod"]);
    expect(trail("/connectors/zod/validate")).toEqual([
      "Overview:/",
      "Connectors:/connectors",
      "Zod:/connectors/zod",
      "Validate:/connectors/zod/validate",
    ]);
  });

  test("does not lift the concept map above layer groups", () => {
    expect(rootNavRoutes(routes)).toEqual([]);
  });
});
