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
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
    ]);
    const source = await document[0]!.load();
    expect(source).toContain("export function DocumentDemoRoute()");
    expect(source).toContain('from "@interactive-os/json-document-react"');
    expect(document.filter((file) => file.path.startsWith("packages/")).map((file) => file.path)).toEqual([
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
    ]);
    expect(document.some((file) => file.path.includes("shared/ui"))).toBe(false);
  });

  test("discovers demo-owned helpers and shared behavioral glue from one entry", async () => {
    expect((await discoverDemoSources("routes/database-demo/DatabaseDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/database-demo/DatabaseDemoRoute.tsx",
      "routes/database-demo/DatabaseTableDemo.tsx",
      "routes/database-demo/initial-database.ts",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-react/src/use-grid-editing.ts",
      "packages/json-document-editing/src/topology.ts",
      "packages/json-document-web/src/grid-cell.ts",
    ]);
    expect((await discoverDemoSources("routes/widgets/ListboxWidgetRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/widgets/ListboxWidgetRoute.tsx",
    ]);
  });

  test("registers the Object owner source next to Object demo usage", async () => {
    expect((await discoverDemoSources("routes/object-demo/ObjectDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/object-demo/ObjectDemoRoute.tsx",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-editing/src/object.ts",
    ]);
  });

  test("registers React and Web Grid owner sources next to Sheet usage", async () => {
    expect((await discoverDemoSources("routes/sheet-demo/SheetDemo.tsx")).map((file) => file.path)).toEqual([
      "routes/sheet-demo/SheetDemo.tsx",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-grid-editing.ts",
      "packages/json-document-editing/src/topology.ts",
      "packages/json-document-web/src/grid-cell.ts",
    ]);
  });

  test("registers Tree visibility and React binding sources next to Tree usage", async () => {
    expect((await discoverDemoSources("routes/tree-demo/TreeDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/tree-demo/TreeDemoRoute.tsx",
      "packages/json-document-react/src/editing-observation.ts",
      "packages/json-document-web/src/clipboard.ts",
      "packages/json-document-react/src/use-tree-editing.ts",
      "packages/json-document-editing/src/tree-visibility.ts",
    ]);
  });

});
