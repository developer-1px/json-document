import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { DemoEmbedProvider } from "../shared/demo-workbench/DemoPage";
import { DemoProvider } from "../shared/demo-workbench/DemoSurface";
import { classes, ui } from "../shared/ui/styles";

type DemoModule = Record<string, ComponentType>;
type LiveDemoDefinition = { readonly Component: ReturnType<typeof lazy>; readonly source: string };

function demo(importer: () => Promise<unknown>, exportName: string, source: string): LiveDemoDefinition {
  const Component = lazy(async () => ({ default: ((await importer()) as DemoModule)[exportName]! }));
  return { Component, source };
}

const liveDemos: Readonly<Record<string, LiveDemoDefinition>> = {
  "/demo": demo(() => import("../routes/document-demo/DocumentDemoRoute"), "DocumentDemoRoute", "routes/document-demo/DocumentDemoRoute.tsx"),
  "/demo/topology": demo(() => import("../routes/editing-demos/TopologyDemoRoute"), "TopologyDemoRoute", "routes/editing-demos/TopologyDemoRoute.tsx"),
  "/demo/selection": demo(() => import("../routes/editing-demos/SelectionDemoRoute"), "SelectionDemoRoute", "routes/editing-demos/SelectionDemoRoute.tsx"),
  "/demo/clipboard": demo(() => import("../routes/editing-demos/ClipboardDemoRoute"), "ClipboardDemoRoute", "routes/editing-demos/ClipboardDemoRoute.tsx"),
  "/demo/history": demo(() => import("../routes/editing-demos/HistoryDemoRoute"), "HistoryDemoRoute", "routes/editing-demos/HistoryDemoRoute.tsx"),
  "/demo/order": demo(() => import("../routes/order-demo/OrderDemoRoute"), "OrderDemoRoute", "routes/order-demo/OrderDemoRoute.tsx"),
  "/demo/object": demo(() => import("../routes/object-demo/ObjectDemoRoute"), "ObjectDemoRoute", "routes/object-demo/ObjectDemoRoute.tsx"),
  "/demo/canvas": demo(() => import("../routes/canvas-demo/CanvasDemoRoute"), "CanvasDemoRoute", "routes/canvas-demo/CanvasDemoRoute.tsx"),
  "/demo/sheet": demo(() => import("../routes/sheet-demo/SheetDemoRoute"), "SheetDemoRoute", "routes/sheet-demo/SheetDemoRoute.tsx"),
  "/demo/tree": demo(() => import("../routes/tree-demo/TreeDemoRoute"), "TreeDemoRoute", "routes/tree-demo/TreeDemoRoute.tsx"),
  "/demo/kanban": demo(() => import("../routes/kanban-demo/KanbanDemoRoute"), "KanbanDemoRoute", "routes/kanban-demo/KanbanDemoRoute.tsx"),
  "/demo/database": demo(() => import("../routes/database-demo/DatabaseDemoRoute"), "DatabaseDemoRoute", "routes/database-demo/DatabaseDemoRoute.tsx"),
  "/demo/composer": demo(() => import("../routes/composer-demo/ComposerDemoRoute"), "ComposerDemoRoute", "routes/composer-demo/ComposerDemoRoute.tsx"),
  "/demo/annotation": demo(() => import("../routes/annotation-demo/AnnotationDemoRoute"), "AnnotationDemoRoute", "routes/annotation-demo/AnnotationDemoRoute.tsx"),
  "/editing/rich-text": demo(() => import("../routes/rich-text-demo/RichTextDemoRoute"), "RichTextDemoRoute", "routes/rich-text-demo/RichTextDemoRoute.tsx"),
  "/collaboration": demo(() => import("../routes/collaboration-demo/CollaborationDemoRoute"), "CollaborationDemoRoute", "routes/collaboration-demo/CollaborationDemoRoute.tsx"),
  "/adapters/keyboard": demo(() => import("../routes/adapters/keyboard/KeyboardAdapterDemoRoute"), "KeyboardAdapterDemoRoute", "routes/adapters/keyboard/KeyboardAdapterDemoRoute.tsx"),
  "/adapters/clipboard": demo(() => import("../routes/adapters/clipboard/ClipboardAdapterDemoRoute"), "ClipboardAdapterDemoRoute", "routes/adapters/clipboard/ClipboardAdapterDemoRoute.tsx"),
  "/adapters/contenteditable": demo(() => import("../routes/adapters/contenteditable/ContentEditableAdapterDemoRoute"), "ContentEditableAdapterDemoRoute", "routes/adapters/contenteditable/ContentEditableAdapterDemoRoute.tsx"),
  "/connectors/react": demo(() => import("../routes/connectors/react/ReactConnectorDemoRoute"), "ReactConnectorDemoRoute", "routes/connectors/react/ReactConnectorDemoRoute.tsx"),
  "/connectors/react-hook-form": demo(() => import("../routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute"), "ReactHookFormConnectorDemoRoute", "routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute.tsx"),
  "/connectors/ajv": demo(() => import("../routes/connectors/ajv/AjvConnectorDemoRoute"), "AjvConnectorDemoRoute", "routes/connectors/ajv/AjvConnectorDemoRoute.tsx"),
  "/connectors/zod": demo(() => import("../routes/connectors/zod/ZodConnectorDemoRoute"), "ZodConnectorDemoRoute", "routes/connectors/zod/ZodConnectorDemoRoute.tsx"),
  "/connectors/zod/validate": demo(() => import("../routes/connectors/zod/ZodValidateDemoRoute"), "ZodValidateDemoRoute", "routes/connectors/zod/ZodValidateDemoRoute.tsx"),
  "/connectors/tanstack-table": demo(() => import("../routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute"), "TanStackTableConnectorDemoRoute", "routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute.tsx"),
  "/widgets/toolbar": demo(() => import("../routes/widgets/ToolbarWidgetRoute"), "ToolbarWidgetRoute", "routes/widgets/ToolbarWidgetRoute.tsx"),
  "/widgets/listbox": demo(() => import("../routes/widgets/ListboxWidgetRoute"), "ListboxWidgetRoute", "routes/widgets/ListboxWidgetRoute.tsx"),
  "/widgets/grid": demo(() => import("../routes/widgets/GridWidgetRoute"), "GridWidgetRoute", "routes/widgets/GridWidgetRoute.tsx"),
  "/widgets/document": demo(() => import("../routes/widgets/DocumentWidgetRoute"), "DocumentWidgetRoute", "routes/widgets/DocumentWidgetRoute.tsx"),
  "/widgets/canvas": demo(() => import("../routes/widgets/CanvasWidgetRoute"), "CanvasWidgetRoute", "routes/widgets/CanvasWidgetRoute.tsx"),
  "/widgets/tree": demo(() => import("../routes/widgets/TreeWidgetRoute"), "TreeWidgetRoute", "routes/widgets/TreeWidgetRoute.tsx"),
  "/widgets/board": demo(() => import("../routes/widgets/BoardWidgetRoute"), "BoardWidgetRoute", "routes/widgets/BoardWidgetRoute.tsx"),
};

export function LiveDemo({ path }: { readonly path: string }) {
  const definition = liveDemos[path];
  if (!definition) return <p className={ui.state.error}>Unknown live demo: {path}</p>;
  const Demo = definition.Component;
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "320px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={rootRef} aria-label={`Live demo: ${path}`} className={classes("my-4 min-h-16 min-w-0", ui.product.frame)} data-live-demo={path}>
      {visible ? (
        <Suspense fallback={<p className={classes("m-0 p-4", ui.text.meta)}>Live demo 불러오는 중…</p>}>
          <DemoProvider demo={{ source: definition.source }}>
            <DemoEmbedProvider><Demo /></DemoEmbedProvider>
          </DemoProvider>
        </Suspense>
      ) : <p className={classes("m-0 p-4", ui.text.meta)}>Live demo</p>}
    </section>
  );
}

export const liveDemoPaths = Object.keys(liveDemos);
