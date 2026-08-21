import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DemoWorkbench } from "../../src/shared/demo-workbench/DemoWorkbench";
import { loadDemoSources } from "../../src/shared/demo-workbench/demo-sources";

afterEach(cleanup);

describe("DemoWorkbench", () => {
  const sources = [
    {
      path: "routes/example/ExampleDemoRoute.tsx",
      language: "tsx" as const,
      source: "export function ExampleDemoRoute() {\n  return <main />;\n}",
    },
    {
      path: "routes/example/fixture.ts",
      language: "typescript" as const,
      source: "export const fixture = { ready: true };",
    },
  ];

  test("keeps Demo first and switches between the live demo and full source files", () => {
    render(<DemoWorkbench sources={sources}><button>Run demo</button></DemoWorkbench>);

    const tablist = screen.getByRole("tablist", { name: "Demo and source files" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Demo", "ExampleDemoRoute.tsx", "fixture.ts"]);
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "Run demo" })).toBeTruthy();

    fireEvent.click(tabs[1]!);

    expect(screen.queryByRole("button", { name: "Run demo" })).toBeNull();
    expect(screen.getByText("routes/example/ExampleDemoRoute.tsx")).toBeTruthy();
    expect(screen.getByRole("tabpanel").textContent).toContain(sources[0]!.source);
  });

  test("moves across tabs with editor-style arrow navigation", () => {
    render(<DemoWorkbench sources={sources}><div>Demo</div></DemoWorkbench>);
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

describe("demoSources", () => {
  test("loads actual full demo files without following package or site chrome imports", async () => {
    const document = (await loadDemoSources("/demo"))!;
    expect(document.map((file) => file.path)).toEqual(["routes/document-demo/DocumentDemoRoute.tsx"]);
    expect(document[0]!.source).toContain("export function DocumentDemoRoute()");
    expect(document[0]!.source).toContain('from "@interactive-os/json-document-react"');
    expect(document.some((file) => file.path.includes("packages/"))).toBe(false);
    expect(document.some((file) => file.path.includes("shared/ui"))).toBe(false);
  });

  test("includes demo-owned helpers and shared behavioral glue", async () => {
    expect((await loadDemoSources("/demo/database"))!.map((file) => file.path)).toEqual([
      "routes/database-demo/DatabaseDemoRoute.tsx",
      "routes/database-demo/DatabaseTableDemo.tsx",
      "routes/database-demo/initial-database.ts",
    ]);
    expect((await loadDemoSources("/widgets/listbox"))!.map((file) => file.path)).toContain(
      "routes/widgets/binding/order.ts",
    );
  });

  test("covers every public interactive demo route", async () => {
    const paths = [
      "/demo", "/demo/order", "/demo/object", "/demo/canvas", "/demo/sheet", "/demo/database",
      "/demo/tree", "/demo/kanban", "/demo/topology", "/demo/selection", "/demo/clipboard", "/demo/history",
      "/editing/rich-text", "/widgets/listbox", "/widgets/grid", "/widgets/toolbar",
      "/adapters/clipboard", "/adapters/contenteditable", "/adapters/keyboard",
      "/connectors/react", "/connectors/react-hook-form", "/connectors/tanstack-table", "/connectors/ajv",
      "/connectors/zod", "/connectors/zod/validate",
    ];
    for (const path of paths) expect(await loadDemoSources(path), path).not.toBeUndefined();
  });
});
