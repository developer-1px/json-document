import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DemoWorkbench } from "../../src/shared/demo-workbench/DemoWorkbench";
import { defineDemo } from "../../src/shared/demo-workbench/define-demo";
import { discoverDemoSources } from "../../src/shared/demo-workbench/demo-sources";
import { useClipboardLab } from "../../src/routes/editing-demos/useClipboardLab";

afterEach(cleanup);

describe("DemoWorkbench", () => {
  const source = "routes/document-demo/DocumentDemoRoute.tsx";

  test("keeps Demo first and switches between the live demo and full source files", async () => {
    render(<DemoWorkbench source={source}><button>Run demo</button></DemoWorkbench>);

    const tablist = screen.getByRole("tablist", { name: "Demo and source files" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Demo", "DocumentDemoRoute.tsx"]);
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "Run demo" })).toBeTruthy();

    fireEvent.click(tabs[1]!);

    expect(screen.queryByRole("button", { name: "Run demo" })).toBeNull();
    expect(screen.getByText(source)).toBeTruthy();
    expect(await screen.findByText("export", { selector: '[data-code-token="keyword"]' })).toBeTruthy();
    expect(screen.getByRole("tabpanel").textContent).toContain("export function DocumentDemoRoute()");
  });

  test("moves across tabs with editor-style arrow navigation", () => {
    render(<DemoWorkbench source={source}><div>Demo</div></DemoWorkbench>);
    const tabs = screen.getAllByRole("tab");

    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);

    fireEvent.keyDown(tabs[1]!, { key: "ArrowLeft" });
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[0]);
  });

  test("expands the live demo for focused inspection and restores it with Escape", () => {
    render(<DemoWorkbench source={source}><div>Demo</div></DemoWorkbench>);
    const workbench = screen.getByRole("region", { name: "Demo workbench" });

    fireEvent.click(screen.getByRole("button", { name: "Expand demo" }));
    expect(workbench.getAttribute("data-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Restore demo size" })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(workbench.hasAttribute("data-expanded")).toBe(false);
  });
});

describe("Demo definition and source discovery", () => {
  test("Canvas Usage imports the reusable Plane Select profile and exposes its canonical closure", async () => {
    const sources = await discoverDemoSources("routes/canvas-demo/CanvasDemoRoute.tsx");
    expect(await sources[0]!.load()).toContain("createPlaneSelectProfile()");
    for (const [path, reference] of [
      ["packages/json-document-affordance/src/plane-select.ts", "/docs/api/affordance"],
      ["packages/json-document-affordance/src/drag.ts", "/docs/api/affordance"],
      ["packages/json-document-affordance/src/select.ts", "/docs/api/affordance"],
      ["packages/json-document-affordance/src/gesture-session.ts", "/docs/api/affordance"],
      ["packages/json-document-selection/src/key/index.ts", "/docs/api/selection"],
      ["packages/json-document-editing/src/object.ts", "/docs/api/editing"],
      ["packages/json-document-web/src/clipboard.ts", "/docs/api/web"],
      ["packages/json-document-canvas/src/use-canvas-hand.ts", "/docs/api/canvas"],
      ["packages/json-document-canvas/src/canvas-clipboard.ts", "/docs/api/canvas"],
      ["packages/json-document-editing/src/canvas-clipboard.ts", "/docs/api/editing"],
      ["packages/json-document-editing/src/object-paste-session.ts", "/docs/api/editing"],
      ["packages/json-document-editing/src/preparation-queue.ts", "/docs/api/editing"],
      ["packages/json-document-web/src/raster-source.ts", "/docs/api/web"],
      ["packages/json-document-web/src/raster-files.ts", "/docs/api/web"],
      ["packages/json-document-web/src/html-clipboard.ts", "/docs/api/web"],
      ["packages/json-document-web/src/html-fragment.ts", "/docs/api/web"],
      ["packages/json-document-file-intake/src/raster-content.ts", "/docs/api/file-intake"],
      ["packages/json-document-file-intake/src/index.ts", "/docs/api/file-intake"],
    ]) {
      const file = sources.find((source) => source.path === path);
      expect(file, path).toBeDefined(); expect(file!.referencePath).toBe(reference);
      expect(await file!.load()).not.toBe("");
    }
  });
  test("Calendar Usage exposes the shared edit plan and each canonical owner's API", async () => {
    const sources = await discoverDemoSources("routes/calendar-demo/CalendarDemoRoute.tsx");
    const plan = sources.find((file) => file.path === "packages/json-document-calendar-document/src/calendar-operation.ts");
    expect(plan?.referencePath).toBe("/docs/api/calendar-document");
    expect(await plan!.load()).toContain("export function planCalendarEventEdit");
    const validation = sources.find((file) => file.path === "packages/json-document-calendar-document/src/calendar-validation.ts");
    expect(validation?.referencePath).toBe("/docs/api/calendar-document");
    expect(await validation!.load()).toContain("export function validateCalendarDocument");
    const hand = sources.find((file) => file.path === "packages/json-document-calendar/src/use-calendar-hand.ts");
    expect(hand?.referencePath).toBe("/docs/api/calendar");
    expect(await hand!.load()).toContain("export function useCalendarHand");
  });

  test("exercises and exposes the canonical ID allocator in Clipboard Usage", async () => {
    const hook = renderHook(useClipboardLab);
    act(() => { hook.result.current.copy(); });
    act(() => { hook.result.current.paste(); });
    act(() => { hook.result.current.paste(); });
    const value = hook.result.current.snapshot.value as { blocks: Array<{ id: string }> };
    expect(value.blocks).toHaveLength(5);
    expect(new Set(value.blocks.map((block) => block.id)).size).toBe(5);
    expect(value.blocks.filter((block) => block.id.startsWith("clipboard-block-"))).toHaveLength(2);
    const sources = await discoverDemoSources("routes/editing-demos/ClipboardDemoRoute.tsx");
    const owner = sources.find((file) => file.path === "packages/json-document-editing/src/identity.ts");
    expect(owner?.referencePath).toMatch(/^\/docs\/api\//);
    expect(await owner!.load()).toContain("export function createEditingIdAllocator");
  });

  test("Annotation Usage exposes the Hand, output, geometry, selection projection and Key owner", async () => {
    const sources = await discoverDemoSources("routes/annotation-demo/AnnotationDemoRoute.tsx");
    for (const path of [
      "packages/json-document-annotation/src/annotation-hand.tsx",
      "packages/json-document-annotation/src/annotation-output.ts",
      "packages/json-document-editing/src/annotation.ts",
      "packages/json-document-editing/src/annotation-selection.ts",
      "packages/json-document-selection/src/key/index.ts",
    ]) {
      const file = sources.find((source) => source.path === path);
      expect(file, path).toBeDefined();
      expect(await file!.load()).not.toBe("");
      expect(file!.referencePath).toMatch(/^\/docs\/api\//);
    }
  });

  test("exposes the canonical editing-host predicate in clipboard Usage", async () => {
    const sources = await discoverDemoSources("routes/adapters/clipboard/ClipboardAdapterDemoRoute.tsx");
    const input = sources.find((file) => file.path === "packages/json-document-web/src/input.ts");
    expect(input).toBeDefined();
    expect(await input!.load()).toContain("export function isWebEditingHostTarget");
  });
  test("registers Editing observation and move rendering owners through public Rich Text usage", async () => {
    const sources = await discoverDemoSources("routes/rich-text-demo/RichTextDemoRoute.tsx");
    const session = sources.find((file) => file.path === "packages/json-document-editing/src/session.ts");
    expect(session).toBeDefined();
    expect(await session!.load()).toContain("reconcileSelection");
    const invalidation = sources.find((file) => file.path === "packages/json-document-editing/src/history-invalidation.ts");
    expect(invalidation).toBeDefined();
    expect(await invalidation!.load()).toContain("observeHistoryInvalidation");
    const renderStore = sources.find((file) => file.path === "packages/json-document-rich-text-react/src/render-store.ts");
    expect(renderStore).toBeDefined();
    expect(await renderStore!.load()).toContain("appliedOperationsFor");
    const appliedChange = sources.find((file) => file.path === "packages/json-document-rich-text/src/applied-change.ts");
    expect(appliedChange).toBeDefined();
    expect(await appliedChange!.load()).toContain("readonly from?: string");
  });

  test("keeps source metadata separate from the route component split point", () => {
    const route = defineDemo({ source: "routes/example/ExampleDemo.tsx" });
    expect(route.staticData.demo).toEqual({ source: "routes/example/ExampleDemo.tsx" });
    expect(route).not.toHaveProperty("component");
  });

  test("loads actual full demo files without following package or site chrome imports", async () => {
    const document = await discoverDemoSources("routes/document-demo/DocumentDemoRoute.tsx");
    expect(document.map((file) => file.path)).toEqual([
      "routes/document-demo/DocumentDemoRoute.tsx",
      "packages/json-document-web/src/clipboard-event.ts",
      "packages/json-document-web/src/input.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-affordance/src/select.ts",
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-document-text-control.ts",
      "packages/json-document-editing/src/document.ts",
    ]);
    const source = await document[0]!.load();
    expect(source).toContain("export function DocumentDemoRoute()");
    expect(source).toContain('from "@interactive-os/json-document-react"');
    expect(document.filter((file) => file.path.startsWith("packages/")).map((file) => file.path)).toEqual([
      "packages/json-document-web/src/clipboard-event.ts",
      "packages/json-document-web/src/input.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-affordance/src/select.ts",
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-document-text-control.ts",
      "packages/json-document-editing/src/document.ts",
    ]);
    expect(document.some((file) => file.path.includes("shared/ui"))).toBe(false);
    expect(document.filter((file) => file.path.startsWith("packages/")).map((file) => file.referencePath)).toEqual([
      "/docs/api/web",
      "/docs/api/web",
      "/docs/api/ui-primitives-react",
      "/docs/api/ui-primitives-react",
      "/docs/api/react",
      "/docs/api/react",
      "/docs/api/affordance",
      "/docs/api/web",
      "/docs/api/web",
      "/docs/api/react",
      "/docs/api/editing",
    ]);
  });

  test("discovers demo-owned helpers and shared behavioral glue from one entry", async () => {
    expect((await discoverDemoSources("routes/database-demo/DatabaseDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/database-demo/DatabaseDemoRoute.tsx",
      "routes/database-demo/DatabaseTableDemo.tsx",
      "routes/database-demo/initial-database.ts",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-database/src/database-hand.tsx",
      "packages/json-document-database/src/database-property-control.tsx",
      "packages/json-document-editing/src/database-property-value.ts",
      "packages/json-document-ui-primitives-react/src/input-controls.tsx",
      "packages/json-document-database/src/database-view-controls.tsx",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-web/src/clipboard-event.ts",
      "packages/json-document-web/src/input.ts",
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-ui-primitives-react/src/toolbar.tsx",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-editing/src/database.ts",
      "packages/json-document/src/foundation/json/serializable.ts",
      "packages/json-document-editing/src/topology.ts",
      "packages/json-document-web/src/grid-cell.ts",
      "packages/json-document-ui-primitives-react/src/surfaces.tsx",
      "packages/json-document-web/src/pointer-session.ts",
      "packages/json-document-affordance/src/interaction-handle.ts",
    ]);
    expect((await discoverDemoSources("routes/widgets/ListboxWidgetRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/widgets/ListboxWidgetRoute.tsx",
      "packages/json-document-ui-primitives-react/src/listbox.ts",
      "packages/json-document-affordance/src/session.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-editing/src/order.ts",
    ]);
  });

  test("registers the Object owner source next to Object demo usage", async () => {
    expect((await discoverDemoSources("routes/object-demo/ObjectDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/object-demo/ObjectDemoRoute.tsx",
      "packages/json-document-web/src/clipboard-event.ts",
      "packages/json-document-web/src/input.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-editing/src/object.ts",
      "packages/json-document-object-document/src/object-model.ts",
      "packages/json-document-object-document/src/object-style.ts",
      "packages/json-document-object-document/src/object-validation.ts",
      "packages/json-document-file-intake/src/raster-content.ts",
      "packages/json-document/src/application/document/create.ts",
      "packages/json-document-object-document/src/object-projection.ts",
      "packages/json-document-object-document/src/object-operation.ts",
      "packages/json-document-selection/src/key/index.ts",
    ]);
  });

  test("registers the Sheet editor, React and Web Grid owners next to Sheet usage", async () => {
    const sources = await discoverDemoSources("routes/sheet-demo/SheetDemo.tsx");
    expect(sources.map((file) => file.path)).toEqual([
      "routes/sheet-demo/SheetDemo.tsx",
      "packages/json-document-web/src/clipboard-event.ts",
      "packages/json-document-web/src/input.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-affordance/src/select.ts",
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-editing/src/sheet.ts",
      "packages/json-document/src/foundation/json/serializable.ts",
      "packages/json-document-react/src/use-grid-editing.ts",
      "packages/json-document-editing/src/topology.ts",
      "packages/json-document-web/src/grid-cell.ts",
      "packages/json-document-ui-primitives-react/src/input-controls.tsx",
      "packages/json-document-ui-primitives-react/src/surfaces.tsx",
      "packages/json-document-web/src/pointer-session.ts",
      "packages/json-document-affordance/src/interaction-handle.ts",
    ]);
    const owner = sources.find((file) => file.path === "packages/json-document-editing/src/sheet.ts")!;
    expect(owner.referencePath).toBe("/docs/api/editing");
    expect(await owner.load()).toContain("export function createSheetEditor");
  });

  test("registers the Composer lifecycle owner and its canonical domain closure next to Usage", async () => {
    const sources = (await discoverDemoSources("routes/composer-demo/ComposerDemoRoute.tsx")).map((file) => file.path);
    expect(sources).toEqual(expect.arrayContaining([
      "packages/json-document-composer/src/model.ts",
      "packages/json-document-composer/src/schema.ts",
      "packages/json-document-composer/src/commands.ts",
      "packages/json-document-composer/src/host-config.ts",
      "packages/json-document-composer/src/interaction.ts",
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-rich-text-suggestion/src/index.ts",
      "packages/json-document-rich-text-suggestion-react/src/index.ts",
      "packages/json-document-composer-react/src/use-composer.tsx",
      "packages/json-document-composer-react/src/command-menu.ts",
      "packages/json-document-composer-react/src/reference-atom.tsx",
      "packages/json-document-file-intake/src/index.ts",
      "packages/json-document-rich-text-mention/src/index.ts",
      "packages/json-document-web/src/file-intake.ts",
      "packages/json-document-rich-text-react/src/index.tsx",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/choice.tsx",
      "packages/json-document-ui-primitives-react/src/menu.tsx",
      "packages/json-document-ui-primitives-react/src/surfaces.tsx",
      "packages/json-document-affordance/src/session.ts",
      "packages/json-document-web/src/pointer-session.ts",
    ]));
  });

  test("registers Tree visibility and React binding sources next to Tree usage", async () => {
    expect((await discoverDemoSources("routes/tree-demo/TreeDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/tree-demo/TreeDemoRoute.tsx",
      "packages/json-document-web/src/clipboard-event.ts",
      "packages/json-document-web/src/input.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-affordance/src/select.ts",
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-editing/src/tree.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-tree-editing.ts",
      "packages/json-document-editing/src/tree-visibility.ts",
    ]);
  });

  test("registers Board and platform drag session sources next to Kanban usage", async () => {
    expect((await discoverDemoSources("routes/kanban-demo/KanbanDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/kanban-demo/KanbanDemoRoute.tsx",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-editing/src/kanban.ts",
      "packages/json-document-selection/src/key/index.ts",
      "packages/json-document-web/src/kanban-drop-target.ts",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-web/src/drag-drop-session.ts",
      "packages/json-document-affordance/src/board-drag-session.ts",
    ]);
    expect((await discoverDemoSources("routes/widgets/BoardWidgetRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/widgets/BoardWidgetRoute.tsx",
      "packages/json-document-ui-primitives-react/src/content-interaction.ts",
      "packages/json-document-affordance/src/content-interaction.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-editing/src/kanban.ts",
      "packages/json-document-selection/src/key/index.ts",
      "packages/json-document-web/src/kanban-drop-target.ts",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-web/src/pointer-session.ts",
      "packages/json-document-affordance/src/board-drag-session.ts",
      "packages/json-document-affordance/src/drag.ts",
    ]);
  });

  test("registers the canonical Canvas Hand, Object document, Editing and gesture closure for both Hosts", async () => {
    for (const entry of ["routes/canvas-demo/CanvasDemoRoute.tsx", "routes/widgets/CanvasWidgetRoute.tsx"]) {
      const paths = (await discoverDemoSources(entry)).map((file) => file.path);
      expect(paths).toEqual(expect.arrayContaining([
        "packages/json-document-canvas/src/canvas-hand.tsx",
        "packages/json-document-canvas/src/canvas-style-controls.tsx",
        "packages/json-document-canvas/src/use-canvas-hand.ts",
        "packages/json-document-canvas/src/canvas-object-view.tsx",
        "packages/json-document-object-document/src/object-model.ts",
        "packages/json-document-object-document/src/object-style.ts",
        "packages/json-document-object-document/src/object-validation.ts",
        "packages/json-document-object-document/src/object-operation.ts",
        "packages/json-document-object-document/src/object-projection.ts",
        "packages/json-document-editing/src/object.ts",
        "packages/json-document-affordance/src/gesture-session.ts",
        "packages/json-document-affordance/src/drag.ts",
        "packages/json-document-react/src/editing-snapshot.ts",
      ]));
      const hand = (await discoverDemoSources(entry)).find((file) => file.path === "packages/json-document-canvas/src/use-canvas-hand.ts")!;
      expect(await hand.load()).toContain("resizeAffordance(gesture.start, gesture.point, gesture.edge, gesture, gesture.object)");
      const style = (await discoverDemoSources(entry)).find((file) => file.path === "packages/json-document-object-document/src/object-style.ts")!;
      expect(style.referencePath).toBe("/docs/api/object-document");
      expect(await style.load()).toContain("export function readObjectStyle");
    }
  });

  test("keeps each Editing concept lab API next to its owning route", async () => {
    const labs = [
      ["TopologyDemoRoute.tsx", "useTopologyLab.ts"],
      ["SelectionDemoRoute.tsx", "useSelectionLab.ts"],
      ["ClipboardDemoRoute.tsx", "useClipboardLab.ts"],
      ["HistoryDemoRoute.tsx", "useHistoryLab.ts"],
    ] as const;
    for (const [route, lab] of labs) {
      expect((await discoverDemoSources(`routes/editing-demos/${route}`)).map((file) => file.path))
        .toContain(`routes/editing-demos/${lab}`);
    }
  });

  test("keeps Rich Text Demo command and query APIs next to the owning route", async () => {
    const paths = (await discoverDemoSources("routes/rich-text-demo/RichTextDemoRoute.tsx"))
      .map((file) => file.path);
    expect(paths).toContain("routes/rich-text-demo/useRichTextDemoCommands.ts");
    expect(paths).toContain("routes/rich-text-demo/richTextDemoQuery.ts");
  });

});

test("Markdown Usage exposes the canonical text projection and restoration sources", async () => {
  const sources = await discoverDemoSources("routes/markdown-caret/MarkdownCaretRoute.tsx");
  expect(sources.map(file => file.path)).toEqual(expect.arrayContaining([
    "packages/json-document-markdown/src/markers.ts",
    "packages/json-document-contenteditable/src/dom/text-projection.ts",
    "packages/json-document-contenteditable/src/dom/text-projection.css",
    "packages/json-document-contenteditable/src/dom/plain-text.ts",
    "packages/json-document-contenteditable/src/dom/text-index.ts",
  ]));
  const markdown = await sources.find(file => file.path === "packages/json-document-markdown-web/src/markdown-dom.ts")!.load();
  expect(markdown).toContain("createTextProjectionDOMAdapter");
  expect(markdown).not.toContain("setBaseAndExtent");
});
