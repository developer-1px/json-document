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
  test("keeps the component and only explicit source entry in one definition", () => {
    function ExampleDemo() { return null; }
    const route = defineDemo({ component: ExampleDemo, source: "routes/example/ExampleDemo.tsx" });
    expect(route.component).toBe(ExampleDemo);
    expect(route.staticData.demo).toEqual({ source: "routes/example/ExampleDemo.tsx" });
  });

  test("loads actual full demo files without following package or site chrome imports", async () => {
    const document = await discoverDemoSources("routes/document-demo/DocumentDemoRoute.tsx");
    expect(document.map((file) => file.path)).toEqual(["routes/document-demo/DocumentDemoRoute.tsx"]);
    const source = await document[0]!.load();
    expect(source).toContain("export function DocumentDemoRoute()");
    expect(source).toContain('from "@interactive-os/json-document-react"');
    expect(document.some((file) => file.path.includes("packages/"))).toBe(false);
    expect(document.some((file) => file.path.includes("shared/ui"))).toBe(false);
  });

  test("discovers demo-owned helpers and shared behavioral glue from one entry", async () => {
    expect((await discoverDemoSources("routes/database-demo/DatabaseDemoRoute.tsx")).map((file) => file.path)).toEqual([
      "routes/database-demo/DatabaseDemoRoute.tsx",
      "routes/database-demo/DatabaseTableDemo.tsx",
      "routes/database-demo/initial-database.ts",
    ]);
    expect((await discoverDemoSources("routes/widgets/ListboxWidgetRoute.tsx")).map((file) => file.path)).toContain(
      "routes/widgets/binding/order.ts",
    );
  });

});
