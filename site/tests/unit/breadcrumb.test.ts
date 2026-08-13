import { describe, expect, test } from "vitest";
import siteRoutes from "../../site-routes.json";
import { breadcrumbTrail } from "../../src/app/breadcrumb";
import type { SiteRoute } from "../../src/app/router";

const routes = siteRoutes as SiteRoute[];

function trail(path: string) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Missing route ${path}`);
  return breadcrumbTrail(route, routes).map((crumb) => `${crumb.label}:${crumb.path}`);
}

describe("breadcrumbTrail", () => {
  test("uses the same Overview root on every interior page", () => {
    expect(trail("/docs/tutorial")).toEqual(["Overview:/", "Quickstart:/docs/tutorial"]);
    expect(trail("/docs")).toEqual(["Overview:/", "Why:/docs"]);
    expect(trail("/docs/api")).toEqual(["Overview:/", "Why:/docs", "API Reference:/docs/api"]);
    expect(trail("/examples/document")).toEqual(["Overview:/", "Workbench:/examples/document"]);
    expect(trail("/demo")).toEqual(["Overview:/", "Document:/demo"]);
    expect(trail("/demo/database")).toEqual(["Overview:/", "Database:/demo/database"]);
    expect(trail("/connectors")).toEqual(["Overview:/", "Connectors:/connectors"]);
    expect(trail("/connectors/zod")).toEqual(["Overview:/", "Connectors:/connectors", "Zod:/connectors/zod"]);
    expect(trail("/connectors/zod/validate")).toEqual([
      "Overview:/",
      "Connectors:/connectors",
      "Zod:/connectors/zod",
      "Validate:/connectors/zod/validate",
    ]);
  });
});
