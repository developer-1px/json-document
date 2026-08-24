import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";

beforeEach(() => {
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
  window.history.pushState(null, "", "/");
});

afterEach(cleanup);

describe("documentation routes", () => {
  test("navigates across the keyed documentation registry", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));

    await user.click(nav.getByRole("button", { name: "JSON Document" }));
    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }));
    await waitFor(() => expect(document.title).toBe("json-document Docs - json-document"));
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://developer-1px.github.io/json-document/docs");
    expect(await screen.findByRole("heading", { level: 1 }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }).getAttribute("aria-current")).toBe("page");

    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Concept Map" }));
    await waitFor(() => expect(document.title).toBe("Concept Map - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Concept Map" }, { timeout: 10000 })).toBeTruthy();

    expect(screen.queryByRole("navigation", { name: "Documentation pages" })).toBeNull();

    await user.click(nav.getByRole("button", { name: "Connector" }));
    await user.click(within(nav.getByRole("group", { name: "Connector" })).getByRole("link", { name: "Overview", exact: true }));
    await waitFor(() => expect(document.title).toBe("Connector Docs - json-document"), { timeout: 10000 });
    expect(await screen.findByRole("heading", { level: 1, name: "json-document Connectors" }, { timeout: 10000 })).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "Connector" })).getByRole("link", { name: "React Reference" }));
    expect(await screen.findByRole("heading", { level: 1, name: "React Connector" }, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "useEditingObservation" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "Connector" })).getByRole("link", { name: "Editing guide" })).toBeTruthy();

    await user.click(nav.getByRole("button", { name: "Editing" }));
    await user.click(within(nav.getByRole("group", { name: "Editing" })).getByRole("link", { name: "Topology" }));
    await waitFor(() => expect(document.title).toBe("Topology - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Topology" }, { timeout: 10000 })).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "API Reference" }));
    await waitFor(() => expect(document.title).toBe("json-document API - json-document"));
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("여섯 가지 JSON Document 진입점과 JSON Patch, Pointer, JSONPath 공개 API를 정리합니다.");
    expect(await screen.findByRole("heading", { level: 1, name: "json-document API" }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }).getAttribute("aria-current")).toBeNull();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "API Reference" }).getAttribute("aria-current")).toBe("page");
    const mobileSections = within(screen.getByRole("navigation", { name: "Documentation sections" }));
    expect(mobileSections.getByRole("link", { name: "작업별 진입점" }).getAttribute("href")).toBe("#작업별-진입점");
  });

  test("supports direct route entry for static-hosting fallbacks", async () => {
    window.history.pushState(null, "", "/docs/");
    render(<App />);
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }, { timeout: 10000 }));

    await waitFor(() => expect(document.title).toBe("json-document Docs - json-document"));
    expect(await screen.findByRole("heading", { level: 1 }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }).getAttribute("aria-current")).toBe("page");

    window.history.pushState(null, "", "/docs/topology/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => expect(document.title).toBe("Topology - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Topology" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "Editing" })).getByRole("link", { name: "Topology" }).getAttribute("aria-current")).toBe("page");

    window.history.pushState(null, "", "/docs/api/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => expect(document.title).toBe("json-document API - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "json-document API" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "API Reference" }).getAttribute("aria-current")).toBe("page");
  });
});
