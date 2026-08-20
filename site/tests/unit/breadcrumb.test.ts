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
  test("uses the same Overview root on every interior page", () => {
    expect(trail("/docs/tutorial")).toEqual(["Overview:/", "JSON Document:/docs", "Quickstart:/docs/tutorial"]);
    expect(trail("/docs")).toEqual(["Overview:/", "JSON Document:/docs", "Why:/docs"]);
    expect(trail("/docs/concepts")).toEqual(["Overview:/", "JSON Document:/docs", "Concepts:/docs/concepts"]);
    expect(trail("/docs/api")).toEqual(["Overview:/", "JSON Document:/docs", "API Reference:/docs/api"]);
    expect(trail("/docs/collaboration")).toEqual(["Overview:/", "Collaboration:/docs/collaboration"]);
    expect(trail("/docs/collaboration/replica")).toEqual([
      "Overview:/",
      "Collaboration:/docs/collaboration",
      "Replica:/docs/collaboration/replica",
    ]);
    expect(trail("/docs/collaboration/text/lease")).toEqual([
      "Overview:/",
      "Collaboration:/docs/collaboration",
      "Text:/docs/collaboration/text",
      "native-input DOM lease:/docs/collaboration/text/lease",
    ]);
    expect(trail("/docs/selection")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Selection:/docs/selection"]);
    expect(trail("/docs/history")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "History:/docs/history"]);
    expect(trail("/docs/clipboard")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Clipboard:/docs/clipboard"]);
    expect(trail("/docs/topology")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Topology:/docs/topology"]);
    expect(trail("/docs/intent")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Intent:/docs/intent"]);
    expect(trail("/docs/intent-guide")).toEqual(["Overview:/", "Editing:/docs/intent-guide", "Intent guide:/docs/intent-guide"]);
    expect(trail("/demo")).toEqual(["Overview:/", "Hands:/editors", "Document:/demo"]);
    expect(trail("/docs/order")).toEqual(["Overview:/", "Hands:/editors", "Order:/docs/order"]);
    expect(trail("/demo/order")).toEqual(["Overview:/", "Hands:/editors", "Order:/docs/order", "Order Demo:/demo/order"]);
    expect(trail("/docs/object")).toEqual(["Overview:/", "Hands:/editors", "Object:/docs/object"]);
    expect(trail("/demo/object")).toEqual(["Overview:/", "Hands:/editors", "Object:/docs/object", "Object Demo:/demo/object"]);
    expect(trail("/demo/canvas")).toEqual(["Overview:/", "Hands:/editors", "Object:/docs/object", "Canvas:/demo/canvas"]);
    expect(trail("/demo/kanban")).toEqual(["Overview:/", "Hands:/editors", "Kanban:/demo/kanban"]);
    expect(trail("/editors")).toEqual(["Overview:/", "Hands:/editors"]);
    expect(trail("/docs/tree")).toEqual(["Overview:/", "Hands:/editors", "Tree:/docs/tree"]);
    expect(trail("/demo/tree")).toEqual(["Overview:/", "Hands:/editors", "Tree:/docs/tree", "Tree Demo:/demo/tree"]);
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
    expect(trail("/demo/database")).toEqual(["Overview:/", "Hands:/editors", "Database:/demo/database"]);
    expect(trail("/adapters")).toEqual(["Overview:/", "Adapter:/adapters"]);
    expect(trail("/adapters/keyboard")).toEqual(["Overview:/", "Adapter:/adapters", "Keyboard:/adapters/keyboard"]);
    expect(trail("/adapters/clipboard")).toEqual(["Overview:/", "Adapter:/adapters", "Clipboard adapter:/adapters/clipboard"]);
    expect(trail("/docs/react-editing")).toEqual([
      "Overview:/",
      "Connector:/connectors",
      "Connector guide:/docs/connectors",
      "React editing:/docs/react-editing",
    ]);
    expect(trail("/connectors")).toEqual(["Overview:/", "Connector:/connectors"]);
    expect(trail("/connectors/zod")).toEqual(["Overview:/", "Connector:/connectors", "Zod:/connectors/zod"]);
    expect(trail("/connectors/zod/validate")).toEqual([
      "Overview:/",
      "Connector:/connectors",
      "Zod:/connectors/zod",
      "Validate:/connectors/zod/validate",
    ]);
    expect(trail("/docs/affordance")).toEqual(["Overview:/", "Affordance:/docs/affordance"]);
    expect(trail("/docs/affordance/select")).toEqual([
      "Overview:/",
      "Affordance:/docs/affordance",
      "고르기:/docs/affordance/select",
    ]);
    expect(trail("/widgets/toolbar")).toEqual([
      "Overview:/",
      "Affordance:/docs/affordance",
      "되돌리기:/docs/affordance/history",
      "Toolbar:/widgets/toolbar",
    ]);
  });

  test("does not lift the concept map above layer groups", () => {
    expect(rootNavRoutes(routes)).toEqual([]);
  });

  test("shows nested nav children only on the current branch", () => {
    expect(visibleNavChildren("/docs/collaboration", "/docs", routes).map((route) => route.path)).toEqual([]);
    expect(visibleNavChildren("/docs/collaboration", "/docs/collaboration", routes).map((route) => route.path)).toEqual([]);
    expect(visibleNavChildren("/docs/selection", "/docs/selection", routes).map((route) => route.path)).toEqual([]);
    expect(visibleNavChildren("/docs/collaboration/text", "/docs/collaboration/text/lease", routes).map((route) => route.path)).toEqual([
      "/docs/collaboration/text/lease",
    ]);
    expect(visibleNavChildren("/docs/object", "/demo/canvas", routes).map((route) => route.path)).toEqual([
      "/demo/object",
      "/demo/canvas",
    ]);
  });
});
