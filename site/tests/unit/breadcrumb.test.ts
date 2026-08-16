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
    expect(trail("/docs/tutorial")).toEqual(["Overview:/", "JSON Document:/docs", "Quickstart:/docs/tutorial"]);
    expect(trail("/docs")).toEqual(["Overview:/", "JSON Document:/docs", "Why:/docs"]);
    expect(trail("/docs/concepts")).toEqual(["Overview:/", "JSON Document:/docs", "Concepts:/docs/concepts"]);
    expect(trail("/docs/api")).toEqual(["Overview:/", "JSON Document:/docs", "API Reference:/docs/api"]);
    expect(trail("/docs/collaboration")).toEqual(["Overview:/", "JSON Document:/docs", "Collaboration:/docs/collaboration"]);
    expect(trail("/docs/collaboration/text/lease")).toEqual([
      "Overview:/",
      "JSON Document:/docs",
      "Collaboration:/docs/collaboration",
      "Text:/docs/collaboration/text",
      "Contenteditable lease:/docs/collaboration/text/lease",
    ]);
    expect(trail("/docs/selection")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Selection:/docs/selection"]);
    expect(trail("/docs/history")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "History:/docs/history"]);
    expect(trail("/docs/clipboard")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Clipboard:/docs/clipboard"]);
    expect(trail("/docs/topology")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Topology:/docs/topology"]);
    expect(trail("/docs/intent")).toEqual([
      "Overview:/",
      "Editing:/docs/intent-guide",
      "Intent guide:/docs/intent-guide",
      "Intent:/docs/intent",
    ]);
    expect(trail("/docs/intent-guide")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Intent guide:/docs/intent-guide"]);
    expect(trail("/demos")).toEqual(["Overview:/", "Showcase:/demos"]);
    expect(trail("/demo")).toEqual(["Overview:/", "Editors:/editors", "Document:/demo"]);
    expect(trail("/demo/canvas")).toEqual(["Overview:/", "Editors:/editors", "Canvas:/demo/canvas"]);
    expect(trail("/demo/kanban")).toEqual(["Overview:/", "Editors:/editors", "Kanban:/demo/kanban"]);
    expect(trail("/editors")).toEqual(["Overview:/", "Editors:/editors"]);
    expect(trail("/docs/tree")).toEqual(["Overview:/", "Tree:/docs/tree"]);
    expect(trail("/demo/tree")).toEqual(["Overview:/", "Editors:/editors", "Tree:/demo/tree"]);
    expect(trail("/demo/selection")).toEqual([
      "Overview:/",
      "Editing:/docs/intent-guide",
      "Selection:/docs/selection",
      "Selection Demo:/demo/selection",
    ]);
    expect(trail("/demo/topology")).toEqual([
      "Overview:/",
      "Editing:/docs/intent-guide",
      "Topology:/docs/topology",
      "Topology Demo:/demo/topology",
    ]);
    expect(trail("/demo/clipboard")).toEqual([
      "Overview:/",
      "Editing:/docs/intent-guide",
      "Clipboard:/docs/clipboard",
      "Clipboard Demo:/demo/clipboard",
    ]);
    expect(trail("/demo/history")).toEqual([
      "Overview:/",
      "Editing:/docs/intent-guide",
      "History:/docs/history",
      "History Demo:/demo/history",
    ]);
    expect(trail("/demo/database")).toEqual(["Overview:/", "Editors:/editors", "Database:/demo/database"]);
    expect(trail("/adapters")).toEqual(["Overview:/", "Adapters:/adapters"]);
    expect(trail("/adapters/keyboard")).toEqual(["Overview:/", "Adapters:/adapters", "Keyboard:/adapters/keyboard"]);
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
