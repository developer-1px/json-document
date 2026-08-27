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
    expect(home.getByRole("link", { name: "Artifact prototype 보기" }).getAttribute("href")).toBe("/viewer");
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
      "JSON Document",
      "Hands",
      "Artifact",
    ]);
    await user.click(nav.getByRole("button", { name: "JSON Document" }));
    expect(groupLinks(nav, "JSON Document")).toEqual([
      "Why",
      "Concept Map",
      "API Reference",
      "Public API",
    ]);
    expect(nav.queryByRole("link", { name: "Replica" })).toBeNull();
    await user.click(nav.getByRole("button", { name: "Collaboration" }));
    expect(groupLinks(nav, "Collaboration")).toEqual([
      "API · Collaboration",
      "API · Contenteditable",
      "Replica",
      "Lifecycle",
      "Collaborative History",
      "Text",
    ]);
    await user.click(nav.getByRole("button", { name: "Editing" }));
    expect(groupLinks(nav, "Editing")).toEqual([
      "API · Selection",
      "API · Editing",
      "API · Rich Text",
      "Intent guide",
      "Intent",
      "Topology",
      "Selection",
      "Clipboard",
      "History",
      "Rich Text vertical",
    ]);
    await user.click(nav.getByRole("button", { name: "Hands" }));
    expect(groupLinks(nav, "Hands")).toEqual([
      "API · Rich Text Mention",
      "API · Rich Text Suggestion",
      "API · Suggestion React",
      "API · Mention React",
      "API · Composer",
      "API · Composer React",
      "API · Database",
      "Overview",
      "Official Hands · TBD",
      "Order",
      "Object",
      "Annotation",
      "Tree",
      "Database",
      "Composer",
      "Mention",
    ]);
    await user.click(nav.getByRole("button", { name: "Adapter" }));
    expect(groupLinks(nav, "Adapter")).toEqual([
      "API · Web",
      "API · Contenteditable",
      "API · Rich Text Web",
      "Overview",
      "Keyboard",
      "Grid cell",
      "Interaction",
      "Clipboard Reference",
      "Contenteditable",
      "Virtual Selection",
    ]);
    await user.click(nav.getByRole("button", { name: "Connector" }));
    expect(groupLinks(nav, "Connector")).toEqual([
      "API · React",
      "API · React Hook Form",
      "API · Ajv",
      "API · Zod",
      "API · TanStack Table",
      "API · Rich Text React",
      "Overview",
      "React Reference",
      "React Hook Form",
      "Ajv",
      "Zod",
      "TanStack Table",
    ]);
    await user.click(nav.getByRole("button", { name: "Affordance" }));
    expect(groupLinks(nav, "Affordance")).toEqual([
      "API Reference",
      "Focus",
      "Caret",
      "Select",
      "Typeahead",
      "Activate",
      "Escape",
      "Expand/Collapse",
      "Undo",
      "Delete",
      "Rename",
      "Nudge",
      "Hover",
      "Double-click",
      "Triple-click",
      "Context menu",
      "Drag",
      "Marquee",
      "Drop",
      "Duplicate",
      "Resize",
      "Pan",
      "Scroll",
      "Zoom",
      "Snap",
      "Not-allowed",
    ]);
    await user.click(nav.getByRole("button", { name: "UI Primitives" }));
    expect(groupLinks(nav, "UI Primitives")).toEqual(["API Reference"]);
    expect(nav.queryByRole("group", { name: "Demos" })).toBeNull();
    expect(nav.queryByRole("group", { name: "Reference" })).toBeNull();
    await user.click(nav.getByRole("button", { name: "Artifact" }));
    expect(groupLinks(nav, "Artifact")).toEqual(["MD · PPT · Sheet", "API · File Intake"]);
    expect(nav.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toEqual([
      "JSON Document",
      "Editing",
      "Adapter",
      "Connector",
      "Affordance",
      "UI Primitives",
      "Hands",
      "Artifact",
      "Collaboration",
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

    await user.click(within(nav.getByRole("group", { name: "Connector" })).getByRole("link", { name: "Overview", exact: true }));
    expect(await screen.findByRole(
      "heading",
      { level: 1, name: "json-document Connectors" },
      { timeout: 5000 },
    )).toBeTruthy();
  }, 10000);

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
