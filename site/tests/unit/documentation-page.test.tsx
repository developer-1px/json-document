import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DocumentationPage } from "../../src/routes/docs/DocumentationPage";
import { DocumentTypeCandidateRoute, type DocumentTypeCandidate } from "../../src/routes/docs/DocumentTypeCandidateRoute";
import { docPages } from "../../src/routes/docs/doc-pages";
import { rewriteMarkdownHref } from "../../src/routes/docs/MarkdownViewer";
import { pageDescriptors } from "../../src/app/page-descriptors";
import documentTypeAudits from "../../../audits/document-types.json";

// Keep real Markdown rendering; embedded products and highlighting do not own document headings.
vi.mock("../../src/app/live-demo-registry", () => ({
  LiveDemo: () => <section><h2 id="embedded-demo-heading">Embedded demo</h2></section>,
}));
vi.mock("../../src/shared/demo-workbench/ShikiSourceCodeBlock", () => ({
  ShikiSourceCodeBlock: ({ source }: { source: string }) => <pre><code>{source}</code></pre>,
}));

afterEach(cleanup);

describe("canonical documentation projection", () => {
  test.each(Object.values(docPages))("$path: TOC targets and body links use the rendered document and route registry", (page) => {
    const { container } = render(
      <DocumentationPage title={page.title} source={page.source} sourcePath={page.documentSource} illustration="braces" />,
    );
    const headings = [...container.querySelectorAll("h2[data-doc-heading]")];
    expect(new Set(headings.map((heading) => heading.id)).size).toBe(headings.length);
    for (const name of ["Documentation sections", "On this page"]) {
      const links = within(screen.getByRole("navigation", { name })).queryAllByRole("link");
      expect(links.map((link) => decodeURIComponent(link.getAttribute("href") ?? "")))
        .toEqual(headings.map((heading) => `#${heading.id}`));
      expect(links.map((link) => link.textContent)).toEqual(headings.map((heading) => heading.textContent));
    }
    for (const link of container.querySelectorAll("article a[href]")) {
      const href = link.getAttribute("href")!;
      expect(href).not.toMatch(/^(?!https?:).*\.md(?:[?#]|$)/);
      if (href.startsWith("/") && !href.startsWith("//")) {
        const path = new URL(href, "https://documentation.invalid").pathname;
        expect(pageDescriptors.some((route) => route.path === path), href).toBe(true);
      }
    }
  });

  test("uses renderer IDs for underscores, punctuation, duplicate headings and inline Markdown, but not code fences", () => {
    const source = [
      "# Page", "", "## `A_B`", "", "## 후보 · TBD", "", "## **Same**", "", "## Same",
      "", "```md", "## Not a heading", "```",
    ].join("\n");
    const { rerender } = render(<DocumentationPage title="Page" source={source} illustration="braces" />);
    const toc = () => within(screen.getByRole("navigation", { name: "On this page" }));
    expect(toc().getAllByRole("link").map((link) => decodeURIComponent(link.getAttribute("href")!)))
      .toEqual(["#a_b", "#후보--tbd", "#same", "#same-1"]);
    rerender(<DocumentationPage title="Next" source="## Next" illustration="braces" />);
    expect(toc().getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#next"]);
  });

  test.each([
    ["docs/public/architecture.md", "how-we-build.md", "/docs/how-we-build"],
    ["docs/public/architecture.md", "document-types.md#후보--tbd", "/docs/document-types#후보--tbd"],
    ["docs/public/adapters.md", "adapter-virtual-selection.md", "/docs/adapter-virtual-selection"],
    ["docs/public/ui-primitives.md", "animation.md", "/docs/animation"],
    ["docs/public/connectors.md", "connector-a2ui.md", "/docs/connector-a2ui"],
    ["docs/public/hands.md", "official-hands.md", "/docs/official-hands"],
    ["docs/public/connector-a2ui.md", "../api-reference/a2ui.md", "/docs/api/a2ui"],
    ["docs/api-reference/editing.md", "../public/editing.md?mode=read#입력에서-관찰까지", "/docs/editing?mode=read#입력에서-관찰까지"],
    ["docs/public/connector-a2ui.md", "../../packages/json-document-a2ui/README.md", "https://github.com/developer-1px/json-document/blob/main/packages/json-document-a2ui/README.md"],
    ["docs/public/api.md", "#commit", "#commit"],
    ["docs/public/api.md", "https://example.com/api.md", "https://example.com/api.md"],
  ])("resolves %s → %s without a second filename catalog", (source, href, expected) => {
    expect(decodeURIComponent(rewriteMarkdownHref(href, source)!)).toBe(expected);
  });

  test("registers every document page once, including Architecture", () => {
    const registered = pageDescriptors.filter((route) => route.documentSource !== undefined);
    expect(Object.values(docPages).map((page) => page.path).sort()).toEqual(registered.map((page) => page.path).sort());
  });

  test.each(documentTypeAudits.candidates as DocumentTypeCandidate[])("%s exposes the target boundary without declaring the candidate complete", (candidate) => {
    const closed = candidate === "calendar" || candidate === "object";
    render(<DocumentTypeCandidateRoute candidate={candidate} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(`Document Type · ${closed ? "RC" : "TBD"}`);
    expect(screen.getByRole("heading", { level: 2, name: "목표 경계 · TBD" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: closed ? "현재 RC 모델" : "현재 관찰된 schema · TBD" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: closed ? "확정 증거와 남은 범위" : "확정에 필요한 증거" })).toBeTruthy();
  });
});
