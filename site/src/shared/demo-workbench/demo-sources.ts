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
    "!/src/shared/demo-workbench/**",
  ],
  { import: "default", query: "?raw" },
);

const demoSourcePaths: Readonly<Record<string, ReadonlyArray<string>>> = {
  "/demo": ["routes/document-demo/DocumentDemoRoute.tsx"],
  "/demo/order": ["routes/order-demo/OrderDemoRoute.tsx"],
  "/demo/object": ["routes/object-demo/ObjectDemoRoute.tsx"],
  "/demo/canvas": ["routes/canvas-demo/CanvasDemoRoute.tsx"],
  "/demo/sheet": ["routes/sheet-demo/SheetDemoRoute.tsx", "routes/sheet-demo/SheetDemo.tsx"],
  "/demo/database": [
    "routes/database-demo/DatabaseDemoRoute.tsx",
    "routes/database-demo/DatabaseTableDemo.tsx",
    "routes/database-demo/initial-database.ts",
  ],
  "/demo/tree": ["routes/tree-demo/TreeDemoRoute.tsx"],
  "/demo/kanban": ["routes/kanban-demo/KanbanDemoRoute.tsx"],
  "/demo/topology": ["routes/editing-demos/TopologyDemoRoute.tsx"],
  "/demo/selection": ["routes/editing-demos/SelectionDemoRoute.tsx"],
  "/demo/clipboard": ["routes/editing-demos/ClipboardDemoRoute.tsx"],
  "/demo/history": ["routes/editing-demos/HistoryDemoRoute.tsx"],
  "/editing/rich-text": [
    "routes/rich-text-demo/RichTextDemoRoute.tsx",
    "routes/rich-text-demo/rich-text-styles.ts",
  ],
  "/widgets/listbox": widgetSources("ListboxWidgetRoute.tsx"),
  "/widgets/grid": widgetSources("GridWidgetRoute.tsx"),
  "/widgets/toolbar": widgetSources("ToolbarWidgetRoute.tsx"),
  "/adapters/clipboard": adapterSources("clipboard", "Clipboard"),
  "/adapters/contenteditable": adapterSources("contenteditable", "ContentEditable"),
  "/adapters/keyboard": adapterSources("keyboard", "Keyboard"),
  "/connectors/react": connectorSources("react", "ReactConnector"),
  "/connectors/react-hook-form": connectorSources("react-hook-form", "ReactHookFormConnector"),
  "/connectors/tanstack-table": connectorSources("tanstack-table", "TanStackTableConnector"),
  "/connectors/ajv": connectorSources("ajv", "AjvConnector"),
  "/connectors/zod": [
    "routes/connectors/zod/ZodConnectorDemoRoute.tsx",
    "routes/connectors/zod/ZodAdminLab.tsx",
  ],
  "/connectors/zod/validate": [
    "routes/connectors/zod/ZodValidateDemoRoute.tsx",
    "routes/connectors/zod/ZodConnectorLab.tsx",
  ],
};

export function demoSources(pathname: string): ReadonlyArray<DemoSourceFile> | undefined {
  return demoSourcePaths[pathname]?.map((path) => ({
    path,
    language: path.endsWith(".tsx") ? "tsx" : "typescript",
    load: sourceLoader(path),
  }));
}

function widgetSources(route: string): ReadonlyArray<string> {
  return [
    `routes/widgets/${route}`,
    "routes/widgets/binding/index.ts",
    "routes/widgets/binding/order.ts",
    "routes/widgets/binding/sheet.ts",
    "routes/widgets/binding/keyboard.ts",
    "routes/widgets/binding/history.ts",
    "routes/widgets/binding/option.ts",
  ];
}

function adapterSources(folder: string, name: string): ReadonlyArray<string> {
  return [
    `routes/adapters/${folder}/${name}AdapterDemoRoute.tsx`,
    `routes/adapters/${folder}/${name}AdapterLab.tsx`,
  ];
}

function connectorSources(folder: string, name: string): ReadonlyArray<string> {
  return [
    `routes/connectors/${folder}/${name}DemoRoute.tsx`,
    `routes/connectors/${folder}/${name}Lab.tsx`,
  ];
}

function sourceLoader(path: string): () => Promise<string> {
  const load = sourceModules[`/src/${path}`];
  if (load === undefined) throw new Error(`Unknown demo source: ${path}`);
  return load;
}
