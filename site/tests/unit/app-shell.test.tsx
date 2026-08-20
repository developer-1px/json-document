import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";

beforeEach(() => {
  resetDocument("/");
});

afterEach(cleanup);

describe("official site shell", () => {
  test("serves the official overview at the root route", async () => {
    render(<App />);

    expect((await screen.findByRole("link", { name: "Skip to content" })).getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("heading", { level: 1, name: "json-document" })).toBeTruthy();
    expect(screen.getByText("One JSON document. Any editor.")).toBeTruthy();
    expect(screen.getByText("A tiny headless API to read, query, patch, and subscribe.")).toBeTruthy();
    expect(screen.getByText(/npm i @interactive-os\/json-document/)).toBeTruthy();
    expect(screen.getByRole("img", { name: "A small cat struggling to press an oversized Enter key." })).toBeTruthy();
    const home = within(screen.getByRole("main"));
    expect(home.getByRole("link", { name: "Get started" }).getAttribute("href")).toBe("/docs/tutorial");
    expect(home.queryByText("v3.0.0")).toBeNull();
    expect(home.queryByRole("link", { name: "Read the API" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });

  test("projects the product hierarchy into the site navigation", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));

    expect(nav.queryByRole("group", { name: "Start" })).toBeNull();
    expect(nav.queryByRole("group", { name: "Core" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Why" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Replica" })).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "Concept index" })).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "JSON Document",
      "Collaboration",
      "Editing",
      "Hands",
      "Adapter",
      "Connector",
      "제품 화면",
    ]);
    await user.click(nav.getByRole("button", { name: "JSON Document" }));
    expect(groupLinks(nav, "JSON Document")).toEqual([
      "Why",
      "Quickstart",
      "Concepts",
      "API Reference",
    ]);
    expect(nav.queryByRole("link", { name: "Replica" })).toBeNull();
    await user.click(nav.getByRole("button", { name: "Collaboration" }));
    expect(groupLinks(nav, "Collaboration")).toEqual([
      "Replica",
      "Lifecycle",
      "Collaborative History",
      "Text",
    ]);
    await user.click(nav.getByRole("button", { name: "Editing" }));
    expect(groupLinks(nav, "Editing")).toEqual([
      "Intent guide",
      "Intent",
      "Topology",
      "Selection",
      "Clipboard",
      "History",
    ]);
    await user.click(nav.getByRole("button", { name: "Hands" }));
    expect(groupLinks(nav, "Hands")).toEqual([
      "Document",
      "Order",
      "Object",
      "Sheet",
      "Tree",
      "Kanban",
      "Database",
    ]);
    await user.click(nav.getByRole("button", { name: "Adapter" }));
    expect(groupLinks(nav, "Adapter")).toEqual(["Keyboard", "Clipboard adapter", "Contenteditable"]);
    await user.click(nav.getByRole("button", { name: "Connector" }));
    expect(groupLinks(nav, "Connector")).toEqual(["React", "React Hook Form", "Ajv", "Zod", "TanStack Table"]);
    await user.click(nav.getByRole("button", { name: "제품 화면" }));
    expect(groupLinks(nav, "제품 화면")).toEqual(["Toolbar", "Listbox", "Grid"]);
    expect(nav.queryByRole("group", { name: "Demos" })).toBeNull();
    expect(nav.queryByRole("group", { name: "Reference" })).toBeNull();
    expect(nav.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toEqual([
      "JSON Document",
      "Collaboration",
      "Editing",
      "Hands",
      "Adapter",
      "Connector",
      "제품 화면",
    ]);
    expect(nav.queryByRole("link", { name: "Extensions" })).toBeNull();

    await user.click(nav.getByRole("link", { name: "json-document" }));
    await user.click(within(screen.getByRole("navigation", { name: "Concept index" })).getByRole("link", { name: "Connector", exact: true }));
    await waitFor(() => expect(document.title).toBe("Connectors - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Connector" })).toBeTruthy();
    const demos = screen.getAllByRole("link", { name: "Open Live Demo" });
    expect(demos.map((link) => link.getAttribute("href"))).toEqual([
      "/connectors/react",
      "/connectors/react-hook-form",
      "/connectors/ajv",
      "/connectors/zod",
      "/connectors/tanstack-table",
    ]);
    expect(screen.getByRole("link", { name: "Validate commits" }).getAttribute("href")).toBe("/connectors/zod/validate");

    await user.click(within(nav.getByRole("group", { name: "Hands" })).getByRole("link", { name: "Database", exact: true }));
    const databaseCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(databaseCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(databaseCrumb.getByRole("link", { name: "Hands" }).getAttribute("href")).toBe("/editors");
    expect(databaseCrumb.getByText("Database")).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "Connector" })).getByRole("link", { name: "Zod", exact: true }));
    const adminHeader = document.querySelector("[data-page-header]");
    expect(adminHeader?.querySelector('[aria-label="Breadcrumb"]')).toBeTruthy();
    const adminCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(adminCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(adminCrumb.getByRole("link", { name: "Connector" }).getAttribute("href")).toBe("/connectors");
    expect(adminCrumb.getByText("Zod")).toBeTruthy();

    await user.click(nav.getByRole("link", { name: "Validate", exact: true }));
    const validateCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(validateCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(validateCrumb.getByRole("link", { name: "Connector" }).getAttribute("href")).toBe("/connectors");
    expect(validateCrumb.getByRole("link", { name: "Zod" }).getAttribute("href")).toBe("/connectors/zod");
    expect(validateCrumb.getByText("Validate")).toBeTruthy();
  });

  test("keeps the site chrome mounted across interior routes", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));
    const brand = screen.getByRole("link", { name: "json-document" });
    const siteNav = screen.getByRole("navigation", { name: "Site navigation" });

    await user.click(nav.getByRole("button", { name: "JSON Document" }));
    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("ko"));
    const frame = await waitFor(() => {
      const node = document.querySelector("[data-page-frame]");
      expect(node).toBeTruthy();
      return node;
    });

    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "API Reference" }));
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    await waitFor(() => expect(crumb.getByText("API Reference")).toBeTruthy());
    expect(crumb.getByRole("link", { name: "JSON Document" }).getAttribute("href")).toBe("/docs");
    expect(screen.getByRole("link", { name: "json-document" })).toBe(brand);
    expect(screen.getByRole("navigation", { name: "Site navigation" })).toBe(siteNav);
    expect(document.querySelector("[data-page-frame]")).toBe(frame);
    const header = document.querySelector("[data-page-header]");
    expect(header?.contains(screen.getByRole("navigation", { name: "Breadcrumb" }))).toBe(true);
    expect(header?.querySelector("h1")).toBeTruthy();

    await user.click(nav.getByRole("button", { name: "Hands" }));
    await user.click(within(nav.getByRole("group", { name: "Hands" })).getByRole("link", { name: "Document", exact: true }));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
  });
});

function groupLinks(nav: ReturnType<typeof within>, name: string): string[] {
  return within(nav.getByRole("group", { name })).getAllByRole("link").map((link) => link.textContent ?? "");
}

function resetDocument(path: string) {
  document.documentElement.lang = "en";
  document.head.innerHTML = [
    '<meta name="description" content="" />',
    '<meta property="og:title" content="" />',
    '<meta property="og:description" content="" />',
    '<meta property="og:url" content="" />',
    '<meta name="twitter:title" content="" />',
    '<meta name="twitter:description" content="" />',
    '<link rel="canonical" href="" />',
  ].join("");
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  window.history.pushState(null, "", path);
}
