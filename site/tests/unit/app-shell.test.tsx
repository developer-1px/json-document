import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";

beforeEach(() => {
  resetDocument("/");
});

afterEach(cleanup);

describe("official site shell", () => {
  test("serves the official overview at the root route", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("heading", { level: 1, name: "json-document" })).toBeTruthy();
    expect(screen.getByText(/Implementation-neutral JSON editing/)).toBeTruthy();
    expect(screen.getByText("3.0.0")).toBeTruthy();
    expect(screen.getByText('import { createJSONDocument } from "@interactive-os/json-document";')).toBeTruthy();
    expect(screen.getByRole("link", { name: "npm" }).getAttribute("href")).toBe("https://www.npmjs.com/package/@interactive-os/json-document");
    expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe("https://github.com/developer-1px/json-document");
    const home = within(screen.getByRole("main"));
    expect(home.getByRole("link", { name: "Quickstart" }).getAttribute("href")).toBe("/docs/tutorial");
    expect(home.getByRole("link", { name: "Concepts" }).getAttribute("href")).toBe("/docs");
    expect(home.getByRole("link", { name: "API Reference" }).getAttribute("href")).toBe("/docs/api");
    expect(home.getByRole("link", { name: "Document" }).getAttribute("href")).toBe("/demo");
    expect(home.getByRole("link", { name: "Connectors" }).getAttribute("href")).toBe("/connectors");
  });

  test("projects the product hierarchy into the site navigation", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(screen.getByRole("navigation", { name: "Site navigation" }));

    expect(groupLinks(nav, "Start")).toEqual(["Overview", "Quickstart"]);
    expect(groupLinks(nav, "Core")).toEqual(["Concepts", "API Reference"]);
    expect(groupLinks(nav, "Editing")).toEqual(["Document", "Sheet", "Selection Lab"]);
    expect(groupLinks(nav, "Connectors")).toEqual(["Overview", "React", "Zod", "TanStack Table"]);
    expect(nav.queryByRole("link", { name: "Connector guide" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Workbench" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Extensions" })).toBeNull();

    const connectors = within(nav.getByRole("group", { name: "Connectors" }));
    await user.click(connectors.getByRole("link", { name: "Overview", exact: true }));
    await waitFor(() => expect(document.title).toBe("Connectors - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Connectors" })).toBeTruthy();
    const demos = screen.getAllByRole("link", { name: "Open Live Demo" });
    expect(demos.map((link) => link.getAttribute("href"))).toEqual([
      "/connectors/react",
      "/connectors/zod",
      "/connectors/tanstack-table",
    ]);
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
