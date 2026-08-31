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
    expect(screen.getByText("Agent-native artifact editing의 개발 정본.")).toBeTruthy();
    expect(screen.getByText(/구현보다 먼저 공유해야 할 Why/)).toBeTruthy();
    const home = within(screen.getByRole("main"));
    expect(home.getByRole("link", { name: "Applications 보기" }).getAttribute("href")).toBe("/applications");
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
    expect(within(screen.getByRole("navigation", { name: "Dependency map" })).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Introduce",
      "Foundation",
      "Building Blocks",
      "Hands",
      "Artifact",
      "Applications",
    ]);
    await user.click(nav.getByRole("button", { name: "Introduce" }));
    expect(groupLinks(nav, "Introduce")).toEqual([
      "Why",
      "Concept Map",
      "How We Build",
    ]);
    await user.click(nav.getByRole("button", { name: "Foundation" }));
    expect(groupLinks(nav, "Foundation")).toEqual(expect.arrayContaining([
      "Overview",
      "Replica",
      "Intent guide",
    ]));
    await user.click(nav.getByRole("button", { name: "Hands" }));
    expect(groupLinks(nav, "Hands")).toEqual(expect.arrayContaining([
      "Overview", "Official Hands · TBD",
      "Order",
      "Object",
      "Tree",
      "Database",
      "Composer",
      "Mention",
    ]));
    await user.click(nav.getByRole("button", { name: "Artifact" }));
    expect(groupLinks(nav, "Artifact")).toEqual(["Document · Presentation · Spreadsheet"]);
    await user.click(nav.getByRole("button", { name: "Applications" }));
    expect(groupLinks(nav, "Applications")).toEqual(["Overview", "Calendar", "AI Agent"]);
    expect(nav.getByRole("link", { name: "Reference" }).getAttribute("href")).toBe("/docs/api");
    expect(nav.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toEqual([
      "Introduce",
      "Foundation",
      "Building Blocks",
      "Hands",
      "Artifact",
      "Applications",
    ]);
    expect(nav.queryByRole("link", { name: "Extensions" })).toBeNull();

    await user.click(nav.getByRole("link", { name: "json-document" }));
    window.history.pushState(null, "", "/connectors");
    window.dispatchEvent(new PopStateEvent("popstate"));
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

    await user.click(within(nav.getByRole("group", { name: "Building Blocks" })).getAllByRole("link", { name: "Overview", exact: true })[1]!);
    expect(await screen.findByRole(
      "heading",
      { level: 1, name: "json-document Connectors" },
      { timeout: 5000 },
    )).toBeTruthy();
  }, 10000);

  test("exposes the Document Types TBD boundary", async () => {
    resetDocument("/docs/document-types");
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "Document Types · TBD" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "책임" })).toBeTruthy();
    expect(screen.getByText(/기존 package와 Hands의 실제 소유권 재배치는 아직 결정하지 않습니다/)).toBeTruthy();
    const breadcrumb = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
    expect(breadcrumb.getByRole("link", { name: "Foundation" }).getAttribute("href")).toBe("/docs/foundation");
    expect(breadcrumb.getByText("Overview · TBD")).toBeTruthy();
  });

  test("keeps the site chrome mounted across interior routes", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));
    const brand = screen.getByRole("link", { name: "json-document" });
    const siteNav = screen.getByRole("navigation", { name: "Site navigation" });

    await user.click(nav.getByRole("button", { name: "Introduce" }));
    await user.click(within(nav.getByRole("group", { name: "Introduce" })).getByRole("link", { name: "Why" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("ko"));
    const frame = await waitFor(() => {
      const node = document.querySelector("[data-page-frame]");
      expect(node).toBeTruthy();
      return node;
    });

    await user.click(nav.getByRole("link", { name: "Reference" }));
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    await waitFor(() => expect(crumb.getByText("Reference")).toBeTruthy());
    expect(screen.getByRole("link", { name: "json-document" })).toBe(brand);
    expect(screen.getByRole("navigation", { name: "Site navigation" })).toBe(siteNav);
    expect(document.querySelector("[data-page-frame]")).toBe(frame);
    const header = document.querySelector("[data-page-header]");
    expect(header?.contains(screen.getByRole("navigation", { name: "Breadcrumb" }))).toBe(true);
    expect(header?.querySelector("h1")).toBeTruthy();

    await user.click(nav.getByRole("button", { name: "Hands" }));
    await user.click(within(nav.getByRole("group", { name: "Hands" })).getByRole("link", { name: "Overview", exact: true }));
    await waitFor(() => expect(document.documentElement.lang).toBe("ko"));
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
