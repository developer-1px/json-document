import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DemoWorkbench } from "../../src/shared/demo-workbench/DemoWorkbench";
import { defineDemo } from "../../src/shared/demo-workbench/define-demo";
import { discoverDemoSources } from "../../src/shared/demo-workbench/demo-sources";

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
  test("keeps source metadata separate from the route component split point", () => {
    const route = defineDemo({ source: "routes/example/ExampleDemo.tsx" });
    expect(route.staticData.demo).toEqual({ source: "routes/example/ExampleDemo.tsx" });
    expect(route).not.toHaveProperty("component");
  });

  test("loads actual full demo files without following package or site chrome imports", async () => {
    const document = await discoverDemoSources("routes/document-demo/DocumentDemoRoute.tsx");
    expect(document.map((file) => file.path)).toEqual([
      "routes/document-demo/DocumentDemoRoute.tsx",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-document-text-control.ts",
      "packages/json-document-editing/src/document.ts",
    ]);
    const source = await document[0]!.load();
    expect(source).toContain("export function DocumentDemoRoute()");
    expect(source).toContain('from "@interactive-os/json-document-react"');
    expect(document.filter((file) => file.path.startsWith("packages/")).map((file) => file.path)).toEqual([
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-document-text-control.ts",
      "packages/json-document-editing/src/document.ts",
    ]);
    expect(document.some((file) => file.path.includes("shared/ui"))).toBe(false);
    expect(document.filter((file) => file.path.startsWith("packages/")).map((file) => file.referencePath)).toEqual([
      "/docs/api/ui-primitives-react",
      "/docs/api/ui-primitives-react",
      "/docs/api/react",
      "/docs/api/react",
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
      "packages/json-document-web/src/keyboard.ts",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/toolbar.tsx",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-editing/src/database.ts",
      "packages/json-document-editing/src/database-property-value.ts",
      "packages/json-document-editing/src/topology.ts",
      "packages/json-document-web/src/grid-cell.ts",
      "packages/json-document-ui-primitives-react/src/input-controls.tsx",
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
    ]);
  });

  test("registers the Object owner source next to Object demo usage", async () => {
    expect((await discoverDemoSources("routes/object-demo/ObjectDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/object-demo/ObjectDemoRoute.tsx",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-editing/src/object.ts",
    ]);
  });

  test("registers React and Web Grid owner sources next to Sheet usage", async () => {
    expect((await discoverDemoSources("routes/sheet-demo/SheetDemo.tsx")).map((file) => file.path)).toEqual([
      "routes/sheet-demo/SheetDemo.tsx",
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-grid-editing.ts",
      "packages/json-document-editing/src/topology.ts",
      "packages/json-document-web/src/grid-cell.ts",
      "packages/json-document-ui-primitives-react/src/input-controls.tsx",
      "packages/json-document-ui-primitives-react/src/surfaces.tsx",
      "packages/json-document-web/src/pointer-session.ts",
      "packages/json-document-affordance/src/interaction-handle.ts",
    ]);
  });

  test("registers the Composer lifecycle owner and its canonical domain closure next to Usage", async () => {
    const sources = (await discoverDemoSources("routes/composer-demo/ComposerDemoRoute.tsx")).map((file) => file.path);
    expect(sources).toEqual(expect.arrayContaining([
      "packages/json-document-composer/src/model.ts",
      "packages/json-document-composer/src/schema.ts",
      "packages/json-document-composer/src/commands.ts",
      "packages/json-document-composer/src/host-config.ts",
      "packages/json-document-composer/src/interaction.ts",
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
      "packages/json-document-ui-primitives-react/src/controls.tsx",
      "packages/json-document-ui-primitives-react/src/product-shell.tsx",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-react/src/editing-observation.ts",
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
      "packages/json-document-web/src/kanban-drop-target.ts",
      "packages/json-document-react/src/use-editing.ts",
      "packages/json-document-web/src/pointer-session.ts",
      "packages/json-document-affordance/src/board-drag-session.ts",
    ]);
  });

  test("registers the Canvas gesture owner source next to Canvas usages", async () => {
    expect((await discoverDemoSources("routes/canvas-demo/CanvasDemoRoute.tsx")).map((file) => file.path)).toContain(
      "packages/json-document-affordance/src/canvas-gesture-session.ts",
    );
    expect((await discoverDemoSources("routes/widgets/CanvasWidgetRoute.tsx")).map((file) => file.path)).toContain(
      "packages/json-document-affordance/src/canvas-gesture-session.ts",
    );
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
