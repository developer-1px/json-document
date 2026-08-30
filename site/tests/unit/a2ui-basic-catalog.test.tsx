import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import {
  A2UI_BASIC_CATALOG_ID,
  A2UI_BASIC_COMPONENT_NAMES,
  A2uiSurface,
  validateBasicCatalogComponent,
  type A2uiStreamingDocument,
} from "../../src/app/a2ui-streaming-document";

afterEach(cleanup);

describe("A2UI Basic Catalog contract", () => {
  test("exposes and validates every supported official component", () => {
    expect(A2UI_BASIC_COMPONENT_NAMES).toEqual(["Text", "Column", "Row", "Card", "Divider"]);
    const fixtures = [
      { id: "text", component: "Text", text: "본문", variant: "body" },
      { id: "column", component: "Column", children: ["text"], justify: "spaceBetween", align: "stretch" },
      { id: "row", component: "Row", children: ["text"], justify: "center", align: "end" },
      { id: "card", component: "Card", child: "text" },
      { id: "divider", component: "Divider", axis: "vertical" },
    ];
    for (const fixture of fixtures) expect(() => validateBasicCatalogComponent(fixture)).not.toThrow();
  });

  test.each([
    [{ component: "Text", text: "본문" }, /id가 필요/],
    [{ id: "button", component: "Button", text: "버튼" }, /지원하지 않는/],
    [{ id: "text", component: "Text", text: "본문", variant: "display" }, /invalid_enum_value/],
    [{ id: "card", component: "Card", children: ["text"] }, /Required/],
    [{ id: "row", component: "Row", children: "text" }, /Invalid input/],
  ])("rejects a component outside the supported schema: %o", (component, message) => {
    expect(() => validateBasicCatalogComponent(component)).toThrow(message);
  });
});

describe("A2UI Basic Catalog renderer", () => {
  test("renders every text variant and resolves data bindings", () => {
    renderSurface({
      root: { id: "root", component: "Column", children: ["h1", "h2", "h3", "h4", "h5", "body", "caption"] },
      h1: { id: "h1", component: "Text", text: "제목 1", variant: "h1" },
      h2: { id: "h2", component: "Text", text: "제목 2", variant: "h2" },
      h3: { id: "h3", component: "Text", text: "제목 3", variant: "h3" },
      h4: { id: "h4", component: "Text", text: "제목 4", variant: "h4" },
      h5: { id: "h5", component: "Text", text: "제목 5", variant: "h5" },
      body: { id: "body", component: "Text", text: { path: "/copy/body" }, variant: "body" },
      caption: { id: "caption", component: "Text", text: { path: "/copy/caption" }, variant: "caption" },
    }, { copy: { body: "**바인딩 본문**", caption: "보조 설명" } });

    for (let level = 1; level <= 5; level += 1) expect(screen.getByRole("heading", { level, name: `제목 ${level}` })).toBeTruthy();
    expect(screen.getByTestId("markdown").textContent).toBe("**바인딩 본문**");
    expect(screen.getByText("보조 설명").tagName).toBe("SMALL");
  });

  test("renders nested Card, Row, Divider and positive child weights", () => {
    const { container } = renderSurface({
      root: { id: "root", component: "Card", child: "row" },
      row: { id: "row", component: "Row", children: ["first", "divider", "second"] },
      first: { id: "first", component: "Text", text: "첫째", weight: 2 },
      divider: { id: "divider", component: "Divider" },
      second: { id: "second", component: "Text", text: "둘째", weight: 1 },
    });

    expect(container.querySelector('[data-a2ui-component="Card"]')).toBeTruthy();
    expect(container.querySelector('[data-a2ui-component="Row"]')).toBeTruthy();
    expect(container.querySelector('[data-a2ui-component="Divider"]')).toBeTruthy();
    const weighted = [...container.querySelectorAll<HTMLElement>('[data-weighted="true"]')];
    expect(weighted.map((element) => element.style.flexGrow)).toEqual(["2", "1"]);
  });

  test("maps official layout, divider axis, and bound accessibility properties", () => {
    const { container } = renderSurface({
      root: { id: "root", component: "Row", children: ["copy", "divider"], justify: "spaceBetween", align: "center", accessibility: { label: { path: "/labels/row" }, description: "지표 행 설명" } },
      copy: { id: "copy", component: "Text", text: "내용", accessibility: { label: "지표 값" } },
      divider: { id: "divider", component: "Divider", axis: "vertical" },
    }, { labels: { row: "지표 행" } });

    const row = screen.getByLabelText("지표 행");
    expect(row.className).toContain("justify-between");
    expect(row.className).toContain("items-center");
    expect(row.getAttribute("aria-description")).toBe("지표 행 설명");
    expect(screen.getByLabelText("지표 값")).toBeTruthy();
    expect(container.querySelector('[data-a2ui-axis="vertical"]')).toBeTruthy();
  });

  test("ignores missing children and terminates cyclic component references", () => {
    const { container } = renderSurface({
      root: { id: "root", component: "Column", children: ["missing", "loop", "safe"] },
      loop: { id: "loop", component: "Column", children: ["root"] },
      safe: { id: "safe", component: "Text", text: "남는 내용" },
    });

    expect(screen.getByText("남는 내용")).toBeTruthy();
    expect(container.querySelectorAll('[data-a2ui-component="Column"]')).toHaveLength(2);
  });

  test("renders nothing for an absent surface, root, or unknown root component", () => {
    const { container, rerender } = render(<A2uiSurface document={{ surfaces: {} }} markdown={MarkdownStub} surfaceId="main" />);
    expect(container.childElementCount).toBe(0);
    rerender(<A2uiSurface document={documentWith({})} markdown={MarkdownStub} surfaceId="main" />);
    expect(container.childElementCount).toBe(0);
    rerender(<A2uiSurface document={documentWith({ root: { id: "root", component: "Unknown" } })} markdown={MarkdownStub} surfaceId="main" />);
    expect(screen.getByLabelText("생성된 UI").childElementCount).toBe(0);
  });
});

function renderSurface(components: Record<string, { id: string; component: string; [key: string]: unknown }>, dataModel: unknown = {}) {
  return render(<A2uiSurface document={documentWith(components, dataModel)} markdown={MarkdownStub} surfaceId="main" />);
}

function documentWith(components: Record<string, { id: string; component: string; [key: string]: unknown }>, dataModel: unknown = {}): A2uiStreamingDocument {
  return { surfaces: { main: { catalogId: A2UI_BASIC_CATALOG_ID, components, dataModel: dataModel as never } } };
}

function MarkdownStub({ content }: { readonly content?: string | null }) {
  return <span data-testid="markdown">{content}</span>;
}
