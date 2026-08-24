import type { CodeLanguage } from "../ui/code-tokens";
import editingObservationSource from "../../../../packages/json-document-react/src/editing-observation.ts?raw";
import clipboardSource from "../../../../packages/json-document-web/src/clipboard.ts?raw";
import objectEditingSource from "../../../../packages/json-document-editing/src/object.ts?raw";
import editingTopologySource from "../../../../packages/json-document-editing/src/topology.ts?raw";
import webGridCellSource from "../../../../packages/json-document-web/src/grid-cell.ts?raw";
import gridEditingSource from "../../../../packages/json-document-react/src/use-grid-editing.ts?raw";
import treeVisibilitySource from "../../../../packages/json-document-editing/src/tree-visibility.ts?raw";
import treeEditingSource from "../../../../packages/json-document-react/src/use-tree-editing.ts?raw";
import pointerSessionSource from "../../../../packages/json-document-web/src/pointer-session.ts?raw";
import dragDropSessionSource from "../../../../packages/json-document-web/src/drag-drop-session.ts?raw";
import boardDragSessionSource from "../../../../packages/json-document-affordance/src/board-drag-session.ts?raw";
import canvasGestureSessionSource from "../../../../packages/json-document-affordance/src/canvas-gesture-session.ts?raw";
import databaseEditingSource from "../../../../packages/json-document-editing/src/database.ts?raw";

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
const registeredUsageSources = new Map<string, string>([
  ["packages/json-document-react/src/editing-observation.ts", editingObservationSource],
  ["packages/json-document-web/src/clipboard.ts", clipboardSource],
  ["packages/json-document-editing/src/object.ts", objectEditingSource],
  ["packages/json-document-editing/src/topology.ts", editingTopologySource],
  ["packages/json-document-web/src/grid-cell.ts", webGridCellSource],
  ["packages/json-document-react/src/use-grid-editing.ts", gridEditingSource],
  ["packages/json-document-editing/src/tree-visibility.ts", treeVisibilitySource],
  ["packages/json-document-react/src/use-tree-editing.ts", treeEditingSource],
  ["packages/json-document-web/src/pointer-session.ts", pointerSessionSource],
  ["packages/json-document-web/src/drag-drop-session.ts", dragDropSessionSource],
  ["packages/json-document-affordance/src/board-drag-session.ts", boardDragSessionSource],
  ["packages/json-document-affordance/src/canvas-gesture-session.ts", canvasGestureSessionSource],
  ["packages/json-document-editing/src/database.ts", databaseEditingSource],
]);
const registeredPublicUsages = [
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebPointerSession",
    sourcePath: "packages/json-document-web/src/pointer-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebDragDropSession",
    sourcePath: "packages/json-document-web/src/drag-drop-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createBoardDragSession",
    sourcePath: "packages/json-document-affordance/src/board-drag-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createCanvasGestureSession",
    sourcePath: "packages/json-document-affordance/src/canvas-gesture-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "useEditingObservation",
    sourcePath: "packages/json-document-react/src/editing-observation.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebClipboardSurface",
    sourcePath: "packages/json-document-web/src/clipboard.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "useGridEditing",
    sourcePath: "packages/json-document-react/src/use-grid-editing.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "useTreeEditing",
    sourcePath: "packages/json-document-react/src/use-tree-editing.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "projectTreeVisibility",
    sourcePath: "packages/json-document-editing/src/tree-visibility.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "createObjectEditor",
    sourcePath: "packages/json-document-editing/src/object.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "nextDatabasePropertySort",
    sourcePath: "packages/json-document-editing/src/database.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "gridPointKey",
    sourcePath: "packages/json-document-editing/src/topology.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "webGridCellAddressProps",
    sourcePath: "packages/json-document-web/src/grid-cell.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "findWebGridCell",
    sourcePath: "packages/json-document-web/src/grid-cell.ts",
  },
] as const;

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
    for (const usage of registeredPublicUsages) {
      if (source.includes(usage.packageName) && source.includes(usage.symbol)) {
        await visit(usage.sourcePath);
      }
    }
  }

  await visit(entry);
  return paths.map(sourceFile);
}

function sourceFile(path: string): DemoSourceFile {
  if (sourceModules[`/src/${path}`] === undefined && !registeredUsageSources.has(path)) {
    throw new Error(`Unknown demo source: ${path}`);
  }
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
  const registered = registeredUsageSources.get(path);
  if (registered !== undefined) return async () => registered;
  const load = sourceModules[`/src/${path}`];
  if (load === undefined) throw new Error(`Unknown demo source: ${path}`);
  return load;
}
