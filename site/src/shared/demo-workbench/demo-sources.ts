import type { CodeLanguage } from "../ui/code-tokens";

export type DemoSourceFile = {
  readonly path: string;
  readonly language: CodeLanguage;
  readonly load: () => Promise<string>;
};

const sourceModules = import.meta.glob<string>(
  [
    "/src/routes/**/*.{ts,tsx}",
    "/src/shared/**/*.{ts,tsx}",
    "!/src/shared/ui/**",
    "!/src/shared/widget-binding/**",
  ],
  { import: "default", query: "?raw" },
);

const sourceText = new Map<string, Promise<string>>();
const sourceClosures = new Map<string, Promise<ReadonlyArray<DemoSourceFile>>>();
const excludedSources = new Set([
  "routes/connectors/ConnectorDemoPage.tsx",
  "routes/widgets/WidgetDemoFrame.tsx",
]);
const registeredUsageSources = new Set([
  "shared/demo-workbench/use-demo-observation.ts",
]);

export function demoEntrySource(path: string): DemoSourceFile {
  return sourceFile(path);
}

export function discoverDemoSources(entry: string): Promise<ReadonlyArray<DemoSourceFile>> {
  const cached = sourceClosures.get(entry);
  if (cached !== undefined) return cached;
  const discovered = discoverSourceClosure(entry);
  sourceClosures.set(entry, discovered);
  return discovered;
}

async function discoverSourceClosure(entry: string): Promise<ReadonlyArray<DemoSourceFile>> {
  const paths: string[] = [];
  const visited = new Set<string>();

  async function visit(path: string): Promise<void> {
    if (visited.has(path) || isExcluded(path)) return;
    visited.add(path);
    paths.push(path);
    const source = await loadSource(path);
    for (const specifier of relativeSpecifiers(source)) {
      const resolved = resolveSource(path, specifier);
      if (resolved !== undefined) await visit(resolved);
    }
  }

  await visit(entry);
  return paths.map(sourceFile);
}

function sourceFile(path: string): DemoSourceFile {
  if (sourceModules[`/src/${path}`] === undefined) throw new Error(`Unknown demo source: ${path}`);
  return {
    path,
    language: path.endsWith(".tsx") ? "tsx" : "typescript",
    load: () => loadSource(path),
  };
}

function isExcluded(path: string): boolean {
  if (registeredUsageSources.has(path)) return false;
  return path.startsWith("app/")
    || path.startsWith("shared/ui/")
    || path.startsWith("shared/demo-workbench/")
    || path.startsWith("shared/widget-binding/")
    || excludedSources.has(path);
}

function relativeSpecifiers(source: string): ReadonlyArray<string> {
  const specifiers: string[] = [];
  const pattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]!);
  return specifiers;
}

function resolveSource(importer: string, specifier: string): string | undefined {
  const parts = importer.split("/");
  parts.pop();
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  const base = parts.join("/");
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
    .find((candidate) => sourceModules[`/src/${candidate}`] !== undefined);
}

function loadSource(path: string): Promise<string> {
  const cached = sourceText.get(path);
  if (cached !== undefined) return cached;
  const loaded = sourceLoader(path)();
  sourceText.set(path, loaded);
  return loaded;
}

function sourceLoader(path: string): () => Promise<string> {
  const load = sourceModules[`/src/${path}`];
  if (load === undefined) throw new Error(`Unknown demo source: ${path}`);
  return load;
}
