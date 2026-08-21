import type { CodeLanguage } from "../ui/code-tokens";

export type DemoSourceFile = {
  readonly path: string;
  readonly language: CodeLanguage;
  readonly source: string;
};

const sourceModules = import.meta.glob<true, string, () => Promise<string>>(
  [
    "/src/routes/**/*.{ts,tsx}",
    "/src/shared/**/*.{ts,tsx}",
    "!/src/shared/ui/**",
    "!/src/shared/demo-workbench/**",
  ],
  { import: "default", query: "?raw" },
);

const demoSourceEntries: Readonly<Record<string, string>> = {
  "/demo": "routes/document-demo/DocumentDemoRoute.tsx",
  "/demo/order": "routes/order-demo/OrderDemoRoute.tsx",
  "/demo/object": "routes/object-demo/ObjectDemoRoute.tsx",
  "/demo/canvas": "routes/canvas-demo/CanvasDemoRoute.tsx",
  "/demo/sheet": "routes/sheet-demo/SheetDemoRoute.tsx",
  "/demo/database": "routes/database-demo/DatabaseDemoRoute.tsx",
  "/demo/tree": "routes/tree-demo/TreeDemoRoute.tsx",
  "/demo/kanban": "routes/kanban-demo/KanbanDemoRoute.tsx",
  "/demo/topology": "routes/editing-demos/TopologyDemoRoute.tsx",
  "/demo/selection": "routes/editing-demos/SelectionDemoRoute.tsx",
  "/demo/clipboard": "routes/editing-demos/ClipboardDemoRoute.tsx",
  "/demo/history": "routes/editing-demos/HistoryDemoRoute.tsx",
  "/editing/rich-text": "routes/rich-text-demo/RichTextDemoRoute.tsx",
  "/widgets/listbox": "routes/widgets/ListboxWidgetRoute.tsx",
  "/widgets/grid": "routes/widgets/GridWidgetRoute.tsx",
  "/widgets/toolbar": "routes/widgets/ToolbarWidgetRoute.tsx",
  "/adapters/clipboard": "routes/adapters/clipboard/ClipboardAdapterDemoRoute.tsx",
  "/adapters/contenteditable": "routes/adapters/contenteditable/ContentEditableAdapterDemoRoute.tsx",
  "/adapters/keyboard": "routes/adapters/keyboard/KeyboardAdapterDemoRoute.tsx",
  "/connectors/react": "routes/connectors/react/ReactConnectorDemoRoute.tsx",
  "/connectors/react-hook-form": "routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute.tsx",
  "/connectors/tanstack-table": "routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute.tsx",
  "/connectors/ajv": "routes/connectors/ajv/AjvConnectorDemoRoute.tsx",
  "/connectors/zod": "routes/connectors/zod/ZodConnectorDemoRoute.tsx",
  "/connectors/zod/validate": "routes/connectors/zod/ZodValidateDemoRoute.tsx",
};

const chromeFiles = new Set([
  "routes/connectors/ConnectorDemoPage.tsx",
  "routes/widgets/WidgetDemoFrame.tsx",
]);

export async function loadDemoSources(pathname: string): Promise<ReadonlyArray<DemoSourceFile> | undefined> {
  const entry = demoSourceEntries[pathname];
  if (entry === undefined) return undefined;
  const paths = await sourceClosure(entry);
  return Promise.all(paths.map(async (path) => ({
    path,
    language: path.endsWith(".tsx") ? "tsx" : "typescript",
    source: await source(path),
  } as const)));
}

export function hasDemoSources(pathname: string): boolean {
  return demoSourceEntries[pathname] !== undefined;
}

async function sourceClosure(entry: string): Promise<ReadonlyArray<string>> {
  const paths: string[] = [];
  const visited = new Set<string>();
  async function visit(path: string): Promise<void> {
    if (visited.has(path) || isChrome(path)) return;
    visited.add(path);
    paths.push(path);
    for (const specifier of relativeSpecifiers(await source(path))) {
      const resolved = resolveSource(path, specifier);
      if (resolved !== undefined) await visit(resolved);
    }
  }
  await visit(entry);
  return paths;
}

function isChrome(path: string): boolean {
  return path.startsWith("app/")
    || path.startsWith("shared/ui/")
    || path.startsWith("shared/demo-workbench/")
    || chromeFiles.has(path);
}

async function source(path: string): Promise<string> {
  const load = sourceModules[`/src/${path}`];
  if (load === undefined) throw new Error(`Unknown demo source: ${path}`);
  return load();
}

function relativeSpecifiers(value: string): ReadonlyArray<string> {
  const specifiers: string[] = [];
  const pattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g;
  for (const match of value.matchAll(pattern)) specifiers.push(match[1]!);
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
