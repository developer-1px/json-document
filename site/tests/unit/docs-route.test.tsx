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

    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }));
    await waitFor(() => expect(document.title).toBe("json-document Docs - json-document"));
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://developer-1px.github.io/json-document/docs");
    expect(await screen.findByRole("heading", { level: 1 }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }).getAttribute("aria-current")).toBe("page");

    await user.click(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Quickstart" }));
    await waitFor(() => expect(document.title).toBe("Tutorial - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "작은 카드 문서 만들기" })).toBeTruthy();

    expect(screen.queryByRole("navigation", { name: "Documentation pages" })).toBeNull();

    await user.click(within(nav.getByRole("group", { name: "Connectors" })).getByRole("link", { name: "Connector guide" }));
    await waitFor(() => expect(document.title).toBe("Connector Docs - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "json-document Connectors" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "React에서 변경 구독하기" })).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "Editing" })).getByRole("link", { name: "Topology" }));
    await waitFor(() => expect(document.title).toBe("Topology - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Topology" })).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "Reference" })).getByRole("link", { name: "API Reference" }));
    await waitFor(() => expect(document.title).toBe("json-document API - json-document"));
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("여섯 가지 JSON Document 진입점과 JSON Patch, Pointer, JSONPath 공개 API를 정리합니다.");
    expect(await screen.findByRole("heading", { level: 1, name: "json-document API" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "JSON Document" })).getByRole("link", { name: "Why" }).getAttribute("aria-current")).toBeNull();
    expect(within(nav.getByRole("group", { name: "Reference" })).getByRole("link", { name: "API Reference" }).getAttribute("aria-current")).toBe("page");
    const mobileSections = within(screen.getByRole("navigation", { name: "Documentation sections" }));
    expect(mobileSections.getByRole("link", { name: "작업별 진입점" }).getAttribute("href")).toBe("#작업별-진입점");

  });

  test("navigates the Collaboration concept branch and reference", async () => {
    window.history.pushState(null, "", "/docs/collaboration");
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));

    await waitFor(() => expect(document.title).toBe("Collaboration - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Collaboration" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Runtime 만들기" })).toBeTruthy();
    expect(screen.getByRole("main").querySelector('a[href="/docs/collaboration/replica"]')).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "Collaboration" })).getByRole("link", { name: "Collaborative History" }));
    await waitFor(() => expect(document.title).toBe("Collaborative History - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Collaborative History" })).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "Reference" })).getByRole("link", { name: "Collaboration API" }));
    await waitFor(() => expect(document.title).toBe("Collaboration API - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Collaboration API" })).toBeTruthy();
  });

  test("supports direct route entry for static-hosting fallbacks", async () => {
    window.history.pushState(null, "", "/docs/");
    render(<App />);
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));

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
    expect(within(nav.getByRole("group", { name: "Reference" })).getByRole("link", { name: "API Reference" }).getAttribute("aria-current")).toBe("page");

    window.history.pushState(null, "", "/docs/collaboration/text/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => expect(document.title).toBe("Collaborative Text - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Collaborative Text" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "Collaboration" })).getByRole("link", { name: "Collaborative Text" }).getAttribute("aria-current")).toBe("page");
  });
});
