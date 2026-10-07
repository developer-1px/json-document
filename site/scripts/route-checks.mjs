const routePathPattern = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/;
const navigationGroups = new Set([
  "Introduction",
  "Design",
  "JSON Document",
  "Document Types",
  "Collaboration",
  "Editing",
  "Adapter",
  "Connector",
  "Affordance",
  "UI Primitives",
  "Hands",
  "Artifact",
  "Applications",
]);

export function validateSiteRoutes(routes, fail) {
  if (!Array.isArray(routes) || routes.length === 0) {
    fail("site routes must be a non-empty array.");
    return;
  }

  const paths = new Set();
  const files = new Set();
  const labels = new Set();
  const titles = new Set();
  const descriptions = new Set();

  routes.forEach((route, index) => {
    if (!route || typeof route !== "object") {
      fail(`site route ${index} must be an object.`);
      return;
    }

    if (typeof route.path !== "string" || !routePathPattern.test(route.path)) {
      fail(`site route ${index} has an invalid path.`);
    }
    if (route.path !== "/" && route.path.endsWith("/")) {
      fail(`site route ${route.path} must not have a trailing slash.`);
    }
    if (typeof route.label !== "string" || route.label.trim() === "") {
      fail(`site route ${route.path} is missing a label.`);
    }
    if (typeof route.title !== "string" || route.title.trim() === "") {
      fail(`site route ${route.path} is missing a title.`);
    }
    if (typeof route.description !== "string" || route.description.trim() === "") {
      fail(`site route ${route.path} is missing a description.`);
    }
    if (route.navigationGroup !== undefined && !navigationGroups.has(route.navigationGroup)) {
      fail(`site route ${route.path} has an invalid navigation group.`);
    }
    if (route.heading !== undefined && (typeof route.heading !== "string" || route.heading.trim() === "")) {
      fail(`site route ${route.path} has an invalid heading.`);
    }
    if (route.documentSource !== undefined && !/^(?:docs\/public\/[^/]+|packages\/[^/]+\/docs\/[^/]+)\.md$/.test(route.documentSource)) {
      fail(`site route ${route.path} has an invalid documentation source.`);
    }
    if (route.documentIncludes !== undefined && (!Array.isArray(route.documentIncludes) || route.documentIncludes.some((source) => typeof source !== "string" || !/^packages\/[^/]+\/docs\/[^/]+\.md$/.test(source)))) {
      fail(`site route ${route.path} has invalid owner documentation includes.`);
    }
    if (route.chrome !== undefined && route.chrome !== "app" && route.chrome !== "none") {
      fail(`site route ${route.path} has an invalid chrome.`);
    }
    if (route.relatedDemoLabel !== undefined && (typeof route.relatedDemoLabel !== "string" || route.relatedDemoLabel.trim() === "")) {
      fail(`site route ${route.path} has an invalid related demo label.`);
    }
    if (route.integration !== undefined) {
      const expectedGroup = route.integration.kind === "adapter" ? "Adapter" : "Connector";
      if (!new Set(["adapter", "connector"]).has(route.integration.kind)) {
        fail(`site route ${route.path} has an invalid integration kind.`);
      }
      if (route.navigationGroup !== expectedGroup) {
        fail(`site route ${route.path} integration kind does not match its navigation group.`);
      }
      if (typeof route.integration.packageName !== "string" || !route.integration.packageName.startsWith("@interactive-os/")) {
        fail(`site route ${route.path} has an invalid integration package.`);
      }
    }

    if (typeof route.path === "string") {
      if (paths.has(route.path)) fail(`site routes contain duplicate path ${route.path}.`);
      paths.add(route.path);

      const file = routeFile(route.path);
      if (files.has(file)) fail(`site routes contain duplicate output file ${file}.`);
      files.add(file);
    }

    const labelScope = route.parentPath ?? route.navigationGroup ?? (route.sidebar === false ? route.path : "root");
    const navigationLabel = `${labelScope}:${route.label}`;
    if (labels.has(navigationLabel)) fail(`site navigation group contains duplicate label ${route.label}.`);
    labels.add(navigationLabel);

    if (titles.has(route.title)) fail(`site routes contain duplicate title ${route.title}.`);
    titles.add(route.title);

    if (descriptions.has(route.description)) fail(`site routes contain duplicate description for ${route.path}.`);
    descriptions.add(route.description);
  });

  if (routes[0]?.path !== "/") {
    fail("site routes must start with the overview route.");
  }

  for (const route of routes) {
    if (route.module !== undefined) {
      const module = route.module;
      if (!route.documentSource || !route.navigationGroup || !module.sourceDirectory?.startsWith("packages/") || !module.responsibility?.trim()) {
        fail(`site module ${route.path} needs an API document, responsibility, position and package source.`);
      }
      if (!Array.isArray(module.alsoIn) || module.alsoIn.some(group => !navigationGroups.has(group))) fail(`site module ${route.path} has unknown positions.`);
      if (!Array.isArray(module.usagePaths) || module.usagePaths.length === 0 || module.usagePaths.some(path => !paths.has(path))) fail(`site module ${route.path} needs known Usage routes.`);
      if (routes.some(other => other !== route && other.module?.sourceDirectory === module.sourceDirectory)) fail(`site module ${route.path} repeats a package owner.`);
    }
    if (route.modulePaths !== undefined && (!Array.isArray(route.modulePaths) || route.modulePaths.some(path => !routes.some(candidate => candidate.path === path && candidate.module)))) {
      fail(`site application ${route.path} links to an unknown module.`);
    }
    if (route.relatedDemoPath !== undefined && !paths.has(route.relatedDemoPath)) {
      fail(`site route ${route.path} points to an unknown related demo ${route.relatedDemoPath}.`);
    }
    const isIntegrationDemo = /^\/(?:adapters|connectors)\/[^/]+$/.test(route.path);
    if (isIntegrationDemo && route.integration === undefined) {
      fail(`integration demo ${route.path} must declare catalog metadata.`);
    }
  }
}

export function routeFile(path) {
  return path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
}
