import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { routeFile, validateSiteRoutes } from "./route-checks.mjs";

const siteRoot = new URL("..", import.meta.url).pathname;
const dist = join(siteRoot, "dist");
const expectedBase = normalizeBase(process.env.SITE_BASE ?? "/");
const expectedSiteUrl = (process.env.SITE_URL ?? "https://developer-1px.github.io/json-document").replace(/\/$/, "");
const siteRoutes = JSON.parse(readFileSync(join(siteRoot, "site-routes.json"), "utf8"));
validateSiteRoutes(siteRoutes, fail);
validateSourceBoundaries();
const routes = siteRoutes.map((route) => ({ ...route, file: routeFile(route.path) }));

function read(path) {
  return readFileSync(join(dist, path), "utf8");
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function normalizeBase(value) {
  if (value === "" || value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}/`;
}

function validateSourceBoundaries() {
  const src = join(siteRoot, "src");
  const routesRoot = join(src, "routes");
  const rootEntries = readdirSync(src, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();

  if (JSON.stringify(rootEntries) !== JSON.stringify(["app", "main.tsx", "routes", "shared"])) {
    fail(`site src root must contain only app, main.tsx, route owners, and shared UI: ${rootEntries.join(", ")}.`);
  }

  const flatRouteFiles = readdirSync(routesRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  if (flatRouteFiles.length > 0) {
    fail(`site routes must be owner directories, not flat files: ${flatRouteFiles.join(", ")}.`);
  }

  for (const file of sourceFiles(routesRoot)) {
    const owner = relative(routesRoot, file).split("/")[0];
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\s*\()["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (!specifier?.startsWith(".")) continue;
      const target = resolve(dirname(file), specifier);
      const targetRelative = relative(routesRoot, target);
      if (targetRelative.startsWith("..")) continue;
      const targetOwner = targetRelative.split("/")[0];
      if (targetOwner !== owner) {
        fail(`site route owner ${owner} must not import sibling route owner ${targetOwner}: ${relative(siteRoot, file)}.`);
      }
    }
  }

  const sharedRoot = join(src, "shared");
  for (const file of sourceFiles(sharedRoot)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\s*\()["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (!specifier?.startsWith(".")) continue;
      const target = resolve(dirname(file), specifier);
      if (relative(routesRoot, target).startsWith("..") === false || relative(join(src, "app"), target).startsWith("..") === false) {
        fail(`site shared UI must not import app or route owners: ${relative(siteRoot, file)}.`);
      }
    }
  }

  const packagesRoot = join(siteRoot, "..", "packages");
  for (const file of sourceFiles(packagesRoot)) {
    if (/\bsite\/src\b/.test(readFileSync(file, "utf8"))) {
      fail(`reusable package must not import site/src: ${relative(join(siteRoot, ".."), file)}.`);
    }
  }
}

function sourceFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", "coverage"].includes(entry.name)) return [];
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function routeUrl(path) {
  return path === "/" ? `${expectedSiteUrl}/` : `${expectedSiteUrl}${path}`;
}

for (const file of [
  ...routes.map((route) => route.file),
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "favicon.svg",
  "site.webmanifest",
]) {
  if (!existsSync(join(dist, file))) fail(`site dist missing ${file}.`);
}

const index = read("index.html");
const fallback = read("404.html");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
const manifest = JSON.parse(read("site.webmanifest"));

for (const pattern of [
  /<title>json-document - Agent artifact editing<\/title>/,
  /name="description"/,
  /property="og:title"/,
  /property="og:description"/,
  /name="twitter:card"/,
  /rel="canonical"/,
  /rel="icon"/,
  /rel="manifest"/,
]) {
  if (!pattern.test(index)) fail(`site dist index missing ${pattern}.`);
}

if (/%BASE_URL%/.test(index)) fail("site dist index contains an unexpanded Vite base placeholder.");
if (/rel="modulepreload"[^>]+\/assets\/(?:playground-|json-document-)/.test(index)) {
  fail("site dist index must not preload playground or engine chunks before a demo route is opened.");
}

if (fallback !== index) fail("site dist 404.html must match index.html for SPA deep links.");
for (const route of routes) {
  const routeHtml = read(route.file);
  const canonical = routeUrl(route.path);
  if (!routeHtml.includes(`<title>${route.title}</title>`)) fail(`site dist ${route.file} missing route title.`);
  if (!hasMetaContent(routeHtml, "name", "description", route.description)) fail(`site dist ${route.file} missing route description.`);
  if (!routeHtml.includes(`rel="canonical" href="${canonical}"`)) fail(`site dist ${route.file} missing route canonical.`);
  if (!hasMetaContent(routeHtml, "property", "og:description", route.description)) fail(`site dist ${route.file} missing route og:description.`);
  if (!routeHtml.includes(`property="og:url" content="${canonical}"`)) fail(`site dist ${route.file} missing route og:url.`);
  if (!hasMetaContent(routeHtml, "name", "twitter:description", route.description)) fail(`site dist ${route.file} missing route twitter:description.`);
  verifyLocalAssets(routeHtml, route.file);
}

if (!robots.includes(`Sitemap: ${expectedSiteUrl}/sitemap.xml`)) {
  fail("site dist robots.txt missing production sitemap URL.");
}

for (const route of routes) {
  const loc = routeUrl(route.path);
  if (!sitemap.includes(`<loc>${loc}</loc>`)) fail(`site dist sitemap missing ${loc}.`);
}

if (
  manifest.name !== "@interactive-os/json-document"
  || manifest.short_name !== "@interactive-os/json-document"
  || manifest.theme_color !== "#fafaf9"
  || !Array.isArray(manifest.icons)
  || manifest.icons.length === 0
) {
  fail("site dist manifest is incomplete.");
}

if (expectedBase !== "/") {
  for (const path of [
    `${expectedBase}assets/`,
    `${expectedBase}favicon.svg`,
    `${expectedBase}site.webmanifest`,
  ]) {
    if (!index.includes(path)) fail(`site dist index missing expected base path ${path}.`);
  }
}

for (const publicPath of localAssetPaths(index)) {
  const relativePath = relativeDistPath(publicPath, "index.html");
  if (relativePath === null) continue;
  if (!existsSync(join(dist, relativePath))) {
    fail(`site dist index references missing asset ${publicPath}.`);
  }
}

if (process.exitCode === undefined) {
  console.log("site evaluation ok");
}

function verifyLocalAssets(source, label) {
  for (const publicPath of localAssetPaths(source)) {
    const relativePath = relativeDistPath(publicPath, label);
    if (relativePath === null) continue;
    if (!existsSync(join(dist, relativePath))) {
      fail(`site dist ${label} references missing asset ${publicPath}.`);
    }
  }
}

function localAssetPaths(source) {
  return Array.from(
    source.matchAll(/\b(?:src|href)="([^"]+)"/g),
    (match) => match[1],
  ).filter((path) => path && !/^(?:https?:|mailto:|#)/.test(path));
}

function hasMetaContent(source, attribute, key, content) {
  return new RegExp(`<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content="${escapeRegExp(content)}"`).test(source);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function relativeDistPath(publicPath, label) {
  if (expectedBase === "/") {
    return publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  }

  if (!publicPath.startsWith(expectedBase)) {
    fail(`site dist ${label} local asset does not use expected base ${expectedBase}: ${publicPath}.`);
    return null;
  }

  return publicPath.slice(expectedBase.length);
}
