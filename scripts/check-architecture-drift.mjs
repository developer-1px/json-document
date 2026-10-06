import { fileURLToPath } from "node:url";
import modules from "../architecture/modules.json" with { type: "json" };
import { siteRoutes } from "../site/route-registry.mjs";
import { applicationRelationErrors, moduleRegistrationErrors, sourceImportGraph } from "./architecture-drift.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = moduleRegistrationErrors(root, modules, siteRoutes);
for (const app of siteRoutes.filter(route => route.modulePaths)) {
  if (!app.applicationSource) { errors.push(`Application source missing: ${app.path}`); continue; }
  const graph = sourceImportGraph(root, app.applicationSource, modules);
  errors.push(...graph.errors, ...applicationRelationErrors(app, graph, siteRoutes));
  if (process.argv.includes("--evidence")) {
    for (const path of app.modulePaths) {
      const owner = siteRoutes.find(page => page.path === path).module.packageName;
      console.log(`${app.path} -> ${owner}\n  ${graph.packages.get(owner)?.join(" -> ") ?? "MISSING"}`);
    }
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exitCode = 1;
} else console.log(`Architecture drift checks passed: ${modules.length} package owners; ${siteRoutes.filter(route => route.modulePaths).length} application source graphs. Semantic ownership and runtime behavior require separate audits.`);
