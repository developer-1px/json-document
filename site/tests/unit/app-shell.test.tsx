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

    expect(groupLinks(nav, "Start")).toEqual(["Overview", "Quickstart"]);
    expect(groupLinks(nav, "Core")).toEqual(["Why", "Concepts", "API Reference"]);
    expect(groupLinks(nav, "Editing")).toEqual(["Workbench", "Document", "Sheet", "Selection Lab", "Database"]);
    expect(groupLinks(nav, "Connectors")).toEqual(["Connectors", "Connector guide", "React", "React Hook Form", "Ajv", "Zod", "Validate", "TanStack Table", "Web Platform"]);
    expect(nav.queryByRole("link", { name: "Extensions" })).toBeNull();

    const connectors = within(nav.getByRole("group", { name: "Connectors" }));
    await user.click(connectors.getByRole("link", { name: "Connectors", exact: true }));
    await waitFor(() => expect(document.title).toBe("Connectors - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Connectors" })).toBeTruthy();
    const demos = screen.getAllByRole("link", { name: "Open Live Demo" });
    expect(demos.map((link) => link.getAttribute("href"))).toEqual([
      "/connectors/react",
      "/connectors/react-hook-form",
      "/connectors/ajv",
      "/connectors/zod",
      "/connectors/tanstack-table",
      "/connectors/web",
    ]);
    expect(screen.getByRole("link", { name: "Validate commits" }).getAttribute("href")).toBe("/connectors/zod/validate");

    await user.click(nav.getByRole("link", { name: "Database", exact: true }));
    const databaseCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(databaseCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(databaseCrumb.getByText("Database")).toBeTruthy();

    await user.click(connectors.getByRole("link", { name: "Zod", exact: true }));
    const adminHeader = document.querySelector("[data-page-header]");
    expect(adminHeader?.querySelector('[aria-label="Breadcrumb"]')).toBeTruthy();
    const adminCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(adminCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(adminCrumb.getByRole("link", { name: "Connectors" }).getAttribute("href")).toBe("/connectors");
    expect(adminCrumb.getByText("Zod")).toBeTruthy();

    await user.click(nav.getByRole("link", { name: "Validate", exact: true }));
    const validateCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(validateCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(validateCrumb.getByRole("link", { name: "Connectors" }).getAttribute("href")).toBe("/connectors");
    expect(validateCrumb.getByRole("link", { name: "Zod" }).getAttribute("href")).toBe("/connectors/zod");
    expect(validateCrumb.getByText("Validate")).toBeTruthy();
  });

  test("keeps the site chrome mounted across interior routes", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));
    const brand = screen.getByRole("link", { name: "json-document" });
    const siteNav = screen.getByRole("navigation", { name: "Site navigation" });

    await user.click(within(nav.getByRole("group", { name: "Core" })).getByRole("link", { name: "Why" }));
    const frame = await waitFor(() => {
      const node = document.querySelector("[data-page-frame]");
      expect(node).toBeTruthy();
      return node;
    });

    await user.click(within(nav.getByRole("group", { name: "Core" })).getByRole("link", { name: "API Reference" }));
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    await waitFor(() => expect(crumb.getByText("API Reference")).toBeTruthy());
    expect(screen.getByRole("link", { name: "json-document" })).toBe(brand);
    expect(screen.getByRole("navigation", { name: "Site navigation" })).toBe(siteNav);
    expect(document.querySelector("[data-page-frame]")).toBe(frame);
    const header = document.querySelector("[data-page-header]");
    expect(header?.contains(screen.getByRole("navigation", { name: "Breadcrumb" }))).toBe(true);
    expect(header?.querySelector("h1")).toBeTruthy();
  });
});

function groupLinks(nav: ReturnType<typeof within>, name: string): string[] {
  return within(nav.getByRole("group", { name })).getAllByRole("link").map((link) => link.textContent ?? "");
}

function resetDocument(path: string) {
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
